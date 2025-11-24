# app/schemas/file_assets.py
from pydantic import validator
from typing import Optional
from datetime import datetime
from app.schemas.base import BaseSchema

class FileAssetBase(BaseSchema):
    s3_key: str
    s3_bucket: str
    original_filename: str
    content_type: str
    file_size: int
    is_public: bool
    entity_type: str
    entity_id: int
    usage_type: str
    width: Optional[int] = None
    height: Optional[int] = None
    rendition_type: Optional[str] = None

class FileAssetCreate(FileAssetBase):
    created_by: Optional[int] = None
    is_original: Optional[bool] = True
    original_file_id: Optional[int] = None
    status: Optional[str] = "active"

class FileAssetResponse(FileAssetBase):
    id: int
    is_original: bool
    original_file_id: Optional[int] = None
    status: str
    created_at: datetime
    updated_at: datetime
    created_by: Optional[int] = None
    
    # URL 동적 생성
    presigned_url: Optional[str] = None
    public_url: Optional[str] = None
    
    @validator('presigned_url', 'public_url', pre=True, always=True)
    def set_urls(cls, v, values):
        # URL은 API 응답 생성 시 동적으로 설정됨
        return v
