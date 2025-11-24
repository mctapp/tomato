# app/services/s3_service.py
from fastapi import UploadFile, HTTPException
from boto3 import client as boto3_client
from botocore.exceptions import ClientError
from typing import Dict, Optional, List, BinaryIO, Any
import os
import uuid
import logging
import time
from app.config import settings  # settings import 추가

# 로거 설정
logger = logging.getLogger(__name__)

class S3Service:
    def __init__(self):
        self.s3_client = boto3_client(
            's3',
            aws_access_key_id=os.environ.get("AWS_ACCESS_KEY_ID"),
            aws_secret_access_key=os.environ.get("AWS_SECRET_ACCESS_KEY"),
            region_name=os.environ.get("AWS_REGION", "ap-northeast-2")
        )
        self.public_bucket = os.environ.get("PUBLIC_BUCKET_NAME", "tomato-public")
        self.private_bucket = os.environ.get("PRIVATE_BUCKET_NAME", "tomato-private")
        
        # KMS 설정
        self.kms_key_id = settings.AWS_KMS_KEY_ID
        self.encryption_type = settings.AWS_S3_ENCRYPTION_TYPE
        self.bucket_key_enabled = settings.AWS_S3_BUCKET_KEY_ENABLED
        
    def generate_presigned_post(self, key: str, content_type: str, is_public: bool = False,
                               expires_in: int = 3600, max_content_length: int = 100 * 1024 * 1024) -> Dict:
        """업로드용 presigned URL 생성"""
        try:
            bucket = self.public_bucket if is_public else self.private_bucket
            fields = {"Content-Type": content_type}
            conditions = [
                {"Content-Type": content_type},
                ["content-length-range", 1, max_content_length]
            ]

            # 공개 파일은 AES256 사용, 비공개 파일은 KMS 사용
            if is_public:
                # 공개 파일: AES256 암호화 (공개 URL 접근 가능)
                fields["x-amz-server-side-encryption"] = "AES256"
                conditions.append({"x-amz-server-side-encryption": "AES256"})
                fields["acl"] = "public-read"
                conditions.append({"acl": "public-read"})
            else:
                # 비공개 파일: KMS 암호화
                if self.encryption_type == "aws:kms" and self.kms_key_id:
                    fields["x-amz-server-side-encryption"] = "aws:kms"
                    fields["x-amz-server-side-encryption-aws-kms-key-id"] = self.kms_key_id
                    conditions.append({"x-amz-server-side-encryption": "aws:kms"})
                    conditions.append({"x-amz-server-side-encryption-aws-kms-key-id": self.kms_key_id})

                    if self.bucket_key_enabled:
                        fields["x-amz-server-side-encryption-bucket-key-enabled"] = "true"
                        conditions.append({"x-amz-server-side-encryption-bucket-key-enabled": "true"})
            
            response = self.s3_client.generate_presigned_post(
                Bucket=bucket,
                Key=key,
                Fields=fields,
                Conditions=conditions,
                ExpiresIn=expires_in
            )
            
            logger.info(f"Generated presigned POST URL for {key} in {bucket}")
            return response
            
        except ClientError as e:
            logger.error(f"Error generating presigned POST URL: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to generate upload URL: {str(e)}")
    
    def generate_presigned_get(self, key: str, expires_in: int = 3600, is_public: bool = False) -> str:
        """다운로드용 presigned URL 생성"""
        try:
            bucket = self.public_bucket if is_public else self.private_bucket
            
            # 파일 존재 여부 확인
            try:
                self.s3_client.head_object(Bucket=bucket, Key=key)
            except ClientError as e:
                if e.response['Error']['Code'] == '404':
                    logger.error(f"File not found: {key} in {bucket}")
                    raise HTTPException(status_code=404, detail="File not found")
                else:
                    raise
            
            url = self.s3_client.generate_presigned_url(
                'get_object',
                Params={'Bucket': bucket, 'Key': key},
                ExpiresIn=expires_in
            )
            
            logger.info(f"Generated presigned GET URL for {key} in {bucket} with expiration {expires_in}s")
            return url
            
        except ClientError as e:
            if "NoSuchKey" in str(e):
                logger.error(f"File not found: {key} in {bucket}")
                raise HTTPException(status_code=404, detail="File not found")
            else:
                logger.error(f"Error generating presigned GET URL: {str(e)}")
                raise HTTPException(status_code=500, detail=f"Failed to generate download URL: {str(e)}")
    
    async def direct_upload(self, file: UploadFile, key: str, is_public: bool = False) -> Dict:
        """서버 경유 파일 업로드"""
        try:
            bucket = self.public_bucket if is_public else self.private_bucket
            
            # 파일 크기 확인
            file.file.seek(0, 2)  # 파일 끝으로 이동
            file_size = file.file.tell()  # 현재 위치(파일 크기) 얻기
            file.file.seek(0)  # 파일 시작으로 다시 이동
            
            if file_size > 50 * 1024 * 1024:  # 50MB 초과
                logger.warning(f"File too large: {file_size} bytes, using multipart upload")
                return await self._multipart_upload(file.file, key, file.content_type, file_size, is_public)
            
            start_time = time.time()
            content = await file.read()

            extra_args = {'ContentType': file.content_type}

            # 공개 파일은 AES256 사용, 비공개 파일은 KMS 사용
            if is_public:
                # 공개 파일: AES256 암호화 (공개 URL 접근 가능)
                extra_args['ServerSideEncryption'] = 'AES256'
                extra_args['ACL'] = 'public-read'
            else:
                # 비공개 파일: KMS 암호화
                if self.encryption_type == "aws:kms" and self.kms_key_id:
                    extra_args['ServerSideEncryption'] = 'aws:kms'
                    extra_args['SSEKMSKeyId'] = self.kms_key_id
                    if self.bucket_key_enabled:
                        extra_args['BucketKeyEnabled'] = True
            
            self.s3_client.put_object(
                Bucket=bucket,
                Key=key,
                Body=content,
                **extra_args
            )
            
            duration = time.time() - start_time
            url = f"https://{bucket}.s3.{os.environ.get('AWS_REGION', 'ap-northeast-2')}.amazonaws.com/{key}" if is_public else None
            
            logger.info(f"Successfully uploaded file to {key} in {bucket}, size: {file_size}, duration: {duration:.2f}s")
            
            # 이미지 관련 메타데이터 (향후 이미지 분석 기능 통합 시 활용)
            width = None
            height = None
            
            return {
                "url": url,
                "key": key,
                "bucket": bucket,
                "size": file_size,
                "content_type": file.content_type,
                "is_public": is_public,
                "original_filename": file.filename,
                "width": width,
                "height": height
            }
            
        except Exception as e:
            logger.error(f"Error uploading file: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to upload file: {str(e)}")
    
    async def _multipart_upload(self, file_obj: BinaryIO, key: str, content_type: str, 
                              file_size: int, is_public: bool = False) -> Dict:
        """대용량 파일 멀티파트 업로드"""
        try:
            bucket = self.public_bucket if is_public else self.private_bucket
            upload_id = None
            
            # 멀티파트 업로드 시작 - 암호화 설정
            create_mpu_args = {
                'Bucket': bucket,
                'Key': key,
                'ContentType': content_type,
                'ACL': 'public-read' if is_public else 'private'
            }

            # 공개 파일은 AES256 사용, 비공개 파일은 KMS 사용
            if is_public:
                # 공개 파일: AES256 암호화 (공개 URL 접근 가능)
                create_mpu_args['ServerSideEncryption'] = 'AES256'
            else:
                # 비공개 파일: KMS 암호화
                if self.encryption_type == "aws:kms" and self.kms_key_id:
                    create_mpu_args['ServerSideEncryption'] = 'aws:kms'
                    create_mpu_args['SSEKMSKeyId'] = self.kms_key_id
                    if self.bucket_key_enabled:
                        create_mpu_args['BucketKeyEnabled'] = True
            
            start_time = time.time()
            mpu = self.s3_client.create_multipart_upload(**create_mpu_args)
            
            upload_id = mpu['UploadId']
            parts = []
            part_number = 1
            part_size = 5 * 1024 * 1024  # 5MB 청크 크기
            
            # 파일을 청크로 분할하여 업로드
            while True:
                data = file_obj.read(part_size)
                if not data:
                    break
                
                # 파트 업로드
                part = self.s3_client.upload_part(
                    Bucket=bucket,
                    Key=key,
                    PartNumber=part_number,
                    UploadId=upload_id,
                    Body=data
                )
                
                parts.append({
                    'PartNumber': part_number,
                    'ETag': part['ETag']
                })
                
                part_number += 1
                logger.debug(f"Uploaded part {part_number-1} of {key}")
            
            # 멀티파트 업로드 완료
            self.s3_client.complete_multipart_upload(
                Bucket=bucket,
                Key=key,
                UploadId=upload_id,
                MultipartUpload={'Parts': parts}
            )
            
            duration = time.time() - start_time
            url = f"https://{bucket}.s3.{os.environ.get('AWS_REGION', 'ap-northeast-2')}.amazonaws.com/{key}" if is_public else None
            
            logger.info(f"Successfully completed multipart upload for {key} in {bucket}, size: {file_size}, parts: {part_number-1}, duration: {duration:.2f}s")
            
            return {
                "url": url,
                "key": key,
                "bucket": bucket,
                "size": file_size,
                "content_type": content_type,
                "is_public": is_public,
                "original_filename": os.path.basename(key),
                "width": None,
                "height": None
            }
            
        except Exception as e:
            logger.error(f"Error in multipart upload: {str(e)}")
            # 실패 시 업로드 중단 시도
            if upload_id:
                try:
                    self.s3_client.abort_multipart_upload(
                        Bucket=bucket,
                        Key=key,
                        UploadId=upload_id
                    )
                except Exception as abort_error:
                    logger.error(f"Error aborting multipart upload: {str(abort_error)}")
            
            raise HTTPException(status_code=500, detail=f"Failed to upload large file: {str(e)}")
    
    def delete_file(self, key: str, is_public: bool = False) -> bool:
        """S3 파일 삭제"""
        try:
            bucket = self.public_bucket if is_public else self.private_bucket
            
            # 파일 존재 여부 확인
            try:
                self.s3_client.head_object(Bucket=bucket, Key=key)
            except ClientError as e:
                if e.response['Error']['Code'] == '404':
                    logger.warning(f"File not found for deletion: {key} in {bucket}")
                    return False
                else:
                    raise
            
            self.s3_client.delete_object(
                Bucket=bucket,
                Key=key
            )
            
            logger.info(f"Successfully deleted file {key} from {bucket}")
            return True
            
        except ClientError as e:
            logger.error(f"Error deleting file: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to delete file: {str(e)}")
    
    def get_storage_stats(self) -> Dict[str, Any]:
        """S3 스토리지 통계 정보 조회"""
        try:
            # 객체 리스트를 효율적으로 처리하기 위한 페이지네이션 사용
            public_objects = []
            private_objects = []
            
            # 공개 버킷 객체 수집
            paginator = self.s3_client.get_paginator('list_objects_v2')
            
            # 공개 버킷 페이지네이션
            for page in paginator.paginate(Bucket=self.public_bucket):
                if 'Contents' in page:
                    public_objects.extend(page['Contents'])
            
            # 비공개 버킷 페이지네이션
            for page in paginator.paginate(Bucket=self.private_bucket):
                if 'Contents' in page:
                    private_objects.extend(page['Contents'])
            
            # 통계 계산
            public_count = len(public_objects)
            private_count = len(private_objects)
            
            public_size = sum(obj['Size'] for obj in public_objects)
            private_size = sum(obj['Size'] for obj in private_objects)
            
            # 파일 타입별 통계
            file_types = {}
            
            for obj in public_objects + private_objects:
                ext = os.path.splitext(obj['Key'])[1].lower()
                if ext in file_types:
                    file_types[ext]['count'] += 1
                    file_types[ext]['size'] += obj['Size']
                else:
                    file_types[ext] = {'count': 1, 'size': obj['Size']}
            
            # 일별 업로드 통계
            daily_stats = {}
            for obj in public_objects + private_objects:
                date_str = obj['LastModified'].strftime('%Y-%m-%d')
                if date_str in daily_stats:
                    daily_stats[date_str]['count'] += 1
                    daily_stats[date_str]['size'] += obj['Size']
                else:
                    daily_stats[date_str] = {'count': 1, 'size': obj['Size']}
            
            logger.info(f"Generated storage stats: {public_count} public files, {private_count} private files")
            
            return {
                "public_files_count": public_count,
                "private_files_count": private_count,
                "public_storage_bytes": public_size,
                "private_storage_bytes": private_size,
                "total_files_count": public_count + private_count,
                "total_storage_bytes": public_size + private_size,
                "file_types": file_types,
                "daily_stats": daily_stats
            }
            
        except ClientError as e:
            logger.error(f"Error getting storage stats: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to get storage statistics: {str(e)}")
            
    def check_file_exists(self, key: str, is_public: bool = False) -> bool:
        """S3에 파일이 존재하는지 확인"""
        try:
            bucket = self.public_bucket if is_public else self.private_bucket
            self.s3_client.head_object(Bucket=bucket, Key=key)
            return True
        except ClientError as e:
            if e.response['Error']['Code'] == '404':
                return False
            else:
                logger.error(f"Error checking file existence: {str(e)}")
                raise HTTPException(status_code=500, detail=f"Failed to check file existence: {str(e)}")
    
    def get_public_url(self, key: str) -> str:
        """공개 파일의 URL 생성"""
        return f"https://{self.public_bucket}.s3.{os.environ.get('AWS_REGION', 'ap-northeast-2')}.amazonaws.com/{key}"
