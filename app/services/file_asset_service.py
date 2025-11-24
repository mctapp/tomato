# app/services/file_asset_service.py
from typing import List, Optional, Dict, Any
from sqlmodel import Session, select
from app.models.file_assets import FileAsset
from app.schemas.file_assets import FileAssetCreate, FileAssetResponse
from app.services.s3_service import S3Service
from fastapi import HTTPException
import logging

logger = logging.getLogger(__name__)

class FileAssetService:
    def __init__(self, db: Session, s3_service: Optional[S3Service] = None):
        self.db = db
        self.s3_service = s3_service or S3Service()
    
    def create(self, file_data: FileAssetCreate) -> FileAsset:
        """파일 에셋 생성"""
        file_asset = FileAsset(**file_data.model_dump())
        self.db.add(file_asset)
        self.db.commit()
        self.db.refresh(file_asset)
        
        logger.info(f"Created file asset {file_asset.id} for {file_asset.entity_type} {file_asset.entity_id}")
        return file_asset
    
    def get_by_id(self, file_id: int) -> Optional[FileAsset]:
        """ID로 파일 에셋 조회"""
        file_asset = self.db.get(FileAsset, file_id)
        if not file_asset:
            logger.warning(f"File asset {file_id} not found")
        return file_asset
    
    def get_by_entity(self, entity_type: str, entity_id: int, include_deleted: bool = False) -> List[FileAsset]:
        """엔티티 타입과 ID로 파일 에셋 목록 조회"""
        query = select(FileAsset).where(
            FileAsset.entity_type == entity_type,
            FileAsset.entity_id == entity_id
        )
        
        if not include_deleted:
            query = query.where(FileAsset.status == "active")
            
        results = self.db.exec(query).all()
        logger.info(f"Found {len(results)} file assets for {entity_type} {entity_id}")
        return results
    
    def update(self, file_id: int, update_data: Dict[str, Any]) -> Optional[FileAsset]:
        """파일 에셋 정보 수정"""
        file_asset = self.get_by_id(file_id)
        if not file_asset:
            logger.warning(f"Cannot update file asset {file_id}: not found")
            return None
        
        for key, value in update_data.items():
            if hasattr(file_asset, key):
                setattr(file_asset, key, value)
        
        self.db.add(file_asset)
        self.db.commit()
        self.db.refresh(file_asset)
        
        logger.info(f"Updated file asset {file_id}")
        return file_asset
    
    def delete(self, file_id: int, permanent: bool = False) -> bool:
        """파일 에셋 삭제 (소프트 또는 영구 삭제)"""
        file_asset = self.get_by_id(file_id)
        if not file_asset:
            logger.warning(f"Cannot delete file asset {file_id}: not found")
            return False
        
        if permanent:
            # S3에서 파일 삭제 시도
            try:
                self.s3_service.delete_file(file_asset.s3_key, file_asset.is_public)
                # DB에서 레코드 영구 삭제
                self.db.delete(file_asset)
                self.db.commit()
                logger.info(f"Permanently deleted file asset {file_id} from S3 and database")
                return True
            except Exception as e:
                logger.error(f"Failed to permanently delete file asset {file_id}: {str(e)}")
                raise HTTPException(status_code=500, detail=f"Failed to delete file: {str(e)}")
        else:
            # 소프트 삭제 (상태만 변경)
            file_asset.status = "deleted"
            self.db.add(file_asset)
            self.db.commit()
            logger.info(f"Soft-deleted file asset {file_id}")
            return True
    
    def generate_presigned_url(self, file_id: int, expires_in: int = 3600) -> str:
        """파일 다운로드용 presigned URL 생성"""
        file_asset = self.get_by_id(file_id)
        if not file_asset:
            logger.warning(f"Cannot generate URL for file asset {file_id}: not found")
            raise HTTPException(status_code=404, detail="File not found")
        
        if file_asset.is_public:
            # 공개 파일은 정적 URL 반환
            url = self.s3_service.get_public_url(file_asset.s3_key)
            logger.info(f"Generated public URL for file asset {file_id}")
            return url
        else:
            # 비공개 파일은 presigned URL 생성
            url = self.s3_service.generate_presigned_get(
                file_asset.s3_key, 
                expires_in=expires_in, 
                is_public=False
            )
            logger.info(f"Generated presigned URL for file asset {file_id} with {expires_in}s expiry")
            return url
    
    def verify_file_exists(self, file_id: int) -> bool:
        """파일이 S3에 실제로 존재하는지 확인"""
        file_asset = self.get_by_id(file_id)
        if not file_asset:
            return False
        
        return self.s3_service.check_file_exists(file_asset.s3_key, file_asset.is_public)
    
    def format_response(self, file_asset: FileAsset, with_url: bool = False, 
                      url_expiry: int = 3600) -> FileAssetResponse:
        """파일 에셋을 응답 형식으로 변환"""
        response_data = FileAssetResponse.model_validate(file_asset)
        
        if with_url:
            if file_asset.is_public:
                response_data.public_url = self.s3_service.get_public_url(file_asset.s3_key)
            else:
                response_data.presigned_url = self.s3_service.generate_presigned_get(
                    file_asset.s3_key, 
                    expires_in=url_expiry, 
                    is_public=False
                )
        
        return response_data
