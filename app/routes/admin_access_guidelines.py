# app/routes/admin_access_guidelines.py
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query, Path, Form, Body
from fastapi.responses import JSONResponse
from sqlmodel import Session, select
from typing import List, Optional
from app import crud, schemas
from app.db import get_db
from app.models.access_guideline import AccessGuideline, AccessGuidelineContent, AccessGuidelineFeedback, AccessGuidelineMemo
from app.models.file_assets import FileAsset  # 추가
from app.services.s3_service import S3Service
import boto3
from botocore.exceptions import ClientError
import os
import uuid
import logging
from datetime import datetime

# 로거 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/admin/api/access-guidelines",
    tags=["Admin - Access Guidelines"]
)

# S3 설정
S3_BUCKET = os.getenv("PUBLIC_BUCKET_NAME")
AWS_REGION = os.getenv("AWS_REGION", "ap-northeast-2")

# S3 클라이언트 생성
try:
    s3_client = boto3.client('s3', region_name=AWS_REGION)
    logger.info(f"S3 client created successfully for region {AWS_REGION}.")
except Exception as e:
    logger.error(f"Failed to create S3 client: {e}")
    s3_client = None

# S3 서비스 의존성
def get_s3_service():
    return S3Service()

# --- API 엔드포인트 ---

@router.get("", response_model=List[schemas.AccessGuidelineSummary])
def read_access_guidelines(
    db: Session = Depends(get_db),
    skip: int = Query(0, ge=0, description="Number of records to skip for pagination"),
    limit: int = Query(100, ge=1, le=200, description="Maximum number of records to return"),
    keyword: Optional[str] = Query(None, description="Search keyword for guideline name"),
    type: Optional[str] = Query(None, pattern="^(AD|CC|SL)$", description="Filter by type (AD, CC, SL)")
):
    """
    접근성 가이드라인 목록 조회 (요약 정보).
    - 키워드(이름) 검색 또는 타입 필터링 지원.
    """
    try:
        if keyword:
            summaries = crud.access_guideline.search_summary(db, keyword=keyword, skip=skip, limit=limit)
        elif type:
            summaries = crud.access_guideline.get_by_type_summary(db, type=type, skip=skip, limit=limit)
        else:
            summaries = crud.access_guideline.get_multi_summary(db, skip=skip, limit=limit)

        return summaries
    except Exception as e:
        logger.error(f"Error reading access guidelines: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error while reading access guidelines.")

@router.get("/{guideline_id}", response_model=schemas.AccessGuideline)
def read_access_guideline(
    guideline_id: int = Path(..., ge=1),
    db: Session = Depends(get_db)
):
    """
    접근성 가이드라인 상세 조회
    """
    try:
        guideline = crud.access_guideline.get(db, id=guideline_id)
        if not guideline:
            raise HTTPException(status_code=404, detail="가이드라인을 찾을 수 없습니다.")
        return guideline
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error reading access guideline {guideline_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="가이드라인 조회 중 오류가 발생했습니다.")

@router.post("", response_model=schemas.AccessGuideline)
def create_access_guideline(
    guideline_in: schemas.AccessGuidelineCreate,
    db: Session = Depends(get_db)
):
    """접근성 가이드라인 생성"""
    try:
        # 로깅 추가
        logger.info(f"Creating guideline with data: {guideline_in.dict()}")
        
        # contents, feedbacks, memos 임시 저장
        contents = guideline_in.contents if hasattr(guideline_in, 'contents') else []
        feedbacks = guideline_in.feedbacks if hasattr(guideline_in, 'feedbacks') else []
        memos = guideline_in.memos if hasattr(guideline_in, 'memos') else []
        
        # 기본 필드만 포함하는 새 객체 생성
        guideline_data = guideline_in.dict(exclude={'contents', 'feedbacks', 'memos'})
        
        # 현재 시간 명시적 설정
        now = datetime.now()
        
        # AccessGuideline 객체 생성 및 저장
        guideline = AccessGuideline(
            **guideline_data,
            created_at=now,
            updated_at=now
        )
        
        db.add(guideline)
        db.flush()  # ID 생성을 위해 flush
        
        # 관련 항목 생성 및 연결
        for i, content in enumerate(contents):
            content_obj = AccessGuidelineContent(
                guideline_id=guideline.id,
                category=content.category,
                content=content.content,
                sequence_number=i+1,
                created_at=now
            )
            db.add(content_obj)
        
        for i, feedback in enumerate(feedbacks):
            feedback_obj = AccessGuidelineFeedback(
                guideline_id=guideline.id,
                feedback_type=feedback.feedback_type,
                content=feedback.content,
                sequence_number=i+1,
                created_at=now
            )
            db.add(feedback_obj)
        
        for memo in memos:
            memo_obj = AccessGuidelineMemo(
                guideline_id=guideline.id,
                content=memo.content,
                created_at=now
            )
            db.add(memo_obj)
            
        db.commit()
        db.refresh(guideline)
        
        logger.info(f"Successfully created guideline with ID: {guideline.id}")
        return guideline
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating guideline: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"가이드라인 생성 중 오류가 발생했습니다: {str(e)}")

@router.put("/{guideline_id}", response_model=schemas.AccessGuideline)
def update_access_guideline(
    guideline_in: schemas.AccessGuidelineUpdate,
    guideline_id: int = Path(..., ge=1),
    db: Session = Depends(get_db)
):
    """
    접근성 가이드라인 수정
    """
    try:
        guideline = crud.access_guideline.get(db, id=guideline_id)
        if not guideline:
            raise HTTPException(status_code=404, detail="가이드라인을 찾을 수 없습니다.")
        
        # 현재 시간 명시적 설정
        now = datetime.now()
        
        # 기본 데이터 업데이트 (contents, feedbacks, memos 제외)
        update_data = {k: v for k, v in guideline_in.dict(exclude_unset=True).items() 
                       if k not in ["contents", "feedbacks", "memos"]}
        
        # 기본 필드 업데이트
        for key, value in update_data.items():
            setattr(guideline, key, value)
        
        guideline.updated_at = now
        db.add(guideline)
        db.flush()  # 기본 데이터 먼저 업데이트
        
        # 관련 항목 업데이트 - synchronize_session=False 추가
        if hasattr(guideline_in, "contents") and guideline_in.contents is not None:
            # 기존 항목 모두 삭제
            db.query(AccessGuidelineContent).filter(
                AccessGuidelineContent.guideline_id == guideline_id
            ).delete(synchronize_session=False)
            db.flush()
            
            # 새 항목 추가
            for i, content in enumerate(guideline_in.contents):
                content_obj = AccessGuidelineContent(
                    guideline_id=guideline_id,
                    category=content.category,
                    content=content.content,
                    sequence_number=i+1,
                    created_at=now
                )
                db.add(content_obj)
            db.flush()
        
        if hasattr(guideline_in, "feedbacks") and guideline_in.feedbacks is not None:
            # 기존 항목 삭제
            db.query(AccessGuidelineFeedback).filter(
                AccessGuidelineFeedback.guideline_id == guideline_id
            ).delete(synchronize_session=False)
            db.flush()
            
            # 새 항목 추가
            for i, feedback in enumerate(guideline_in.feedbacks):
                feedback_obj = AccessGuidelineFeedback(
                    guideline_id=guideline_id,
                    feedback_type=feedback.feedback_type,
                    content=feedback.content,
                    sequence_number=i+1,
                    created_at=now
                )
                db.add(feedback_obj)
            db.flush()
        
        if hasattr(guideline_in, "memos") and guideline_in.memos is not None:
            # 기존 항목 삭제
            db.query(AccessGuidelineMemo).filter(
                AccessGuidelineMemo.guideline_id == guideline_id
            ).delete(synchronize_session=False)
            db.flush()
            
            # 새 항목 추가
            for memo in guideline_in.memos:
                memo_obj = AccessGuidelineMemo(
                    guideline_id=guideline_id,
                    content=memo.content,
                    created_at=now
                )
                db.add(memo_obj)
            db.flush()
        
        # 최종 커밋
        db.commit()
        
        # 새로운 세션에서 가이드라인 다시 가져오기
        guideline = crud.access_guideline.get(db, id=guideline_id)
        return guideline
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating access guideline {guideline_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"가이드라인 수정 중 오류가 발생했습니다: {str(e)}")

@router.put("/{guideline_id}/attachment", response_model=schemas.AccessGuideline)
def update_guideline_attachment(
    guideline_id: int = Path(..., ge=1),
    file_id: int = Body(...),
    db: Session = Depends(get_db)
):
    """가이드라인 첨부파일 연결"""
    try:
        guideline = crud.access_guideline.get(db, id=guideline_id)
        if not guideline:
            raise HTTPException(status_code=404, detail="가이드라인을 찾을 수 없습니다")
            
        # 파일 에셋 조회
        file_asset = db.get(FileAsset, file_id)
        if not file_asset:
            raise HTTPException(status_code=404, detail="파일을 찾을 수 없습니다")
            
        # 임시 ID 처리
        if file_asset.entity_id < 0 and file_asset.entity_type == "guideline":
            # 실제 guideline_id로 업데이트
            file_asset.entity_id = guideline_id
            db.add(file_asset)
            
        # 가이드라인에 파일 연결
        guideline.attachment_file_id = file_id
        guideline.attachment = file_asset.s3_key
        
        db.add(guideline)
        db.commit()
        db.refresh(guideline)
        
        logger.info(f"Attached file {file_id} to guideline {guideline_id}")
        return guideline
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error attaching file to guideline {guideline_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"첨부파일 연결 중 오류가 발생했습니다: {str(e)}")

@router.delete("/{guideline_id}")
def delete_access_guideline(
    guideline_id: int = Path(..., ge=1),
    db: Session = Depends(get_db),
    s3_service: S3Service = Depends(get_s3_service)
):
    """
    접근성 가이드라인 삭제
    """
    try:
        guideline = crud.access_guideline.get(db, id=guideline_id)
        if not guideline:
            raise HTTPException(status_code=404, detail="가이드라인을 찾을 수 없습니다.")
        
        # 첨부 파일이 있으면 S3에서 삭제
        if guideline.attachment_file_id:
            attachment_file = db.get(guideline.attachment_file.__class__, guideline.attachment_file_id)
            if attachment_file:
                try:
                    s3_service.delete_file(attachment_file.s3_key, attachment_file.is_public)
                    db.delete(attachment_file)
                    logger.info(f"Deleted attachment file for guideline {guideline_id}")
                except Exception as e:
                    logger.error(f"Failed to delete S3 file: {e}")
        
        # 관련 항목 삭제
        db.query(AccessGuidelineContent).filter(
            AccessGuidelineContent.guideline_id == guideline_id
        ).delete()
        
        db.query(AccessGuidelineFeedback).filter(
            AccessGuidelineFeedback.guideline_id == guideline_id
        ).delete()
        
        db.query(AccessGuidelineMemo).filter(
            AccessGuidelineMemo.guideline_id == guideline_id
        ).delete()
        
        # 가이드라인 레코드 삭제
        db.delete(guideline)
        db.commit()
        
        return {"message": "가이드라인이 성공적으로 삭제되었습니다."}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting access guideline {guideline_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"가이드라인 삭제 중 오류가 발생했습니다: {str(e)}")

@router.delete("/{guideline_id}/file")
def delete_guideline_file(
    guideline_id: int = Path(..., ge=1),
    db: Session = Depends(get_db),
    s3_service: S3Service = Depends(get_s3_service)
):
    """
    접근성 가이드라인 첨부 파일 삭제
    """
    try:
        guideline = crud.access_guideline.get(db, id=guideline_id)
        if not guideline:
            raise HTTPException(status_code=404, detail="가이드라인을 찾을 수 없습니다.")
        
        if not guideline.attachment_file_id:
            raise HTTPException(status_code=404, detail="첨부 파일이 없습니다.")
        
        # S3에서 파일 삭제
        attachment_file = db.get(guideline.attachment_file.__class__, guideline.attachment_file_id)
        if attachment_file:
            s3_service.delete_file(attachment_file.s3_key, attachment_file.is_public)
            
            # 관계 끊기
            guideline.attachment_file_id = None
            guideline.attachment = None
            db.add(guideline)
            
            # 파일 에셋 삭제
            db.delete(attachment_file)
            db.commit()
            
            return {"message": "첨부 파일이 성공적으로 삭제되었습니다."}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting guideline file for {guideline_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"첨부 파일 삭제 중 오류가 발생했습니다: {str(e)}")
