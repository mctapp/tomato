# app/routes/user_preferences.py
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlmodel import Session, select
from typing import Dict, Any, Optional
from app.db import get_session
from app.models.user_preference import UserPreference
from app.schemas.user_preference import UserPreferenceCreate, UserPreferenceUpdate, UserPreferenceResponse
from app.dependencies.auth import get_current_user
from app.models.users import User

router = APIRouter(
    prefix="/api/user-preferences",
    tags=["user-preferences"]  # 소문자로 변경
)

@router.get("", response_model=Optional[UserPreferenceResponse])
async def get_user_preference(
    preference_type: str = Query(..., description="Preference type to retrieve"),
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """사용자 설정 조회"""
    statement = select(UserPreference).where(
        UserPreference.user_id == current_user.id,
        UserPreference.preference_type == preference_type
    )
    preference = db.exec(statement).first()
    
    if not preference:
        # 404 대신 None 반환 - 프론트엔드에서 처리하기 쉽게
        return None
    
    # 프론트엔드 필드명 형식으로 변환
    if preference_type == "dashboard_layout" and preference.preference_data:
        data = preference.preference_data.copy()
        
        # 필드명 변환: collapsedCards -> collapsedCardIds
        if "collapsedCards" in data and "collapsedCardIds" not in data:
            data["collapsedCardIds"] = data.pop("collapsedCards")
        
        # 필드명 변환: visibleCards -> visibleCardIds
        if "visibleCards" in data and "visibleCardIds" not in data:
            data["visibleCardIds"] = data.pop("visibleCards")
        
        # cardOrder 필드가 없으면 빈 배열 추가
        if "cardOrder" not in data:
            data["cardOrder"] = []
            
        # 필수 필드 확인 및 추가
        if "visibleCardIds" not in data and "visibleCards" not in data:
            # 기본적으로 모든 카드가 보이도록 cardOrder의 값을 복사
            data["visibleCardIds"] = data.get("cardOrder", [])
            
        if "collapsedCardIds" not in data and "collapsedCards" not in data:
            data["collapsedCardIds"] = []
            
        preference.preference_data = data
    
    return preference

@router.put("", response_model=dict)
async def update_user_preference(
    preference_data: Dict[str, Any],
    preference_type: str = Query(..., description="Preference type to update"),
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """사용자 설정 저장 또는 업데이트"""
    # 기존 설정 조회
    statement = select(UserPreference).where(
        UserPreference.user_id == current_user.id,
        UserPreference.preference_type == preference_type
    )
    preference = db.exec(statement).first()
    
    # 저장할 데이터 준비
    data_to_save = {}
    
    if preference and preference.preference_data:
        # 기존 데이터가 있으면 복사
        data_to_save = preference.preference_data.copy()
    
    # 대시보드 레이아웃의 경우 필드명 처리
    if preference_type == "dashboard_layout":
        # cardOrder 필드 처리
        if "cardOrder" in preference_data:
            data_to_save["cardOrder"] = preference_data["cardOrder"]
        
        # visibleCardIds 필드 처리 (DB에는 visibleCards로 저장)
        if "visibleCardIds" in preference_data:
            data_to_save["visibleCards"] = preference_data["visibleCardIds"]
        
        # collapsedCardIds 필드 처리 (DB에는 collapsedCards로 저장)
        if "collapsedCardIds" in preference_data:
            data_to_save["collapsedCards"] = preference_data["collapsedCardIds"]
    else:
        # 다른 타입의 설정은 그대로 저장
        data_to_save = preference_data
    
    # DB에 저장
    if preference:
        # 기존 설정 업데이트
        preference.preference_data = data_to_save
        db.add(preference)
        db.commit()
        db.refresh(preference)
    else:
        # 새 설정 생성
        new_preference = UserPreference(
            user_id=current_user.id,
            preference_type=preference_type,
            preference_data=data_to_save
        )
        db.add(new_preference)
        db.commit()
        db.refresh(new_preference)
    
    # 성공 응답 반환
    return {
        "success": True,
        "message": "설정이 저장되었습니다",
        # 디버깅용으로 저장된 실제 데이터 포함
        "data": data_to_save
    }
