# app/auth/api_keys/manager.py
import secrets
import hashlib
from typing import Optional, List, Dict, Tuple
from datetime import datetime, timedelta
from sqlmodel import Session, select
from fastapi import HTTPException, status
import json

from app.models.api_keys import APIKey, APIKeyType, APIKeyStatus, APIKeyScope
from app.services.encryption import EncryptionService

class APIKeyManager:
    def __init__(self, db: Session):
        self.db = db
        self.encryption = EncryptionService()
        self.key_length = 32
        self.prefix_length = 8
    
    def generate_api_key(self) -> Tuple[str, str, str]:
        """API 키 생성 (전체 키, 프리픽스, 해시)"""
        # 안전한 랜덤 키 생성
        key = f"tk_{secrets.token_urlsafe(self.key_length)}"  # tk_ = tomato key
        prefix = key[:self.prefix_length]
        key_hash = hashlib.sha256(key.encode()).hexdigest()
        
        return key, prefix, key_hash
    
    async def create_api_key(
        self,
        user_id: int,
        name: str,
        key_type: APIKeyType,
        scopes: List[APIKeyScope],
        description: Optional[str] = None,
        expires_in_days: Optional[int] = None,
        allowed_ips: Optional[List[str]] = None,
        allowed_origins: Optional[List[str]] = None,
        rate_limit_per_minute: int = 100
    ) -> Dict:
        """새 API 키 생성"""
        # 사용자당 API 키 수 제한 확인
        existing_count = self.db.exec(
            select(APIKey).where(
                APIKey.user_id == user_id,
                APIKey.status == APIKeyStatus.ACTIVE
            )
        ).count()
        
        if existing_count >= 10:  # 사용자당 최대 10개
            raise HTTPException(
                status_code=400,
                detail="Maximum number of API keys reached"
            )
        
        # 키 생성
        full_key, prefix, key_hash = self.generate_api_key()
        
        # DB 저장
        api_key = APIKey(
            user_id=user_id,
            key_prefix=prefix,
            key_hash=key_hash,
            name=name,
            description=description,
            key_type=key_type,
            scopes=json.dumps([s.value for s in scopes]),
            allowed_ips=json.dumps(allowed_ips) if allowed_ips else None,
            allowed_origins=json.dumps(allowed_origins) if allowed_origins else None,
            rate_limit_per_minute=rate_limit_per_minute,
            expires_at=datetime.utcnow() + timedelta(days=expires_in_days) if expires_in_days else None
        )
        
        self.db.add(api_key)
        self.db.commit()
        self.db.refresh(api_key)
        
        # 전체 키는 생성 시에만 반환 (다시 볼 수 없음)
        return {
            "id": api_key.id,
            "key": full_key,  # 이때만 전체 키 반환
            "key_prefix": prefix,
            "name": name,
            "type": key_type,
            "scopes": scopes,
            "expires_at": api_key.expires_at,
            "created_at": api_key.created_at
        }
    
    async def validate_api_key(self, api_key: str) -> Optional[APIKey]:
        """API 키 검증"""
        # 키 해시 계산
        key_hash = hashlib.sha256(api_key.encode()).hexdigest()
        
        # DB에서 조회
        db_key = self.db.exec(
            select(APIKey).where(APIKey.key_hash == key_hash)
        ).first()
        
        if not db_key:
            return None
        
        # 상태 확인
        if db_key.status != APIKeyStatus.ACTIVE:
            return None
        
        # 만료 확인
        if db_key.expires_at and datetime.utcnow() > db_key.expires_at:
            db_key.status = APIKeyStatus.EXPIRED
            self.db.commit()
            return None
        
        # 사용 횟수 제한 확인
        if db_key.max_requests and db_key.request_count >= db_key.max_requests:
            db_key.status = APIKeyStatus.EXPIRED
            self.db.commit()
            return None
        
        # 사용 정보 업데이트
        db_key.last_used_at = datetime.utcnow()
        db_key.request_count += 1
        self.db.commit()
        
        return db_key
    
    async def check_permissions(
        self,
        api_key: APIKey,
        required_scope: APIKeyScope,
        request_ip: str,
        origin: Optional[str] = None
    ) -> bool:
        """권한 확인"""
        # 스코프 확인
        scopes = json.loads(api_key.scopes)
        if required_scope.value not in scopes and APIKeyScope.ADMIN.value not in scopes:
            return False
        
        # IP 제한 확인
        if api_key.allowed_ips:
            allowed_ips = json.loads(api_key.allowed_ips)
            if request_ip not in allowed_ips:
                return False
        
        # Origin 제한 확인
        if api_key.allowed_origins and origin:
            allowed_origins = json.loads(api_key.allowed_origins)
            if origin not in allowed_origins:
                return False
        
        return True
    
    async def revoke_api_key(self, key_id: int, user_id: int) -> bool:
        """API 키 폐기"""
        api_key = self.db.exec(
            select(APIKey).where(
                APIKey.id == key_id,
                APIKey.user_id == user_id
            )
        ).first()
        
        if not api_key:
            return False
        
        api_key.status = APIKeyStatus.REVOKED
        api_key.revoked_at = datetime.utcnow()
        self.db.commit()
        
        return True
    
    async def get_user_api_keys(self, user_id: int) -> List[Dict]:
        """사용자의 API 키 목록"""
        keys = self.db.exec(
            select(APIKey).where(APIKey.user_id == user_id)
            .order_by(APIKey.created_at.desc())
        ).all()
        
        return [
            {
                "id": key.id,
                "key_prefix": key.key_prefix + "...",
                "name": key.name,
                "type": key.key_type,
                "status": key.status,
                "scopes": json.loads(key.scopes),
                "last_used_at": key.last_used_at,
                "request_count": key.request_count,
                "expires_at": key.expires_at,
                "created_at": key.created_at
            }
            for key in keys
        ]
    
    async def rotate_api_key(self, key_id: int, user_id: int) -> Dict:
        """API 키 순환 (새 키 발급 + 기존 키 폐기)"""
        # 기존 키 조회
        old_key = self.db.exec(
            select(APIKey).where(
                APIKey.id == key_id,
                APIKey.user_id == user_id,
                APIKey.status == APIKeyStatus.ACTIVE
            )
        ).first()
        
        if not old_key:
            raise HTTPException(status_code=404, detail="API key not found")
        
        # 새 키 생성 (같은 설정으로)
        new_key_data = await self.create_api_key(
            user_id=user_id,
            name=f"{old_key.name} (rotated)",
            key_type=old_key.key_type,
            scopes=[APIKeyScope(s) for s in json.loads(old_key.scopes)],
            description=f"Rotated from {old_key.key_prefix}",
            allowed_ips=json.loads(old_key.allowed_ips) if old_key.allowed_ips else None,
            allowed_origins=json.loads(old_key.allowed_origins) if old_key.allowed_origins else None,
            rate_limit_per_minute=old_key.rate_limit_per_minute
        )
        
        # 기존 키 폐기
        old_key.status = APIKeyStatus.REVOKED
        old_key.revoked_at = datetime.utcnow()
        self.db.commit()
        
        return new_key_data
    
    async def log_usage(
        self,
        api_key: APIKey,
        endpoint: str,
        method: str,
        status_code: int,
        response_time_ms: int,
        request_ip: str,
        user_agent: Optional[str] = None,
        origin: Optional[str] = None,
        error_message: Optional[str] = None
    ):
        """API 키 사용 로그"""
        # 비동기로 처리하여 성능 영향 최소화
        log = APIKeyUsageLog(
            api_key_id=api_key.id,
            endpoint=endpoint,
            method=method,
            status_code=status_code,
            response_time_ms=response_time_ms,
            ip_address=request_ip,
            user_agent=user_agent,
            origin=origin,
            request_id=request.state.request_id,
            error_message=error_message
        )
        
        self.db.add(log)
        
        # IP 업데이트
        api_key.last_used_ip = request_ip
        
        self.db.commit()
