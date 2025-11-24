# app/api/keys/generator.py
import secrets
import hashlib
from typing import Tuple, Optional
from datetime import datetime, timedelta
from sqlmodel import Session
from app.models.api_keys import APIKey, APIKeyType, APIKeyStatus, APIKeyScope
from app.models.users import User
import json

class APIKeyGenerator:
    """API 키 생성 및 관리"""
    
    def __init__(self):
        self.key_prefix_length = 8
        self.key_length = 32
    
    def generate_key(self) -> Tuple[str, str, str]:
        """
        API 키 생성
        Returns: (full_key, key_prefix, key_hash)
        """
        # 안전한 랜덤 키 생성
        key = secrets.token_urlsafe(self.key_length)
        
        # 프리픽스 추출 (표시용)
        key_prefix = key[:self.key_prefix_length]
        
        # 전체 키 해시 (저장용)
        key_hash = self._hash_key(key)
        
        return key, key_prefix, key_hash
    
    def _hash_key(self, key: str) -> str:
        """키 해시 생성"""
        return hashlib.sha256(key.encode()).hexdigest()
    
    async def create_api_key(
        self,
        db: Session,
        user: User,
        name: str,
        key_type: APIKeyType,
        scopes: list[APIKeyScope],
        description: Optional[str] = None,
        expires_in_days: Optional[int] = None,
        rate_limit_per_minute: int = 100,
        rate_limit_per_day: Optional[int] = None,
        allowed_ips: Optional[list[str]] = None,
        allowed_origins: Optional[list[str]] = None
    ) -> Tuple[APIKey, str]:
        """
        API 키 생성 및 저장
        Returns: (api_key_model, full_key)
        """
        # 키 생성
        full_key, key_prefix, key_hash = self.generate_key()
        
        # 만료 시간 계산
        expires_at = None
        if expires_in_days:
            expires_at = datetime.utcnow() + timedelta(days=expires_in_days)
        
        # 모델 생성
        api_key = APIKey(
            user_id=user.id,
            key_prefix=key_prefix,
            key_hash=key_hash,
            name=name,
            description=description,
            key_type=key_type,
            status=APIKeyStatus.ACTIVE,
            scopes=json.dumps([scope.value for scope in scopes]),
            allowed_ips=json.dumps(allowed_ips) if allowed_ips else None,
            allowed_origins=json.dumps(allowed_origins) if allowed_origins else None,
            rate_limit_per_minute=rate_limit_per_minute,
            rate_limit_per_day=rate_limit_per_day,
            expires_at=expires_at
        )
        
        # 저장
        db.add(api_key)
        db.commit()
        db.refresh(api_key)
        
        # 로깅
        from app.monitoring.logging.security import security_logger
        await security_logger.log_api_key_event(
            user_id=user.id,
            event_type="api_key_created",
            api_key_id=str(api_key.id),
            ip_address="system"
        )
        
        return api_key, full_key
    
    def verify_key(self, full_key: str, key_hash: str) -> bool:
        """API 키 검증"""
        return self._hash_key(full_key) == key_hash
    
    async def get_key_by_prefix(self, db: Session, key_prefix: str) -> Optional[APIKey]:
        """프리픽스로 키 조회 (캐시 활용)"""
        from app.core.redis import redis_client
        
        # 캐시 확인
        cache_key = f"api_key:prefix:{key_prefix}"
        cached = await redis_client.get_json(cache_key)
        
        if cached:
            # 캐시에서 ID만 저장, 실제 데이터는 DB에서
            api_key = db.get(APIKey, cached["id"])
            if api_key and api_key.status == APIKeyStatus.ACTIVE:
                return api_key
        
        # DB 조회
        api_key = db.query(APIKey).filter(
            APIKey.key_prefix == key_prefix,
            APIKey.status == APIKeyStatus.ACTIVE
        ).first()
        
        if api_key:
            # 캐시 저장 (5분)
            await redis_client.set_with_expiry(
                cache_key,
                {"id": api_key.id},
                300
            )
        
        return api_key
    
    def validate_key_permissions(
        self,
        api_key: APIKey,
        required_scope: APIKeyScope,
        request_ip: Optional[str] = None,
        request_origin: Optional[str] = None
    ) -> Tuple[bool, Optional[str]]:
        """키 권한 검증"""
        # 만료 확인
        if api_key.expires_at and api_key.expires_at < datetime.utcnow():
            return False, "API key expired"
        
        # 상태 확인
        if api_key.status != APIKeyStatus.ACTIVE:
            return False, f"API key is {api_key.status.value}"
        
        # 스코프 확인
        key_scopes = json.loads(api_key.scopes)
        if required_scope.value not in key_scopes and APIKeyScope.ADMIN.value not in key_scopes:
            return False, f"Missing required scope: {required_scope.value}"
        
        # IP 제한 확인
        if api_key.allowed_ips:
            allowed_ips = json.loads(api_key.allowed_ips)
            if request_ip and request_ip not in allowed_ips:
                return False, f"IP not allowed: {request_ip}"
        
        # Origin 제한 확인
        if api_key.allowed_origins:
            allowed_origins = json.loads(api_key.allowed_origins)
            if request_origin and request_origin not in allowed_origins:
                return False, f"Origin not allowed: {request_origin}"
        
        return True, None

# 전역 생성기
api_key_generator = APIKeyGenerator()
