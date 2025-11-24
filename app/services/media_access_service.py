# app/services/media_access_service.py
from sqlmodel import Session, select
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from fastapi import HTTPException

from app.models.access_asset import AccessAsset
from app.models.media_access import MediaAccessRequest
from app.models.users import User

class MediaAccessService:
    """접근성 미디어 자산의 접근 제어를 관리하는 서비스"""
    
    def toggle_lock(
        self,
        db: Session,
        media_id: int,
        is_locked: bool,
        admin_id: Optional[int] = None
    ) -> AccessAsset:
        """
        미디어 자산 잠금 상태 토글
        
        Args:
            db: 데이터베이스 세션
            media_id: 접근성 미디어 자산 ID
            is_locked: 잠금 상태 여부
            admin_id: 관리자 ID (선택)
            
        Returns:
            AccessAsset: 업데이트된 자산
        """
        # 자산 존재 여부 확인
        asset = db.get(AccessAsset, media_id)
        if not asset:
            raise HTTPException(status_code=404, detail="Access asset not found")
        
        # 잠금 상태 업데이트
        asset.is_locked = is_locked
        asset.updated_at = datetime.now()
        
        db.add(asset)
        db.commit()
        db.refresh(asset)
        
        return asset
    
    def create_access_request(
        self,
        db: Session,
        media_id: int,
        user_id: Optional[int] = None,
        device_id: Optional[str] = None,
        request_reason: Optional[str] = None
    ) -> MediaAccessRequest:
        """
        접근 요청 생성
        
        Args:
            db: 데이터베이스 세션
            media_id: 접근성 미디어 자산 ID
            user_id: 사용자 ID (로그인된 경우)
            device_id: 기기 ID (익명 요청의 경우)
            request_reason: 요청 이유
            
        Returns:
            MediaAccessRequest: 생성된 접근 요청
        """
        # 자산 존재 여부 확인
        asset = db.get(AccessAsset, media_id)
        if not asset:
            raise HTTPException(status_code=404, detail="Access asset not found")
        
        # 사용자가 로그인한 경우 존재 여부 확인
        if user_id:
            user = db.get(User, user_id)
            if not user:
                raise HTTPException(status_code=404, detail="User not found")
        
        # 사용자 또는 기기 ID 중 하나는 필요함
        if not user_id and not device_id:
            raise HTTPException(status_code=400, detail="Either user_id or device_id is required")
        
        # 이미 존재하는 요청 확인 (동일 사용자 또는 기기)
        existing_query = select(MediaAccessRequest).where(
            MediaAccessRequest.media_id == media_id,
            MediaAccessRequest.status.in_(["pending", "approved"])
        )
        
        if user_id:
            existing_query = existing_query.where(MediaAccessRequest.user_id == user_id)
        elif device_id:
            existing_query = existing_query.where(MediaAccessRequest.device_id == device_id)
        
        existing_request = db.exec(existing_query).first()
        
        if existing_request:
            # 이미 승인된 요청이 있는 경우
            if existing_request.status == "approved":
                return existing_request
            
            # 이미 대기 중인 요청이 있는 경우
            raise HTTPException(
                status_code=409,
                detail="Access request already exists and is pending approval"
            )
        
        # 새 접근 요청 생성
        new_request = MediaAccessRequest(
            media_id=media_id,
            user_id=user_id,
            device_id=device_id,
            request_reason=request_reason,
            status="pending",
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
        
        db.add(new_request)
        db.commit()
        db.refresh(new_request)
        
        return new_request
    
    def get_access_requests(
        self,
        db: Session,
        media_id: Optional[int] = None,
        user_id: Optional[int] = None,
        device_id: Optional[str] = None,
        status: Optional[str] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[MediaAccessRequest]:
        """
        접근 요청 목록 조회
        
        Args:
            db: 데이터베이스 세션
            media_id: 접근성 미디어 자산 ID (필터용)
            user_id: 사용자 ID (필터용)
            device_id: 기기 ID (필터용)
            status: 요청 상태 (필터용)
            skip: 건너뛸 레코드 수
            limit: 최대 레코드 수
            
        Returns:
            List[MediaAccessRequest]: 접근 요청 목록
        """
        query = select(MediaAccessRequest)
        
        # 필터 적용
        if media_id:
            query = query.where(MediaAccessRequest.media_id == media_id)
        
        if user_id:
            query = query.where(MediaAccessRequest.user_id == user_id)
        
        if device_id:
            query = query.where(MediaAccessRequest.device_id == device_id)
        
        if status:
            query = query.where(MediaAccessRequest.status == status)
        
        # 정렬 및 페이지네이션
        query = query.order_by(MediaAccessRequest.created_at.desc())
        query = query.offset(skip).limit(limit)
        
        return db.exec(query).all()
    
    def process_access_request(
        self,
        db: Session,
        request_id: int,
        status: str,
        admin_id: int,
        admin_notes: Optional[str] = None,
        expiry_date: Optional[datetime] = None
    ) -> MediaAccessRequest:
        """
        접근 요청 처리 (승인 또는 거부)
        
        Args:
            db: 데이터베이스 세션
            request_id: 접근 요청 ID
            status: 변경할 상태 ('approved' 또는 'rejected')
            admin_id: 처리자 ID
            admin_notes: 관리자 노트 (선택)
            expiry_date: 만료일 (선택, 승인 시)
            
        Returns:
            MediaAccessRequest: 업데이트된 접근 요청
        """
        # 유효한 상태 값 확인
        valid_statuses = ["approved", "rejected"]
        if status not in valid_statuses:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid status. Expected one of: {', '.join(valid_statuses)}"
            )
        
        # 요청 존재 여부 확인
        request = db.get(MediaAccessRequest, request_id)
        if not request:
            raise HTTPException(status_code=404, detail="Access request not found")
        
        # 이미 처리된 요청인지 확인
        if request.status != "pending":
            raise HTTPException(
                status_code=409,
                detail=f"Request has already been {request.status}"
            )
        
        # 관리자 존재 여부 확인
        admin = db.get(User, admin_id)
        if not admin:
            raise HTTPException(status_code=404, detail="Admin user not found")
        
        # 만료일 설정 (승인 시, 기본값은 30일 후)
        if status == "approved" and not expiry_date:
            expiry_date = datetime.now() + timedelta(days=30)
        
        # 요청 업데이트
        request.status = status
        request.admin_id = admin_id
        request.admin_notes = admin_notes
        request.expiry_date = expiry_date if status == "approved" else None
        request.updated_at = datetime.now()
        
        db.add(request)
        db.commit()
        db.refresh(request)
        
        return request
    
    def check_access_permission(
        self,
        db: Session,
        media_id: int,
        user_id: Optional[int] = None,
        device_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        미디어 자산에 대한 접근 권한 확인
        
        Args:
            db: 데이터베이스 세션
            media_id: 접근성 미디어 자산 ID
            user_id: 사용자 ID (로그인된 경우)
            device_id: 기기 ID (익명 접근의 경우)
            
        Returns:
            Dict[str, Any]: 접근 권한 정보
        """
        # 자산 존재 여부 확인
        asset = db.get(AccessAsset, media_id)
        if not asset:
            raise HTTPException(status_code=404, detail="Access asset not found")
        
        # 잠금 해제된 자산은 모든 사용자에게 접근 허용
        if not asset.is_locked:
            return {
                "has_access": True,
                "reason": "Asset is not locked",
                "expires_at": None,
                "request_id": None
            }
        
        # 사용자 또는 기기 ID 중 하나는 필요함
        if not user_id and not device_id:
            return {
                "has_access": False,
                "reason": "Authentication required for locked asset",
                "expires_at": None,
                "request_id": None
            }
        
        # 사용자 또는 기기에 대한 승인된 접근 요청 확인
        query = select(MediaAccessRequest).where(
            MediaAccessRequest.media_id == media_id,
            MediaAccessRequest.status == "approved"
        )
        
        if user_id:
            query = query.where(MediaAccessRequest.user_id == user_id)
        else:
            query = query.where(MediaAccessRequest.device_id == device_id)
        
        # 가장 최근에 승인된 요청 가져오기
        access_request = db.exec(query.order_by(MediaAccessRequest.expiry_date.desc())).first()
        
        # 승인된 요청이 없는 경우
        if not access_request:
            return {
                "has_access": False,
                "reason": "No approved access request found",
                "expires_at": None,
                "request_id": None
            }
        
        # 만료 여부 확인
        now = datetime.now()
        if access_request.expiry_date and access_request.expiry_date < now:
            return {
                "has_access": False,
                "reason": "Access request has expired",
                "expires_at": access_request.expiry_date,
                "request_id": access_request.id
            }
        
        # 유효한 접근 권한이 있는 경우
        return {
            "has_access": True,
            "reason": "Approved access request",
            "expires_at": access_request.expiry_date,
            "request_id": access_request.id
        }

# 서비스 인스턴스 생성
media_access_service = MediaAccessService()
