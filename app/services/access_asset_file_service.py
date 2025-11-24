# app/services/access_asset_file_service.py
from fastapi import UploadFile, HTTPException
from sqlmodel import Session
from typing import Dict, Optional, List, Tuple, Any
import os
import uuid
import mimetypes
# import magic  # 이 라인 제거 또는 주석 처리
from datetime import datetime

from app.models.access_asset import AccessAsset
from app.models.file_assets import FileAsset
from app.services.s3_service import S3Service

class AccessAssetFileService:
    """접근성 미디어 자산의 파일 관리를 담당하는 서비스"""
    
    # 미디어 타입별 허용되는 파일 형식
    MEDIA_TYPE_FILE_FORMATS = {
        # 음성해설 (Audio Description)
        "AD": {
            "extensions": [".mp3", ".m4a", ".wav", ".aac"],
            "mime_types": ["audio/mpeg", "audio/mp4", "audio/x-m4a", "audio/wav", "audio/x-wav", "audio/aac"],
            "max_size": 300 * 1024 * 1024  # 300MB
        },
        # 자막해설 (Closed Caption)
        "CC": {
            "extensions": [".srt", ".vtt", ".json", ".txt"],
            "mime_types": ["text/plain", "text/srt", "text/vtt", "application/json"],
            "max_size": 10 * 1024 * 1024  # 10MB
        },
        # 수어해설 (Sign Language)
        "SL": {
            "extensions": [".mp4", ".mov", ".webm"],
            "mime_types": ["video/mp4", "video/quicktime", "video/webm"],
            "max_size": 500 * 1024 * 1024  # 500MB
        },
        # 음성소개 (Introduction Audio)
        "IA": {
            "extensions": [".mp3", ".m4a", ".wav", ".aac"],
            "mime_types": ["audio/mpeg", "audio/mp4", "audio/x-m4a", "audio/wav", "audio/x-wav", "audio/aac"],
            "max_size": 100 * 1024 * 1024  # 100MB
        },
        # 자막소개 (Introduction Caption)
        "IC": {
            "extensions": [".srt", ".vtt", ".json", ".txt"],
            "mime_types": ["text/plain", "text/srt", "text/vtt", "application/json"],
            "max_size": 5 * 1024 * 1024  # 5MB
        },
        # 수어소개 (Introduction Sign)
        "IS": {
            "extensions": [".mp4", ".mov", ".webm"],
            "mime_types": ["video/mp4", "video/quicktime", "video/webm"],
            "max_size": 200 * 1024 * 1024  # 200MB
        },
        # 음성리뷰 (Review Audio)
        "RA": {
            "extensions": [".mp3", ".m4a", ".wav", ".aac"],
            "mime_types": ["audio/mpeg", "audio/mp4", "audio/x-m4a", "audio/wav", "audio/x-wav", "audio/aac"],
            "max_size": 100 * 1024 * 1024  # 100MB
        },
        # 자막리뷰 (Review Caption)
        "RC": {
            "extensions": [".srt", ".vtt", ".json", ".txt"],
            "mime_types": ["text/plain", "text/srt", "text/vtt", "application/json"],
            "max_size": 5 * 1024 * 1024  # 5MB
        },
        # 수어리뷰 (Review Sign)
        "RS": {
            "extensions": [".mp4", ".mov", ".webm"],
            "mime_types": ["video/mp4", "video/quicktime", "video/webm"],
            "max_size": 200 * 1024 * 1024  # 200MB
        }
    }
    
    def __init__(self):
        self.s3_service = S3Service()
    
    def validate_file_for_media_type(
        self,
        file: UploadFile,
        media_type: str,
        file_size: int
    ) -> None:
        """미디어 타입에 맞는 파일인지 검증"""
        if media_type not in self.MEDIA_TYPE_FILE_FORMATS:
            raise HTTPException(status_code=400, detail=f"지원하지 않는 미디어 타입: {media_type}")
        
        # 확장자 검증
        _, file_ext = os.path.splitext(file.filename.lower())
        if file_ext not in self.MEDIA_TYPE_FILE_FORMATS[media_type]["extensions"]:
            allowed_exts = ", ".join(self.MEDIA_TYPE_FILE_FORMATS[media_type]["extensions"])
            raise HTTPException(
                status_code=400, 
                detail=f"{media_type} 미디어 타입에 허용되지 않는 파일 형식입니다. 허용 확장자: {allowed_exts}"
            )
        
        # MIME 타입 검증
        content_type = file.content_type
        if content_type not in self.MEDIA_TYPE_FILE_FORMATS[media_type]["mime_types"]:
            allowed_types = ", ".join(self.MEDIA_TYPE_FILE_FORMATS[media_type]["mime_types"])
            raise HTTPException(
                status_code=400, 
                detail=f"{media_type} 미디어 타입에 허용되지 않는 콘텐츠 타입입니다. 허용 MIME 타입: {allowed_types}"
            )
        
        # 파일 크기 검증
        max_size = self.MEDIA_TYPE_FILE_FORMATS[media_type]["max_size"]
        if file_size > max_size:
            raise HTTPException(
                status_code=400, 
                detail=f"파일 크기가 너무 큽니다. 최대 허용 크기: {max_size // (1024 * 1024)}MB"
            )
    
    # python-magic 라이브러리 없이 파일 형식을 추정하는 함수
    def guess_content_type(self, filename: str) -> str:
        """파일명의 확장자를 기반으로 MIME 타입 추정"""
        content_type, _ = mimetypes.guess_type(filename)
        if not content_type:
            # 기본값 설정
            ext = os.path.splitext(filename.lower())[1]
            if ext in ['.mp3']:
                return 'audio/mpeg'
            elif ext in ['.m4a']:
                return 'audio/mp4'
            elif ext in ['.wav']:
                return 'audio/wav'
            elif ext in ['.mp4']:
                return 'video/mp4'
            elif ext in ['.mov']:
                return 'video/quicktime'
            elif ext in ['.srt', '.vtt']:
                return 'text/plain'
            elif ext in ['.json']:
                return 'application/json'
            else:
                return 'application/octet-stream'
        return content_type
    
    async def detect_content_type(self, file: UploadFile) -> str:
        """파일의 실제 콘텐츠 타입 감지"""
        # python-magic 라이브러리 대신 UploadFile의 content_type과 파일 확장자 사용
        if file.content_type and file.content_type != 'application/octet-stream':
            return file.content_type
        
        # 파일 확장자로 추측
        return self.guess_content_type(file.filename)
    
    async def upload_file_for_asset(
        self,
        db: Session,
        file: UploadFile,
        asset_id: int,
        supported_os_type: Optional[str] = None,
        current_user_id: Optional[int] = None
    ) -> Tuple[FileAsset, Dict[str, Any]]:
        """
        접근성 미디어 자산을 위한 파일 업로드 및 FileAsset 생성
        
        Returns:
            Tuple[FileAsset, Dict[str, Any]]: (생성된 FileAsset 객체, S3 업로드 결과)
        """
        # 자산 조회
        asset = db.get(AccessAsset, asset_id)
        if not asset:
            raise HTTPException(status_code=404, detail="Access asset not found")
        
        # 파일 정보 수집
        file_size = 0
        file.file.seek(0, 2)  # 파일 끝으로 이동
        file_size = file.file.tell()  # 파일 크기 확인
        file.file.seek(0)  # 파일 시작으로 되돌림
        
        # MIME 타입이 없으면 추측
        if not file.content_type or file.content_type == 'application/octet-stream':
            file.content_type = self.guess_content_type(file.filename)
        
        # 파일 유효성 검증
        self.validate_file_for_media_type(file, asset.media_type, file_size)
        
        # S3 키 생성
        file_ext = os.path.splitext(file.filename)[1].lower()
        s3_key = f"access-assets/{asset.movie_id}/{asset.media_type}/{uuid.uuid4()}{file_ext}"
        
        # S3에 업로드
        upload_result = await self.s3_service.direct_upload(
            file=file,
            key=s3_key,
            is_public=asset.is_public
        )
        
        # FileAsset 생성
        file_asset = FileAsset(
            s3_key=s3_key,
            s3_bucket=upload_result["bucket"],
            original_filename=file.filename,
            content_type=file.content_type,
            file_size=file_size,
            is_public=asset.is_public,
            is_original=True,
            created_by=current_user_id,
            entity_type="access_asset",
            entity_id=asset_id,
            usage_type=asset.media_type,
            status="active",
            supported_os_type=supported_os_type
        )
        
        db.add(file_asset)
        db.commit()
        db.refresh(file_asset)
        
        # 자산의 media_file_id 업데이트
        asset.media_file_id = file_asset.id
        asset.updated_at = datetime.now()
        
        # 기존 레거시 파일 필드도 업데이트 (호환성 유지)
        asset.original_filename = file.filename
        asset.file_type = file.content_type
        asset.file_size = file_size
        asset.uploaded_at = datetime.now()
        
        if upload_result.get("key"):
            parts = upload_result["key"].split("/")
            if len(parts) >= 2:
                asset.s3_directory = "/".join(parts[:-1])
                asset.s3_filename = parts[-1]
        
        db.add(asset)
        db.commit()
        db.refresh(asset)
        
        return file_asset, upload_result
    
    # 나머지 코드는 동일하게 유지...
    
    def replace_file_for_asset(
        self,
        db: Session,
        file_id: int,
        new_file_asset: FileAsset
    ) -> AccessAsset:
        """
        접근성 미디어 자산의 파일 교체
        
        Args:
            db: 데이터베이스 세션
            file_id: 교체할 FileAsset ID
            new_file_asset: 새 FileAsset 객체
        
        Returns:
            AccessAsset: 업데이트된 접근성 미디어 자산
        """
        # 기존 파일 자산 조회
        old_file_asset = db.get(FileAsset, file_id)
        if not old_file_asset:
            raise HTTPException(status_code=404, detail="File asset not found")
        
        # 연결된 접근성 미디어 자산 조회
        asset_query = db.exec(f"SELECT * FROM access_assets WHERE media_file_id = {file_id}")
        asset = asset_query.first()
        if not asset:
            raise HTTPException(status_code=404, detail="Associated access asset not found")
        
        # 기존 파일 자산 비활성화
        old_file_asset.status = "replaced"
        db.add(old_file_asset)
        
        # 새 파일 자산 연결
        asset.media_file_id = new_file_asset.id
        asset.updated_at = datetime.now()
        
        # 기존 레거시 파일 필드도 업데이트 (호환성 유지)
        asset.original_filename = new_file_asset.original_filename
        asset.file_type = new_file_asset.content_type
        asset.file_size = new_file_asset.file_size
        asset.uploaded_at = datetime.now()
        
        s3_key_parts = new_file_asset.s3_key.split("/")
        if len(s3_key_parts) >= 2:
            asset.s3_directory = "/".join(s3_key_parts[:-1])
            asset.s3_filename = s3_key_parts[-1]
        
        db.add(asset)
        db.commit()
        db.refresh(asset)
        
        return asset
    
    def get_file_for_asset(
        self,
        db: Session,
        asset_id: int
    ) -> Optional[FileAsset]:
        """접근성 미디어 자산에 연결된 파일 조회"""
        asset = db.get(AccessAsset, asset_id)
        if not asset:
            raise HTTPException(status_code=404, detail="Access asset not found")
        
        if not asset.media_file_id:
            # 직접 S3 경로가 있는지 확인 (레거시 방식)
            if asset.s3_directory and asset.s3_filename:
                # 레거시 데이터를 FileAsset으로 마이그레이션
                file_asset = FileAsset(
                    s3_key=f"{asset.s3_directory}/{asset.s3_filename}",
                    s3_bucket=os.getenv("PUBLIC_BUCKET_NAME") if asset.is_public else os.getenv("PRIVATE_BUCKET_NAME"),
                    original_filename=asset.original_filename,
                    content_type=asset.file_type,
                    file_size=asset.file_size,
                    is_public=asset.is_public,
                    is_original=True,
                    created_at=asset.uploaded_at,
                    updated_at=asset.uploaded_at,
                    entity_type="access_asset",
                    entity_id=asset_id,
                    usage_type=asset.media_type,
                    status="active"
                )
                
                db.add(file_asset)
                db.commit()
                db.refresh(file_asset)
                
                # 자산 업데이트
                asset.media_file_id = file_asset.id
                db.add(asset)
                db.commit()
                
                return file_asset
            return None
        
        return db.get(FileAsset, asset.media_file_id)
    
    def generate_download_url(
        self,
        db: Session,
        asset_id: int,
        expires_in: int = 3600
    ) -> Dict[str, Any]:
        """접근성 미디어 자산 파일의 다운로드 URL 생성"""
        file_asset = self.get_file_for_asset(db, asset_id)
        if not file_asset:
            raise HTTPException(status_code=404, detail="No file found for this asset")
        
        # URL 생성
        try:
            presigned_url = self.s3_service.generate_presigned_get(
                key=file_asset.s3_key,
                is_public=file_asset.is_public,
                expires_in=expires_in
            )
            
            return {
                "url": presigned_url,
                "expires_in": expires_in,
                "file_name": file_asset.original_filename,
                "file_size": file_asset.file_size,
                "content_type": file_asset.content_type
            }
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to generate download URL: {str(e)}")
    
    def delete_file_from_asset(
        self,
        db: Session,
        asset_id: int
    ) -> bool:
        """접근성 미디어 자산의 파일 삭제"""
        asset = db.get(AccessAsset, asset_id)
        if not asset:
            raise HTTPException(status_code=404, detail="Access asset not found")
        
        # FileAsset을 통한 삭제
        if asset.media_file_id:
            file_asset = db.get(FileAsset, asset.media_file_id)
            if file_asset:
                # S3에서 파일 삭제
                try:
                    self.s3_service.delete_file(file_asset.s3_key, is_public=file_asset.is_public)
                except Exception as e:
                    print(f"Error deleting file from S3: {e}")
                
                # 파일 자산 상태 변경
                file_asset.status = "deleted"
                db.add(file_asset)
                
                # 자산 파일 참조 제거
                asset.media_file_id = None
                db.add(asset)
                db.commit()
                
                return True
        
        # 레거시 방식 삭제 (직접 S3 경로 참조)
        elif asset.s3_directory and asset.s3_filename:
            try:
                key = f"{asset.s3_directory}/{asset.s3_filename}"
                self.s3_service.delete_file(key, is_public=asset.is_public)
            except Exception as e:
                print(f"Error deleting legacy file from S3: {e}")
            
            # 레거시 파일 필드 초기화
            asset.original_filename = None
            asset.s3_filename = None
            asset.s3_directory = None
            asset.file_size = None
            asset.file_type = None
            asset.uploaded_at = None
            
            db.add(asset)
            db.commit()
            
            return True
        
        return False

# 서비스 인스턴스 생성
access_asset_file_service = AccessAssetFileService()
