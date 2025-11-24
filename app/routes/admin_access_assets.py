# app/routes/admin_access_assets.py

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query, Path, Body
from sqlmodel import Session
from typing import List, Optional, Dict, Any
from app.db import get_session  # get_db → get_session으로 변경
from app.dependencies.auth import get_current_user  # 인증 의존성 추가
from app.models.users import User  # User 모델 추가
from app.services.access_asset_service import access_asset_service
from app.services.production_project_service import ProductionProjectService
from app.schemas.access_asset import (
    AccessAsset,
    AccessAssetCreate,
    AccessAssetUpdate,
    AccessAssetResponse,
    AccessAssetDetailResponse, 
    AccessAssetMemoCreate,
    AccessAssetMemoInDB,
    AccessAssetCreditCreate,
    AccessAssetCreditInDB,
    PresignedUrlResponse
)
# 모든 모델 임포트를 상단으로 이동
from app.models.access_asset import AccessAsset as AccessAssetModel
from app.models.scriptwriter import Scriptwriter
from app.models.voice_artist import VoiceArtist
from app.models.sl_interpreter import SLInterpreter
from app.models.staff import Staff
from app.models.access_asset_credit import AccessAssetCredit
from app.crud.crud_access_asset import access_asset as crud_access_asset

import boto3
from botocore.exceptions import ClientError
import os
import uuid
import logging
from datetime import datetime, date
import json
import re

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/admin/api/access-assets",
    tags=["Admin - Access Assets"]
)

# S3 설정
S3_BUCKET = os.getenv("PUBLIC_BUCKET_NAME")
AWS_REGION = os.getenv("AWS_REGION", "ap-northeast-2")

try:
    s3_client = boto3.client('s3', region_name=AWS_REGION)
    logger.info(f"S3 client created for region {AWS_REGION}.")
except Exception as e:
    logger.error(f"Failed to create S3 client: {e}")
    s3_client = None


# 헬퍼 함수들
def camel_to_snake(data: Dict[str, Any]) -> Dict[str, Any]:
    snake_data = {}
    for key, value in data.items():
        snake_key = re.sub(r'([a-z0-9])([A-Z])', r'\1_\2', key).lower()
        snake_data[snake_key] = value
    return snake_data


def simplify_file_type(content_type: Optional[str]) -> str:
    if not content_type:
        return 'unknown'
    if 'application/json' in content_type:
        return 'json'
    elif 'audio/' in content_type:
        return 'audio'
    elif 'video/' in content_type:
        return 'video'
    elif 'text/' in content_type:
        return 'text'
    elif 'image/' in content_type:
        return 'image'
    else:
        return content_type.split('/')[-1][:10]


def load_credit_relations(db: Session, credit: AccessAssetCredit) -> None:
    """크레디트의 관계 데이터를 로드하는 헬퍼 함수"""
    if credit.person_type == 'scriptwriter' and credit.scriptwriter_id:
        credit.scriptwriter = db.get(Scriptwriter, credit.scriptwriter_id)
    elif credit.person_type == 'voice_artist' and credit.voice_artist_id:
        credit.voice_artist = db.get(VoiceArtist, credit.voice_artist_id)
    elif credit.person_type == 'sl_interpreter' and credit.sl_interpreter_id:
        credit.sl_interpreter = db.get(SLInterpreter, credit.sl_interpreter_id)
    elif credit.person_type == 'staff' and credit.staff_id:
        credit.staff = db.get(Staff, credit.staff_id)


# 통계 및 검색 엔드포인트
@router.get("/stats", response_model=Dict[str, Any])
def get_assets_stats(
    db: Session = Depends(get_session),  # get_db → get_session
    current_user: User = Depends(get_current_user)  # 인증 추가
):
    logger.info(f"User {current_user.email} accessing /stats endpoint")
    stats = access_asset_service.get_assets_stats(db)
    return stats


@router.get("/search", response_model=Dict[str, Any])
def search_access_assets(
    db: Session = Depends(get_session),  # get_db → get_session
    current_user: User = Depends(get_current_user),  # 인증 추가
    movie_id: Optional[int] = Query(None),
    media_types: Optional[List[str]] = Query(None),
    languages: Optional[List[str]] = Query(None),
    asset_types: Optional[List[str]] = Query(None),
    is_public: Optional[bool] = Query(None),
    production_status: Optional[str] = Query(None),
    publishing_status: Optional[str] = Query(None),
    search_term: Optional[str] = Query(None, min_length=1, max_length=100),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    order_by: str = Query("created_at", regex="^[a-zA-Z0-9_]+$"),
    order_dir: str = Query("desc", regex="^(asc|desc)$")
):
    assets_items, total_count = access_asset_service.get_assets_with_filters(
        db,
        movie_id=movie_id,
        media_types=media_types,
        languages=languages,
        asset_types=asset_types,
        is_public=is_public,
        production_status=production_status,
        publishing_status=publishing_status,
        search_term=search_term,
        skip=skip,
        limit=limit,
        order_by=order_by,
        order_dir=order_dir
    )
    current_page = (skip // limit) + 1 if limit > 0 else 1
    total_pages = (total_count + limit - 1) // limit if limit > 0 else (1 if total_count > 0 else 0)
    pagination = {
        "total_items": total_count,
        "total_pages": total_pages,
        "current_page": current_page,
        "page_size": limit,
    }
    return {"items": assets_items, "pagination": pagination}


@router.get("/by-movie/{movie_id}", response_model=List[AccessAssetResponse])
def get_assets_by_movie_endpoint(
    movie_id: int = Path(..., ge=1),
    db: Session = Depends(get_session),  # get_db → get_session
    current_user: User = Depends(get_current_user)  # 인증 추가
):
    assets = access_asset_service.get_assets_by_movie(db, movie_id)
    return assets


# 기본 CRUD 엔드포인트
@router.post("", response_model=AccessAssetResponse, status_code=201)
async def create_access_asset_endpoint(
    *,
    db: Session = Depends(get_session),  # get_db → get_session
    current_user: User = Depends(get_current_user),  # 인증 추가
    file: UploadFile = File(...),
    data: str = Form(...)
):
    if not s3_client:
        raise HTTPException(status_code=503, detail="S3 service is unavailable.")
    try:
        asset_data_json = json.loads(data)
        try:
            asset_create_schema = AccessAssetCreate(**asset_data_json)
        except Exception as pydantic_error:
            logger.error(f"Pydantic validation error for AccessAssetCreate: {pydantic_error}")
            raise HTTPException(status_code=422, detail=f"Invalid asset data: {pydantic_error}")

        file_content = await file.read()
        file_size = len(file_content)
        file_ext = os.path.splitext(file.filename)[1].lower() if file.filename else ".unknown"
        simplified_file_type = simplify_file_type(file.content_type)
        
        s3_directory = f"access-assets/{asset_create_schema.movie_id}/{asset_create_schema.media_type}"
        s3_filename = f"{uuid.uuid4()}{file_ext}"
        s3_key = f"{s3_directory}/{s3_filename}"
        
        s3_client.put_object(
            Bucket=S3_BUCKET,
            Key=s3_key,
            Body=file_content,
            ContentType=file.content_type or 'application/octet-stream',
            ACL='public-read'
        )
        
        obj_in_data = asset_create_schema.model_dump()
        obj_in_data['original_filename'] = file.filename
        obj_in_data['s3_filename'] = s3_filename
        obj_in_data['s3_directory'] = s3_directory
        obj_in_data['file_size'] = file_size
        obj_in_data['file_type'] = simplified_file_type
        obj_in_data['uploaded_at'] = datetime.utcnow()
        
        obj_in_data['created_at'] = datetime.utcnow()
        obj_in_data['updated_at'] = datetime.utcnow()

        db_obj = AccessAssetModel(**obj_in_data)
        
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj
        
    except json.JSONDecodeError:
        raise HTTPException(status_code=422, detail="Invalid JSON data in 'data' field")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating access asset: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/{asset_id}/upload", response_model=AccessAssetResponse)
async def upload_asset_file_endpoint(
    *,
    db: Session = Depends(get_session),  # get_db → get_session
    current_user: User = Depends(get_current_user),  # 인증 추가
    asset_id: int = Path(..., ge=1),
    file: UploadFile = File(...)
):
    """접근성 미디어 자산의 파일을 업로드"""
    if not s3_client:
        raise HTTPException(status_code=503, detail="S3 service is unavailable.")
    
    asset = crud_access_asset.get(db=db, id=asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Access asset not found")
    
    try:
        file_content = await file.read()
        file_size = len(file_content)
        file_ext = os.path.splitext(file.filename)[1].lower() if file.filename else ".unknown"
        simplified_file_type = simplify_file_type(file.content_type)
        
        s3_directory = f"access-assets/{asset.movie_id}/{asset.media_type}"
        s3_filename = f"{uuid.uuid4()}{file_ext}"
        s3_key = f"{s3_directory}/{s3_filename}"
        
        s3_client.put_object(
            Bucket=S3_BUCKET,
            Key=s3_key,
            Body=file_content,
            ContentType=file.content_type or 'application/octet-stream',
            ACL='public-read'
        )
        
        updated_asset = crud_access_asset.update_file_info(
            db=db,
            db_obj=asset,
            original_filename=file.filename,
            s3_filename=s3_filename,
            s3_directory=s3_directory,
            file_size=file_size,
            file_type=simplified_file_type
        )
        
        return updated_asset
        
    except Exception as e:
        logger.error(f"Error uploading file for asset {asset_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("", response_model=List[AccessAssetResponse])
def read_access_assets(
    db: Session = Depends(get_session),  # get_db → get_session
    current_user: User = Depends(get_current_user),  # 인증 추가
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    movie_id: Optional[int] = Query(None),
    media_type: Optional[str] = Query(None),
    language: Optional[str] = Query(None)
):
    if movie_id is not None:
        assets = crud_access_asset.get_by_movie(
            db, 
            movie_id=movie_id, 
            media_type=media_type, 
            language=language, 
            skip=skip, 
            limit=limit
        )
    else:
        assets = crud_access_asset.get_multi(db, skip=skip, limit=limit)
    return assets


@router.get("/{asset_id}", response_model=AccessAssetResponse)
def read_access_asset(
    *,
    db: Session = Depends(get_session),  # get_db → get_session
    current_user: User = Depends(get_current_user),  # 인증 추가
    asset_id: int = Path(..., ge=1)
):
    asset = crud_access_asset.get_with_relations(db=db, id=asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Access asset not found")
    return asset


@router.get("/{asset_id}/preview", response_model=Dict[str, Any])
def get_asset_preview(
    *,
    db: Session = Depends(get_session),  # get_db → get_session
    current_user: User = Depends(get_current_user),  # 인증 추가
    asset_id: int = Path(..., ge=1)
):
    """접근성 미디어 자산 미리보기 정보 조회"""
    asset = crud_access_asset.get_with_relations(db=db, id=asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Access asset not found")
    
    preview_data = {
        "asset_id": asset.id,
        "media_type": asset.media_type,
        "file_type": asset.file_type,
        "original_filename": asset.original_filename,
        "s3_filename": asset.s3_filename,
        "s3_directory": asset.s3_directory,
        "file_size": asset.file_size
    }
    
    if asset.s3_filename and asset.s3_directory:
        file_url = f"/api/files/{asset.s3_directory}/{asset.s3_filename}"
        preview_data["file_url"] = file_url
        
        if asset.media_type in ["AD", "AI", "AR"] or asset.file_type == "audio":
            preview_data["player_type"] = "audio"
        elif asset.media_type in ["SL", "SI", "SR"] or asset.file_type == "video":
            preview_data["player_type"] = "video"
        elif asset.media_type in ["CC", "CI", "CR"] or asset.file_type == "json":
            preview_data["player_type"] = "subtitle"
            
            try:
                s3_key = f"{asset.s3_directory}/{asset.s3_filename}"
                response = s3_client.get_object(Bucket=S3_BUCKET, Key=s3_key)
                content = response['Body'].read().decode('utf-8')
                
                if asset.file_type == "json":
                    try:
                        subtitle_data = json.loads(content)
                        preview_data["subtitle_data"] = subtitle_data
                    except json.JSONDecodeError:
                        preview_data["subtitle_data"] = None
                        preview_data["error"] = "Invalid JSON format"
                else:
                    preview_data["content"] = content
            except Exception as e:
                logger.error(f"Error loading subtitle content: {e}")
                preview_data["error"] = "Failed to load subtitle content"
        else:
            preview_data["player_type"] = "unknown"
        
        try:
            s3_key = f"{asset.s3_directory}/{asset.s3_filename}"
            presigned_url = s3_client.generate_presigned_url(
                'get_object',
                Params={
                    'Bucket': S3_BUCKET,
                    'Key': s3_key,
                },
                ExpiresIn=3600
            )
            preview_data["presigned_url"] = presigned_url
        except Exception as e:
            logger.error(f"Error generating presigned URL: {e}")
    
    return preview_data


@router.put("/{asset_id}", response_model=AccessAssetResponse)
def update_access_asset(
    *,
    db: Session = Depends(get_session),  # get_db → get_session
    current_user: User = Depends(get_current_user),  # 인증 추가
    asset_id: int = Path(..., ge=1),
    asset_in: AccessAssetUpdate
):
    logger.info(f"User {current_user.email} updating asset_id: {asset_id}")
    logger.info(f"Received asset_in (Pydantic model): {asset_in.model_dump_json(indent=2)}")
    asset_db_obj = crud_access_asset.get(db=db, id=asset_id)
    if not asset_db_obj:
        raise HTTPException(status_code=404, detail="Access asset not found")
    update_data_from_model = asset_in.model_dump(exclude_unset=True)
    logger.info(f"Data after model_dump(exclude_unset=True): {update_data_from_model}")
    update_data_snake_case = camel_to_snake(update_data_from_model)
    logger.info(f"Data after camel_to_snake: {update_data_snake_case}")
    updated_asset = crud_access_asset.update(db=db, db_obj=asset_db_obj, obj_in=update_data_snake_case)
    
    # 프로덕션 상태가 'completed'로 변경되면 프로젝트도 완료 처리
    if 'production_status' in update_data_snake_case:
        if update_data_snake_case['production_status'] == 'completed':
            from app.models.production_project import ProductionProject
            project = db.query(ProductionProject).filter(
                ProductionProject.access_asset_id == asset_id
            ).first()
            if project:
                project.project_status = 'completed'
                project.actual_completion_date = date.today()
                project.progress_percentage = 100.0
        elif update_data_snake_case['production_status'] == 'in_progress':
            project_service = ProductionProjectService(db)
            project_service.check_and_create_for_asset(asset_id)
    
    return updated_asset


@router.delete("/{asset_id}", status_code=204)
def delete_access_asset(
    *,
    db: Session = Depends(get_session),  # get_db → get_session
    current_user: User = Depends(get_current_user),  # 인증 추가
    asset_id: int = Path(..., ge=1)
):
    asset = crud_access_asset.get(db=db, id=asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Access asset not found")
    crud_access_asset.remove(db=db, id=asset_id)
    return None 


@router.get("/{asset_id}/file", response_model=PresignedUrlResponse)
def get_asset_file_url(
    *,
    db: Session = Depends(get_session),  # get_db → get_session
    current_user: User = Depends(get_current_user),  # 인증 추가
    asset_id: int = Path(..., ge=1),
    ttl: int = Query(3600, ge=60, le=3600)
):
    if not s3_client:
        raise HTTPException(status_code=503, detail="S3 service is unavailable.")
    asset = crud_access_asset.get(db=db, id=asset_id)
    if not asset or not asset.s3_directory or not asset.s3_filename:
        raise HTTPException(status_code=404, detail="Access asset or S3 file information not found")
    try:
        s3_key = f"{asset.s3_directory}/{asset.s3_filename}"
        presigned_url = s3_client.generate_presigned_url(
            'get_object',
            Params={
                'Bucket': S3_BUCKET,
                'Key': s3_key,
                'ResponseContentDisposition': f'attachment; filename="{asset.original_filename or asset.s3_filename}"',
            },
            ExpiresIn=ttl
        )
        return {"url": presigned_url, "expires_in": ttl}
    except ClientError as e:
        logger.error(f"Failed to generate presigned URL for GET: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate download URL")


@router.post("/{asset_id}/upload-url", response_model=PresignedUrlResponse)
def get_asset_upload_url(
    *,
    db: Session = Depends(get_session),  # get_db → get_session
    current_user: User = Depends(get_current_user),  # 인증 추가
    asset_id: int = Path(..., ge=1),
    filename: str = Body(..., embed=True),
    content_type: str = Body(..., embed=True),
    ttl: int = Query(3600, ge=60, le=3600)
):
    if not s3_client:
        raise HTTPException(status_code=503, detail="S3 service is unavailable.")
    asset = crud_access_asset.get(db=db, id=asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Access asset not found")
    file_ext = os.path.splitext(filename)[1].lower() if filename else ".unknown"
    new_s3_filename = f"{uuid.uuid4()}{file_ext}"
    s3_key = f"{asset.s3_directory}/{new_s3_filename}"
    try:
        presigned_url = s3_client.generate_presigned_url(
            'put_object',
            Params={
                'Bucket': S3_BUCKET,
                'Key': s3_key,
                'ContentType': content_type,
            },
            ExpiresIn=ttl,
            HttpMethod='PUT'
        )
        return {"url": presigned_url, "s3_key": s3_key, "new_s3_filename": new_s3_filename, "expires_in": ttl}
    except ClientError as e:
        logger.error(f"Failed to generate presigned URL for PUT: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate upload URL")


@router.put("/{asset_id}/file-info", response_model=AccessAssetResponse)
def update_asset_file_info_after_upload(
    *,
    db: Session = Depends(get_session),  # get_db → get_session
    current_user: User = Depends(get_current_user),  # 인증 추가
    asset_id: int = Path(..., ge=1),
    original_filename: str = Body(..., embed=True),
    s3_filename: str = Body(..., embed=True),
    file_size: int = Body(..., embed=True, ge=0),
    file_type: str = Body(..., embed=True)
):
    asset = crud_access_asset.get(db=db, id=asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Access asset not found")
    updated_asset = crud_access_asset.update_file_info(
        db=db,
        db_obj=asset,
        original_filename=original_filename,
        s3_filename=s3_filename,
        s3_directory=asset.s3_directory,
        file_size=file_size,
        file_type=simplify_file_type(file_type)
    )
    return updated_asset


# 메모 관련 엔드포인트
@router.post("/{asset_id}/memos", response_model=AccessAssetMemoInDB)
def create_asset_memo(
    *,
    db: Session = Depends(get_session),  # get_db → get_session
    current_user: User = Depends(get_current_user),  # 인증 추가
    asset_id: int = Path(..., ge=1),
    memo_in: AccessAssetMemoCreate
):
    asset = crud_access_asset.get(db=db, id=asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Access asset not found")
    memo = crud_access_asset.add_memo(db=db, asset_id=asset_id, memo_in=memo_in)
    return memo


@router.delete("/{asset_id}/memos/{memo_id}", status_code=204)
def delete_asset_memo(
    *,
    db: Session = Depends(get_session),  # get_db → get_session
    current_user: User = Depends(get_current_user),  # 인증 추가
    asset_id: int = Path(..., ge=1),
    memo_id: int = Path(..., ge=1)
):
    memo = db.get(AccessAssetMemoInDB, memo_id) 
    if not memo or memo.access_asset_id != asset_id:
        raise HTTPException(status_code=404, detail="Memo not found or does not belong to this asset")
    db.delete(memo)
    db.commit()
    return None


# 크레디트 관련 엔드포인트
@router.put("/{asset_id}/credits", response_model=AccessAssetResponse)
def update_asset_credits(
    *,
    db: Session = Depends(get_session),  # get_db → get_session
    current_user: User = Depends(get_current_user),  # 인증 추가
    asset_id: int = Path(..., ge=1),
    credits_in: List[AccessAssetCreditCreate]
):
    asset = crud_access_asset.get_with_relations(db=db, id=asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Access asset not found")
    if asset.credits:
        for credit_db_obj in list(asset.credits):
            db.delete(credit_db_obj)
    for credit_create_schema in credits_in:
        crud_access_asset.add_credit(db=db, asset_id=asset_id, credit_in=credit_create_schema)
    db.commit()
    db.refresh(asset)
    
    # 프로덕션 프로젝트 자동 생성 체크
    project_service = ProductionProjectService(db)
    project_service.check_and_create_for_asset(asset_id)
    
    return asset


@router.get("/{asset_id}/detail", response_model=AccessAssetDetailResponse)
def get_asset_detail(
    asset_id: int = Path(..., ge=1),
    db: Session = Depends(get_session),  # get_db → get_session
    current_user: User = Depends(get_current_user)  # 인증 추가
):
    asset_data = access_asset_service.get_asset_with_relations(db, asset_id)
    if not asset_data:
        raise HTTPException(status_code=404, detail="Access asset not found")
    return asset_data


@router.put("/{asset_id}/status", response_model=AccessAssetResponse)
def update_publishing_status_endpoint(
    asset_id: int = Path(..., ge=1),
    status: str = Body(..., embed=True, min_length=1),
    db: Session = Depends(get_session),  # get_db → get_session
    current_user: User = Depends(get_current_user)  # 인증 추가
):
    valid_statuses = ["draft", "review", "published", "archived"]
    if status not in valid_statuses:
        raise HTTPException(status_code=422, detail=f"Invalid status. Must be one of: {valid_statuses}")
    updated_asset = access_asset_service.update_publishing_status(db, asset_id, status)
    if not updated_asset:
        raise HTTPException(status_code=404, detail="Access asset not found")
    return updated_asset


@router.put("/{asset_id}/lock", response_model=AccessAssetResponse)
def toggle_lock_status_endpoint(
    asset_id: int = Path(..., ge=1),
    is_locked: bool = Body(..., embed=True),
    db: Session = Depends(get_session),  # get_db → get_session
    current_user: User = Depends(get_current_user)  # 인증 추가
):
    updated_asset = access_asset_service.toggle_lock_status(db, asset_id, is_locked)
    if not updated_asset:
        raise HTTPException(status_code=404, detail="Access asset not found")
    return updated_asset


@router.get("/{asset_id}/credits", response_model=List[AccessAssetCreditInDB])
def get_asset_credits(
    *,
    db: Session = Depends(get_session),  # get_db → get_session
    current_user: User = Depends(get_current_user),  # 인증 추가
    asset_id: int = Path(..., ge=1)
):
    """접근성 미디어 자산의 크레디트 목록 조회"""
    asset = crud_access_asset.get(db=db, id=asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Access asset not found")
    
    credits = db.query(AccessAssetCredit)\
        .filter(AccessAssetCredit.access_asset_id == asset_id)\
        .order_by(AccessAssetCredit.sequence_number)\
        .all()
    
    for credit in credits:
        load_credit_relations(db, credit)
    
    return credits


@router.post("/{asset_id}/credits", response_model=AccessAssetCreditInDB, status_code=201)
def create_asset_credit(
    *,
    db: Session = Depends(get_session),  # get_db → get_session
    current_user: User = Depends(get_current_user),  # 인증 추가
    asset_id: int = Path(..., ge=1),
    credit_in: AccessAssetCreditCreate
):
    """접근성 미디어 자산에 크레디트 추가"""
    asset = crud_access_asset.get(db=db, id=asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Access asset not found")
    
    credit_data = credit_in.model_dump()
    credit_data['access_asset_id'] = asset_id
    
    if credit_in.person_type == 'scriptwriter':
        credit_data['scriptwriter_id'] = credit_in.person_id
        if not db.get(Scriptwriter, credit_in.person_id):
            raise HTTPException(status_code=404, detail="Scriptwriter not found")
    elif credit_in.person_type == 'voice_artist':
        credit_data['voice_artist_id'] = credit_in.person_id
        if not db.get(VoiceArtist, credit_in.person_id):
            raise HTTPException(status_code=404, detail="Voice artist not found")
    elif credit_in.person_type == 'sl_interpreter':
        credit_data['sl_interpreter_id'] = credit_in.person_id
        if not db.get(SLInterpreter, credit_in.person_id):
            raise HTTPException(status_code=404, detail="SL interpreter not found")
    elif credit_in.person_type == 'staff':
        credit_data['staff_id'] = credit_in.person_id
        if not db.get(Staff, credit_in.person_id):
            raise HTTPException(status_code=404, detail="Staff not found")
    
    db_credit = AccessAssetCredit(**credit_data)
    db.add(db_credit)
    db.commit()
    db.refresh(db_credit)
    
    load_credit_relations(db, db_credit)
    
    # 프로덕션 프로젝트 자동 생성 체크
    project_service = ProductionProjectService(db)
    project_service.check_and_create_for_asset(asset_id)
    
    return db_credit


@router.put("/{asset_id}/credits/reorder", response_model=List[AccessAssetCreditInDB])
def reorder_asset_credits(
    *,
    db: Session = Depends(get_session),  # get_db → get_session
    current_user: User = Depends(get_current_user),  # 인증 추가
    asset_id: int = Path(..., ge=1),
    reorder_data: Dict[str, List[int]] = Body(..., example={"creditIds": [3, 1, 2, 4]})
):
    """접근성 미디어 자산의 크레디트 순서 변경"""
    asset = crud_access_asset.get(db=db, id=asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Access asset not found")
    
    credit_ids = reorder_data.get("creditIds", [])
    if not credit_ids:
        raise HTTPException(status_code=422, detail="creditIds field is required")
    
    credits = db.query(AccessAssetCredit)\
        .filter(AccessAssetCredit.access_asset_id == asset_id)\
        .all()
    
    credit_dict = {credit.id: credit for credit in credits}
    
    for index, credit_id in enumerate(credit_ids):
        if credit_id not in credit_dict:
            raise HTTPException(
                status_code=422, 
                detail=f"Credit ID {credit_id} does not belong to this asset"
            )
        credit_dict[credit_id].sequence_number = index + 1
    
    db.commit()
    
    updated_credits = db.query(AccessAssetCredit)\
        .filter(AccessAssetCredit.access_asset_id == asset_id)\
        .order_by(AccessAssetCredit.sequence_number)\
        .all()
    
    for credit in updated_credits:
        load_credit_relations(db, credit)
    
    return updated_credits


@router.put("/{asset_id}/credits/{credit_id}", response_model=AccessAssetCreditInDB)
def update_asset_credit(
    *,
    db: Session = Depends(get_session),  # get_db → get_session
    current_user: User = Depends(get_current_user),  # 인증 추가
    asset_id: int = Path(..., ge=1),
    credit_id: int = Path(..., ge=1),
    credit_in: Dict[str, Any] = Body(...)
):
    """접근성 미디어 자산의 크레디트 수정 (역할, 메모만 수정 가능)"""
    credit = db.query(AccessAssetCredit)\
        .filter(AccessAssetCredit.id == credit_id)\
        .filter(AccessAssetCredit.access_asset_id == asset_id)\
        .first()
    
    if not credit:
        raise HTTPException(status_code=404, detail="Credit not found")
    
    update_data = credit_in
    for field, value in update_data.items():
        setattr(credit, field, value)
    
    db.commit()
    db.refresh(credit)
    
    load_credit_relations(db, credit)
    
    return credit


@router.delete("/{asset_id}/credits/{credit_id}", status_code=204)
def delete_asset_credit(
    *,
    db: Session = Depends(get_session),  # get_db → get_session
    current_user: User = Depends(get_current_user),  # 인증 추가
    asset_id: int = Path(..., ge=1),
    credit_id: int = Path(..., ge=1)
):
    """접근성 미디어 자산의 크레디트 삭제"""
    credit = db.query(AccessAssetCredit)\
        .filter(AccessAssetCredit.id == credit_id)\
        .filter(AccessAssetCredit.access_asset_id == asset_id)\
        .first()
    
    if not credit:
        raise HTTPException(status_code=404, detail="Credit not found")
    
    db.delete(credit)
    db.commit()
    
    return None
