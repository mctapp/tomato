# app/api/keys/rotation.py
from typing import Optional, List
from datetime import datetime, timedelta
from sqlmodel import Session, select
from app.models.api_keys import APIKey, APIKeyStatus
from app.api.keys.generator import api_key_generator
from app.core.redis import redis_client
import asyncio

class APIKeyRotationManager:
    """API 키 순환 관리"""
    
    def __init__(self):
        self.rotation_warning_days = 30
        self.rotation_grace_period_days = 7
    
    async def rotate_key(
        self,
        db: Session,
        old_api_key: APIKey,
        extend_grace_period: bool = True
    ) -> tuple[APIKey, str]:
        """
        API 키 순환
        Returns: (new_api_key, new_full_key)
        """
        # 새 키 생성
        new_api_key, new_full_key = await api_key_generator.create_api_key(
            db=db,
            user=old_api_key.user,
            name=f"{old_api_key.name} (Rotated)",
            key_type=old_api_key.key_type,
            scopes=json.loads(old_api_key.scopes),
            description=f"Rotated from {old_api_key.key_prefix}",
            expires_in_days=365,  # 기본 1년
            rate_limit_per_minute=old_api_key.rate_limit_per_minute,
            rate_limit_per_day=old_api_key.rate_limit_per_day,
            allowed_ips=json.loads(old_api_key.allowed_ips) if old_api_key.allowed_ips else None,
            allowed_origins=json.loads(old_api_key.allowed_origins) if old_api_key.allowed_origins else None
        )
        
        # 이전 키 처리
        if extend_grace_period:
            # 유예 기간 설정
            old_api_key.expires_at = datetime.utcnow() + timedelta(days=self.rotation_grace_period_days)
            old_api_key.status = APIKeyStatus.SUSPENDED
            db.add(old_api_key)
        else:
            # 즉시 폐기
            old_api_key.status = APIKeyStatus.REVOKED
            old_api_key.revoked_at = datetime.utcnow()
            db.add(old_api_key)
        
        db.commit()
        
        # 캐시 무효화
        await self._invalidate_key_cache(old_api_key)
        
        # 알림 전송
        await self._notify_key_rotation(old_api_key, new_api_key)
        
        # 로깅
        from app.monitoring.logging.security import security_logger
        await security_logger.log_api_key_event(
            user_id=old_api_key.user_id,
            event_type="api_key_rotated",
            api_key_id=str(old_api_key.id),
            ip_address="system"
        )
        
        return new_api_key, new_full_key
    
    async def check_keys_for_rotation(self, db: Session) -> List[APIKey]:
        """순환이 필요한 키 확인"""
        # 만료 임박 키
        warning_date = datetime.utcnow() + timedelta(days=self.rotation_warning_days)
        
        query = select(APIKey).where(
            APIKey.status == APIKeyStatus.ACTIVE,
            APIKey.expires_at != None,
            APIKey.expires_at <= warning_date
        )
        
        keys_to_rotate = db.exec(query).all()
        
        # 오래된 키 (1년 이상)
        old_date = datetime.utcnow() - timedelta(days=365)
        query_old = select(APIKey).where(
            APIKey.status == APIKeyStatus.ACTIVE,
            APIKey.created_at <= old_date
        )
        
        old_keys = db.exec(query_old).all()
        keys_to_rotate.extend(old_keys)
        
        return list(set(keys_to_rotate))  # 중복 제거
    
    async def auto_rotate_keys(self, db: Session):
        """자동 키 순환 (크론잡)"""
        keys_to_rotate = await self.check_keys_for_rotation(db)
        
        for api_key in keys_to_rotate:
            try:
                # 자동 순환 플래그 확인
                if hasattr(api_key, 'auto_rotate') and api_key.auto_rotate:
                    await self.rotate_key(db, api_key)
                else:
                    # 수동 순환 필요 - 알림만
                    await self._notify_rotation_required(api_key)
                    
            except Exception as e:
                logger.error(f"Failed to rotate key {api_key.key_prefix}: {str(e)}")
    
    async def _invalidate_key_cache(self, api_key: APIKey):
        """키 캐시 무효화"""
        cache_keys = [
            f"api_key:prefix:{api_key.key_prefix}",
            f"api_key:id:{api_key.id}",
            f"api_key:hash:{api_key.key_hash}"
        ]
        
        for key in cache_keys:
            await redis_client.redis.delete(key)
    
    async def _notify_key_rotation(self, old_key: APIKey, new_key: APIKey):
        """키 순환 알림"""
        from app.services.notifications import send_email
        
        user = old_key.user
        if user and user.email:
            await send_email(
                to=user.email,
                subject="API Key Rotated",
                body=f"""
                Your API key '{old_key.name}' has been rotated.
                
                Old key (prefix: {old_key.key_prefix}) will expire in {self.rotation_grace_period_days} days.
                New key prefix: {new_key.key_prefix}
                
                Please update your applications to use the new key.
                """
            )
    
    async def _notify_rotation_required(self, api_key: APIKey):
        """순환 필요 알림"""
        from app.services.notifications import send_email
        
        user = api_key.user
        if user and user.email:
            days_until_expiry = (api_key.expires_at - datetime.utcnow()).days if api_key.expires_at else None
            
            await send_email(
                to=user.email,
                subject="API Key Rotation Required",
                body=f"""
                Your API key '{api_key.name}' requires rotation.
                
                Key prefix: {api_key.key_prefix}
                {'Expires in: ' + str(days_until_expiry) + ' days' if days_until_expiry else 'Created over 1 year ago'}
                
                Please rotate your key to maintain security.
                """
            )

# 전역 순환 관리자
key_rotation_manager = APIKeyRotationManager()
