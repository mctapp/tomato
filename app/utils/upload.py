# app/utils/upload.py
import boto3
from fastapi import UploadFile
import uuid
import os
from dotenv import load_dotenv

load_dotenv()

# AWS 설정을 .env 파일에서 가져옴
s3_client = boto3.client(
    's3',
    aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
    aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
    region_name=os.getenv('AWS_REGION')
)

# 번역가 프로필 이미지는 공개 버킷에 저장
BUCKET_NAME = os.getenv('PUBLIC_BUCKET_NAME')

async def upload_file_to_s3(file: UploadFile, path: str) -> str:
    """파일을 S3에 업로드하고 URL을 반환"""
    try:
        # 파일 확장자 추출
        ext = file.filename.split('.')[-1] if '.' in file.filename else ''
        
        # 고유한 파일명 생성
        filename = f"{uuid.uuid4()}.{ext}" if ext else str(uuid.uuid4())
        
        # S3 키 생성
        s3_key = f"{path}/{filename}"
        
        # 파일 내용 읽기
        content = await file.read()
        
        # S3에 업로드
        s3_client.put_object(
            Bucket=BUCKET_NAME,
            Key=s3_key,
            Body=content,
            ContentType=file.content_type,
            ACL='public-read'  # 공개 버킷이므로 public-read 추가
        )
        
        # URL 생성 및 반환
        file_url = f"https://{BUCKET_NAME}.s3.{os.getenv('AWS_REGION')}.amazonaws.com/{s3_key}"
        return file_url
    
    except Exception as e:
        raise Exception(f"Failed to upload file to S3: {str(e)}")
