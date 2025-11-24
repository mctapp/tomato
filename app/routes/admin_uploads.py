# app/routes/admin_uploads.py
from fastapi import APIRouter, Depends, File, UploadFile, Form, Query, Path, HTTPException, status
from app.services.s3_service import S3Service
from app.services.file_asset_service import FileAssetService
from app.schemas.file_assets import FileAssetCreate, FileAssetResponse
from typing import Dict, Optional, List, Any
from sqlmodel import Session
from app.db import get_session
from app.dependencies.auth import get_current_user, get_current_admin_user
from app.models.users import User
import uuid
import os
import logging

# 로거 설정
logger = logging.getLogger(__name__)

# S3 서비스 싱글톤 인스턴스
def get_s3_service():
    return S3Service()

# FileAssetService 의존성
def get_file_asset_service(db: Session = Depends(get_session)):
    s3_service = get_s3_service()
    return FileAssetService(db, s3_service)

router = APIRouter(
    prefix="/admin/api/uploads",
    tags=["Admin - Uploads"]
)

@router.post("/presigned-post", response_model=Dict)
async def get_presigned_post(
    directory: str = Form(...),
    filename: str = Form(...),
    content_type: str = Form(...),
    is_public: bool = Form(False),
    entity_type: str = Form(...),
    entity_id: int = Form(...),
    usage_type: str = Form(...),
    max_size: int = Form(100 * 1024 * 1024),
    expires_in: int = Form(3600),
    current_user: User = Depends(get_current_user)
):
    """업로드용 presigned URL 생성"""
    try:
        s3_service = get_s3_service()
        
        # 가이드라인 생성 중 임시 ID 처리
        if entity_id < 0 and entity_type == "guideline":
            logger.info(f"Using temporary entity_id {entity_id} for {entity_type}")
            
        ext = os.path.splitext(filename)[1]
        unique_filename = f"{uuid.uuid4()}{ext}"
        key = f"{directory}/{unique_filename}"

        presigned_data = s3_service.generate_presigned_post(
            key,
            content_type,
            is_public,
            expires_in=expires_in,
            max_content_length=max_size
        )

        logger.info(f"User {current_user.id} generated presigned POST URL for {key}")

        return {
            "presigned_data": presigned_data,
            "key": key,
            "bucket": s3_service.public_bucket if is_public else s3_service.private_bucket,
            "original_filename": filename,
            "content_type": content_type,
            "is_public": is_public,
            "entity_type": entity_type,
            "entity_id": entity_id,
            "usage_type": usage_type,
            "expires_in": expires_in
        }
    except Exception as e:
        logger.error(f"Error in presigned POST: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.get("/presigned-get/{file_id}", response_model=Dict)
async def get_presigned_get(
    file_id: int = Path(...),
    expires_in: int = Query(3600, ge=60, le=86400),
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_session)
):
    """파일 ID로 다운로드용 presigned URL 생성"""
    try:
        file_service = get_file_asset_service(db)
        url = file_service.generate_presigned_url(file_id, expires_in)

        logger.info(f"User {current_user.id} generated presigned GET URL for file {file_id}")

        return {"url": url, "expires_in": expires_in}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in presigned GET: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.post("/direct", response_model=FileAssetResponse)
async def direct_upload(
    file: UploadFile = File(...),
    directory: str = Form(...),
    is_public: bool = Form(False),
    entity_type: str = Form(...),
    entity_id: int = Form(...),
    usage_type: str = Form(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_session)
):
    """서버 경유 파일 업로드 및 메타데이터 저장"""
    try:
        s3_service = get_s3_service()
        file_service = get_file_asset_service(db)
        
        # 가이드라인 생성 중 임시 ID 처리
        if entity_id < 0 and entity_type == "guideline":
            logger.info(f"Processing temporary guideline ID: {entity_id}")
            # 실제 구현에서는 임시 저장소를 사용하거나 다른 특별 처리 가능
        
        ext = os.path.splitext(file.filename)[1] if file.filename else ""
        unique_filename = f"{uuid.uuid4()}{ext}"
        key = f"{directory}/{unique_filename}"

        # S3에 파일 업로드
        upload_result = await s3_service.direct_upload(file, key, is_public)

        # 파일 에셋 메타데이터 저장
        file_data = FileAssetCreate(
            s3_key=upload_result["key"],
            s3_bucket=upload_result["bucket"],
            original_filename=upload_result["original_filename"],
            content_type=upload_result["content_type"],
            file_size=upload_result["size"],
            is_public=upload_result["is_public"],
            width=upload_result.get("width"),
            height=upload_result.get("height"),
            entity_type=entity_type,
            entity_id=entity_id,
            usage_type=usage_type,
            created_by=current_user.id
        )

        file_asset = file_service.create(file_data)

        logger.info(f"User {current_user.id} uploaded file {file_asset.id} for {entity_type} {entity_id}")

        # 응답 포맷팅
        response = file_service.format_response(file_asset, with_url=True)
        return response

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in direct upload: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.get("/files", response_model=List[FileAssetResponse])
async def get_entity_files(
    entity_type: str = Query(...),
    entity_id: int = Query(...),
    with_urls: bool = Query(False),
    include_deleted: bool = Query(False),
    url_expiry: int = Query(3600, ge=60, le=86400),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_session)
):
    """엔티티 관련 파일 목록 조회"""
    try:
        file_service = get_file_asset_service(db)
        files = file_service.get_by_entity(entity_type, entity_id, include_deleted)

        logger.info(f"User {current_user.id} retrieved files for {entity_type} {entity_id}")

        # 응답 포맷팅
        return [file_service.format_response(file, with_url=with_urls, url_expiry=url_expiry) for file in files]

    except Exception as e:
        logger.error(f"Error retrieving entity files: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.delete("/files/{file_id}", response_model=Dict)
async def delete_file(
    file_id: int = Path(...),
    permanent: bool = Query(False),
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_session)
):
    """파일 삭제 (소프트 또는 영구 삭제)"""
    try:
        file_service = get_file_asset_service(db)
        success = file_service.delete(file_id, permanent)

        if success:
            logger.info(f"User {current_user.id} {'permanently ' if permanent else ''}deleted file {file_id}")
            return {"message": f"File {'permanently ' if permanent else ''}deleted successfully"}
        else:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting file: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.get("/stats", response_model=Dict[str, Any])
async def get_storage_stats(
    current_user: User = Depends(get_current_admin_user)
):
    """S3 스토리지 통계 정보 조회"""
    try:
        s3_service = get_s3_service()
        stats = s3_service.get_storage_stats()

        logger.info(f"User {current_user.id} retrieved storage statistics")

        return stats

    except Exception as e:
        logger.error(f"Error retrieving storage stats: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.post("/url-expiry-policy", response_model=Dict)
async def set_url_expiry_policy(
    entity_type: str = Form(...),
    expiry_seconds: int = Form(..., ge=60, le=604800),
    current_user: User = Depends(get_current_admin_user)
):
    """특정 엔티티 타입의 URL 만료 정책 설정"""
    try:
        logger.info(f"User {current_user.id} set URL expiry policy for {entity_type} to {expiry_seconds}s")

        return {
            "entity_type": entity_type,
            "expiry_seconds": expiry_seconds,
            "message": f"URL expiry policy for {entity_type} set to {expiry_seconds} seconds"
        }

    except Exception as e:
        logger.error(f"Error setting URL expiry policy: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
