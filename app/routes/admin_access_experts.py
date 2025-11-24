# app/routes/admin_access_experts.py
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from sqlmodel import Session
from typing import List, Optional
from app import crud, schemas
from app.db import get_db
import boto3
from botocore.exceptions import ClientError
import os
import uuid
import logging

# 로거 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/admin/api/accessexperts",
    tags=["Admin - Access Experts"]
)

# --- S3 설정 ---
S3_BUCKET = os.getenv("PUBLIC_BUCKET_NAME")
AWS_REGION = os.getenv("AWS_REGION", "ap-northeast-2")

# S3 클라이언트 생성
try:
    s3_client = boto3.client('s3', region_name=AWS_REGION)
    logger.info(f"S3 client created successfully for region {AWS_REGION}.")
except Exception as e:
    logger.error(f"Failed to create S3 client: {e}")
    s3_client = None

# --- API 엔드포인트 ---

@router.get("", response_model=List[schemas.AccessExpertSummary])
def read_access_experts(
    db: Session = Depends(get_db),
    skip: int = Query(0, ge=0, description="Number of records to skip for pagination"),
    limit: int = Query(100, ge=1, le=200, description="Maximum number of records to return"),
    keyword: Optional[str] = Query(None, description="Search keyword for expert name"),
    speciality: Optional[str] = Query(None, description="Filter by speciality")
):
    """
    AccessExpert 목록 조회 (요약 정보).
    - 키워드(이름) 검색 또는 전문성 필터링 지원.
    - 동시 사용 시 키워드 우선.
    """
    try:
        if keyword:
            summaries = crud.access_expert.search_summary(db, keyword=keyword, skip=skip, limit=limit)
        elif speciality:
            summaries = crud.access_expert.get_by_speciality_summary(db, speciality=speciality, skip=skip, limit=limit)
        else:
            summaries = crud.access_expert.get_multi_summary(db, skip=skip, limit=limit)

        return summaries
    except Exception as e:
        logger.error(f"Error reading access experts: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error while reading access experts.")


@router.post("", response_model=schemas.AccessExpert, status_code=201)
def create_access_expert(
    *,
    db: Session = Depends(get_db),
    access_expert_in: schemas.AccessExpertCreate
):
    """
    AccessExpert 생성 (기본 정보, 전문영역, 대표작품 포함).
    """
    try:
        access_expert = crud.access_expert.create_with_relations(db=db, obj_in=access_expert_in)
        return access_expert
    except Exception as e:
        logger.error(f"Error creating access expert: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error while creating access expert.")


@router.get("/{access_expert_id}", response_model=schemas.AccessExpert)
def read_access_expert(
    *,
    db: Session = Depends(get_db),
    access_expert_id: int
):
    """
    특정 AccessExpert 상세 정보 조회 (연관 정보 포함).
    """
    access_expert = crud.access_expert.get(db=db, id=access_expert_id)
    if not access_expert:
        logger.warning(f"Access expert with id {access_expert_id} not found.")
        raise HTTPException(status_code=404, detail="Access expert not found")
    return access_expert


@router.put("/{access_expert_id}", response_model=schemas.AccessExpert)
def update_access_expert(
    *,
    db: Session = Depends(get_db),
    access_expert_id: int,
    access_expert_in: schemas.AccessExpertUpdate
):
    """
    AccessExpert 정보 수정 (연관 정보 포함).
    - Request body에 포함된 필드만 업데이트.
    - 연관 정보(expertise, representative_works)는 전체 교체 방식.
    """
    db_access_expert = crud.access_expert.get(db=db, id=access_expert_id)
    if not db_access_expert:
        logger.warning(f"Access expert with id {access_expert_id} not found for update.")
        raise HTTPException(status_code=404, detail="Access expert not found")

    try:
        access_expert = crud.access_expert.update_with_relations(db=db, db_obj=db_access_expert, obj_in=access_expert_in)
        return access_expert
    except Exception as e:
        logger.error(f"Error updating access expert {access_expert_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error while updating access expert.")


@router.delete("/{access_expert_id}", status_code=204)
def delete_access_expert(
    *,
    db: Session = Depends(get_db),
    access_expert_id: int
):
    """
    AccessExpert 삭제.
    - 연관된 데이터(expertise, representative_works)도 함께 삭제됨.
    """
    access_expert = crud.access_expert.get(db=db, id=access_expert_id)
    if not access_expert:
        logger.warning(f"Access expert with id {access_expert_id} not found for deletion.")
        raise HTTPException(status_code=404, detail="Access expert not found")

    try:
        crud.access_expert.remove(db=db, id=access_expert_id)
        logger.info(f"Access expert with id {access_expert_id} deleted successfully.")
        return None
    except Exception as e:
        logger.error(f"Error deleting access expert {access_expert_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error while deleting access expert.")


@router.post("/{access_expert_id}/profile-image", response_model=schemas.AccessExpertProfileImageResponse)
async def upload_profile_image(
    *,
    db: Session = Depends(get_db),
    access_expert_id: int,
    file: UploadFile = File(...)
):
    """
    AccessExpert 프로필 이미지 업로드 (S3).
    - 성공 시 새 이미지 URL 반환 ({ "profileImage": "url" }).
    """
    if not s3_client:
        logger.error("S3 client is not available.")
        raise HTTPException(status_code=503, detail="S3 service is unavailable.")

    db_access_expert = crud.access_expert.get(db=db, id=access_expert_id)
    if not db_access_expert:
        logger.warning(f"Access expert with id {access_expert_id} not found for profile image upload.")
        raise HTTPException(status_code=404, detail="Access expert not found")

    # 파일 확장자 및 크기 제한
    allowed_extensions = ['.jpg', '.jpeg', '.png', '.gif']
    file_extension = os.path.splitext(file.filename)[1].lower()
    if file_extension not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed types: {', '.join(allowed_extensions)}"
        )

    # S3 파일명 생성
    s3_file_name = f"access-experts/{access_expert_id}/profile-{uuid.uuid4()}{file_extension}"

    try:
        file_content = await file.read()

        # 파일 크기 제한 (예: 5MB)
        if len(file_content) > 5 * 1024 * 1024:
            raise HTTPException(status_code=413, detail="File size exceeds the limit of 5MB.")

        s3_client.put_object(
            Bucket=S3_BUCKET,
            Key=s3_file_name,
            Body=file_content,
            ContentType=file.content_type,
            ACL='public-read'
        )
        logger.info(f"Profile image uploaded to S3: s3://{S3_BUCKET}/{s3_file_name}")

        # S3 URL 생성
        s3_url = f"https://{S3_BUCKET}.s3.{AWS_REGION}.amazonaws.com/{s3_file_name}"

        # DB 업데이트
        updated_data = schemas.AccessExpertUpdate(profile_image=s3_url)
        crud.access_expert.update(db=db, db_obj=db_access_expert, obj_in=updated_data)

        logger.info(f"Access expert {access_expert_id} profile image URL updated in DB.")

        return {"profile_image": s3_url}

    except ClientError as e:
        logger.error(f"S3 upload failed for access expert {access_expert_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to upload profile image.")
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error during profile image upload for access expert {access_expert_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="An internal error occurred.")
