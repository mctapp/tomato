# app/routes/admin_media_access.py
from fastapi import APIRouter, Depends, HTTPException, Path, Query, Body
from sqlmodel import Session
from typing import List, Optional, Dict, Any
from datetime import datetime
from app.db import get_db
from app.services.media_access_service import media_access_service
from app.schemas.media_access import (
    MediaAccessRequestCreate,
    MediaAccessRequestUpdate,
    MediaAccessRequestResponse
)
from app.models.media_access import MediaAccessRequest

router = APIRouter(
    prefix="/admin/api/media-access",
    tags=["Admin - Media Access"]
)

@router.post("/{media_id}/request", response_model=MediaAccessRequestResponse)
def create_access_request(
    media_id: int = Path(...),
    request_data: MediaAccessRequestCreate = Body(...),
    db: Session = Depends(get_db)
):
    """
    접근성 미디어 자산에 대한 접근 요청 생성
    """
    try:
        request = media_access_service.create_access_request(
            db=db,
            media_id=media_id,
            user_id=request_data.user_id,
            device_id=request_data.device_id,
            request_reason=request_data.request_reason
        )
        
        return request
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create access request: {str(e)}")

@router.get("/requests", response_model=List[MediaAccessRequestResponse])
def get_access_requests(
    media_id: Optional[int] = Query(None),
    user_id: Optional[int] = Query(None),
    device_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """
    접근 요청 목록 조회
    """
    try:
        requests = media_access_service.get_access_requests(
            db=db,
            media_id=media_id,
            user_id=user_id,
            device_id=device_id,
            status=status,
            skip=skip,
            limit=limit
        )
        
        return requests
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get access requests: {str(e)}")

@router.put("/requests/{request_id}", response_model=MediaAccessRequestResponse)
def process_access_request(
    request_id: int = Path(...),
    update_data: MediaAccessRequestUpdate = Body(...),
    db: Session = Depends(get_db)
):
    """
    접근 요청 처리 (승인 또는 거부)
    """
    try:
        if not update_data.admin_id:
            raise HTTPException(status_code=400, detail="admin_id is required")
            
        request = media_access_service.process_access_request(
            db=db,
            request_id=request_id,
            status=update_data.status,
            admin_id=update_data.admin_id,
            admin_notes=update_data.admin_notes,
            expiry_date=update_data.expiry_date
        )
        
        return request
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process access request: {str(e)}")

@router.get("/{media_id}/check", response_model=Dict[str, Any])
def check_access_permission(
    media_id: int = Path(...),
    user_id: Optional[int] = Query(None),
    device_id: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    미디어 자산에 대한 접근 권한 확인
    """
    try:
        permission = media_access_service.check_access_permission(
            db=db,
            media_id=media_id,
            user_id=user_id,
            device_id=device_id
        )
        
        return permission
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to check access permission: {str(e)}")

@router.put("/{media_id}/lock", response_model=Dict[str, Any])
def toggle_lock_status(
    media_id: int = Path(...),
    is_locked: bool = Body(..., embed=True),
    admin_id: Optional[int] = Body(None, embed=True),
    db: Session = Depends(get_db)
):
    """
    접근성 미디어 자산의 잠금 상태 토글
    """
    try:
        asset = media_access_service.toggle_lock(
            db=db,
            media_id=media_id,
            is_locked=is_locked,
            admin_id=admin_id
        )
        
        return {
            "media_id": asset.id,
            "is_locked": asset.is_locked,
            "updated_at": asset.updated_at
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to toggle lock status: {str(e)}")
