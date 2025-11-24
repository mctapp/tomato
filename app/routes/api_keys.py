# app/routes/api_keys.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select
from app.db import get_session
from app.dependencies.auth import get_current_active_user
from app.models.users import User
from app.models.api_keys import APIKey, APIKeyType, APIKeyStatus, APIKeyScope
from app.api.keys.generator import api_key_generator
from app.api.keys.rotation import key_rotation_manager
from app.api.keys.analytics import api_key_analytics
from app.api.keys.permissions import api_key_permission_manager
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

router = APIRouter(prefix="/api/keys", tags=["API Keys"])

class APIKeyCreate(BaseModel):
    name: str
    description: Optional[str] = None
    key_type: APIKeyType = APIKeyType.PERSONAL
    scopes: List[APIKeyScope]
    expires_in_days: Optional[int] = 365
    rate_limit_per_minute: int = 100
    rate_limit_per_day: Optional[int] = None
    allowed_ips: Optional[List[str]] = None
    allowed_origins: Optional[List[str]] = None

class APIKeyResponse(BaseModel):
    id: int
    name: str
    key_prefix: str
    key_type: APIKeyType
    status: APIKeyStatus
    scopes: List[str]
    created_at: datetime
    expires_at: Optional[datetime]
    last_used_at: Optional[datetime]
    request_count: int

class APIKeyCreateResponse(APIKeyResponse):
    api_key: str  # 전체 키 (생성시에만 반환)

@router.post("", response_model=APIKeyCreateResponse)
async def create_api_key(
    key_data: APIKeyCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_session)
):
    """API 키 생성"""
    # 권한 확인
    if not api_key_permission_manager.can_create_key(current_user, key_data.scopes):
        raise HTTPException(
            status_code=403,
            detail="Insufficient permissions to create key with requested scopes"
        )
    
    # 키 생성
    api_key, full_key = await api_key_generator.create_api_key(
        db=db,
        user=current_user,
        **key_data.dict()
    )
    
    # 응답 생성
    response = APIKeyCreateResponse(
        id=api_key.id,
        name=api_key.name,
        key_prefix=api_key.key_prefix,
        key_type=api_key.key_type,
        status=api_key.status,
        scopes=json.loads(api_key.scopes),
        created_at=api_key.created_at,
        expires_at=api_key.expires_at,
        last_used_at=api_key.last_used_at,
        request_count=api_key.request_count,
        api_key=full_key
    )
    
    return response

@router.get("", response_model=List[APIKeyResponse])
async def list_api_keys(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_session),
    status: Optional[APIKeyStatus] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100)
):
    """API 키 목록 조회"""
    query = select(APIKey).where(APIKey.user_id == current_user.id)
    
    if status:
        query = query.where(APIKey.status == status)
    
    query = query.offset(skip).limit(limit)
    api_keys = db.exec(query).all()
    
    return [
        APIKeyResponse(
            id=key.id,
            name=key.name,
            key_prefix=key.key_prefix,
            key_type=key.key_type,
            status=key.status,
            scopes=json.loads(key.scopes),
            created_at=key.created_at,
            expires_at=key.expires_at,
            last_used_at=key.last_used_at,
            request_count=key.request_count
        )
        for key in api_keys
    ]

@router.delete("/{key_id}")
async def revoke_api_key(
    key_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_session)
):
    """API 키 폐기"""
    api_key = db.get(APIKey, key_id)
    
    if not api_key:
        raise HTTPException(status_code=404, detail="API key not found")
    
    if api_key.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # 키 폐기
    api_key.status = APIKeyStatus.REVOKED
    api_key.revoked_at = datetime.utcnow()
    
    db.add(api_key)
    db.commit()
    
    # 캐시 무효화
    await key_rotation_manager._invalidate_key_cache(api_key)
    
    return {"message": "API key revoked successfully"}

@router.post("/{key_id}/rotate", response_model=APIKeyCreateResponse)
async def rotate_api_key(
    key_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_session),
    extend_grace_period: bool = True
):
    """API 키 순환"""
    old_key = db.get(APIKey, key_id)
    
    if not old_key:
        raise HTTPException(status_code=404, detail="API key not found")
    
    if old_key.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # 키 순환
    new_key, full_key = await key_rotation_manager.rotate_key(
        db, old_key, extend_grace_period
    )
    
    return APIKeyCreateResponse(
        id=new_key.id,
        name=new_key.name,
        key_prefix=new_key.key_prefix,
        key_type=new_key.key_type,
        status=new_key.status,
        scopes=json.loads(new_key.scopes),
        created_at=new_key.created_at,
        expires_at=new_key.expires_at,
        last_used_at=new_key.last_used_at,
        request_count=new_key.request_count,
        api_key=full_key
    )

@router.get("/{key_id}/stats")
async def get_api_key_stats(
    key_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_session),
    period: str = Query("24h", regex="^(1h|24h|7d|30d)$")
):
    """API 키 사용 통계"""
    api_key = db.get(APIKey, key_id)
    
    if not api_key:
        raise HTTPException(status_code=404, detail="API key not found")
    
    if api_key.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # 통계 조회
    stats = await api_key_analytics.get_usage_stats(db, api_key, period)
    
    return stats
