# app/dependencies/s3.py
from app.services.s3_service import S3Service
from typing import Annotated
from fastapi import Depends

def get_s3_service() -> S3Service:
    """S3 서비스 인스턴스 반환"""
    return S3Service()

S3ServiceDep = Annotated[S3Service, Depends(get_s3_service)]
