# app/dependencies/file_asset.py
from typing import Annotated
from fastapi import Depends
from sqlmodel import Session
from app.db import get_session
from app.services.file_asset_service import FileAssetService
from app.services.s3_service import S3Service

# S3 서비스 직접 생성 (의존성 체인 단순화)
def get_s3_service() -> S3Service:
    return S3Service()

# 파일 에셋 서비스 생성
def get_file_asset_service(db: Session = Depends(get_session)) -> FileAssetService:
    s3_service = get_s3_service()
    return FileAssetService(db, s3_service)
