from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlmodel import Session
from app import crud, schemas
from app.db import get_db
from app.services.s3_service import S3Service
from app.dependencies.s3 import get_s3_service
import os
import uuid

# 라우터 정의 추가
router = APIRouter(
    prefix="/admin/api/access-guidelines",
    tags=["Admin - Access Guidelines"]
)

# 가이드라인 생성
@router.post("", response_model=schemas.AccessGuideline)
def create_access_guideline(
    guideline: schemas.AccessGuidelineCreate,
    db: Session = Depends(get_db)
):
    return crud.access_guideline.create(db, obj_in=guideline)

# 가이드라인 상세 조회
@router.get("/{guideline_id}", response_model=schemas.AccessGuideline)
def read_access_guideline(
    guideline_id: int,
    db: Session = Depends(get_db)
):
    guideline = crud.access_guideline.get(db, id=guideline_id)
    if not guideline:
        raise HTTPException(status_code=404, detail="Guideline not found")
    return guideline

# 가이드라인 수정
@router.put("/{guideline_id}", response_model=schemas.AccessGuideline)
def update_access_guideline(
    guideline_id: int,
    guideline_in: schemas.AccessGuidelineUpdate,
    db: Session = Depends(get_db)
):
    guideline = crud.access_guideline.get(db, id=guideline_id)
    if not guideline:
        raise HTTPException(status_code=404, detail="Guideline not found")
    return crud.access_guideline.update(db, db_obj=guideline, obj_in=guideline_in)

# 가이드라인 삭제
@router.delete("/{guideline_id}", response_model=schemas.AccessGuideline)
def delete_access_guideline(
    guideline_id: int,
    db: Session = Depends(get_db)
):
    guideline = crud.access_guideline.get(db, id=guideline_id)
    if not guideline:
        raise HTTPException(status_code=404, detail="Guideline not found")
    return crud.access_guideline.remove(db, id=guideline_id)

# 파일 업로드
@router.post("/{guideline_id}/file", response_model=schemas.AccessGuideline)
async def upload_guideline_file(  # <-- 비동기 함수로 변경
    guideline_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    s3_service: S3Service = Depends(get_s3_service)
):
    guideline = crud.access_guideline.get(db, id=guideline_id)
    if not guideline:
        raise HTTPException(status_code=404, detail="Guideline not found")

    # 기존 파일이 있으면 삭제
    if guideline.attachment_file_id:
        old_file = crud.file_asset.get(db, id=guideline.attachment_file_id)
        if old_file:
            s3_service.delete_file(old_file.s3_key, old_file.is_public)
            crud.file_asset.remove(db, id=old_file.id)

    # 디렉토리 및 파일명 설정
    directory = f"guidelines/{guideline.type}"
    ext = os.path.splitext(file.filename)[1]
    unique_filename = f"{uuid.uuid4()}{ext}"
    key = f"{directory}/{unique_filename}"

    # S3에 파일 업로드
    upload_result = await s3_service.direct_upload(file, key, is_public=True)  # <-- await 키워드 사용

    # 파일 에셋 메타데이터 저장
    file_data = schemas.FileAssetCreate(
        s3_key=upload_result["key"],
        s3_bucket=upload_result["bucket"],
        original_filename=upload_result["original_filename"],
        content_type=upload_result["content_type"],
        file_size=upload_result["size"],
        is_public=True,
        entity_type="guideline",
        entity_id=guideline_id,
        usage_type="attachment"
    )

    file_asset = crud.file_asset.create(db, obj_in=file_data)

    # 가이드라인 업데이트
    update_data = {
        "attachment": upload_result.get("url"),
        "attachment_file_id": file_asset.id
    }

    return crud.access_guideline.update(
        db, db_obj=guideline, obj_in=schemas.AccessGuidelineUpdate(**update_data)
    )

# 파일 삭제
@router.delete("/{guideline_id}/file", response_model=schemas.AccessGuideline)
def delete_guideline_file(
    guideline_id: int,
    db: Session = Depends(get_db),
    s3_service: S3Service = Depends(get_s3_service)
):
    guideline = crud.access_guideline.get(db, id=guideline_id)
    if not guideline:
        raise HTTPException(status_code=404, detail="Guideline not found")

    if guideline.attachment_file_id:
        file_asset = crud.file_asset.get(db, id=guideline.attachment_file_id)
        if file_asset:
            # S3에서 파일 삭제
            s3_service.delete_file(file_asset.s3_key, file_asset.is_public)
            # DB에서 파일 에셋 삭제
            crud.file_asset.remove(db, id=file_asset.id)

    # 가이드라인 업데이트
    update_data = {
        "attachment": None,
        "attachment_file_id": None
    }

    return crud.access_guideline.update(
        db, db_obj=guideline, obj_in=schemas.AccessGuidelineUpdate(**update_data)
    )
