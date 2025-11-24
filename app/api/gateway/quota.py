# app/api/gateway/quota.py
from typing import Dict, Optional
from datetime import datetime, timedelta
from app.models.api_keys import APIKey
from app.models.users import User
from app.core.redis import redis_client
from sqlmodel import Session

class QuotaManager:
    """API 사용량 할당 관리"""
    
    def __init__(self):
        self.default_quotas = {
            "free": {
                "requests_per_day": 1000,
                "requests_per_month": 20000,
                "bandwidth_mb_per_day": 100,
                "storage_mb": 100,
            },
            "basic": {
                "requests_per_day": 10000,
                "requests_per_month": 200000,
                "bandwidth_mb_per_day": 1000,
                "storage_mb": 1000,
            },
            "premium": {
                "requests_per_day": 100000,
                "requests_per_month": 2000000,
                "bandwidth_mb_per_day": 10000,
                "storage_mb": 10000,
            },
            "enterprise": {
                "requests_per_day": None,  # 무제한
                "requests_per_month": None,
                "bandwidth_mb_per_day": None,
                "storage_mb": 100000,
            }
        }
    
    async def check_quota(
        self,
        user: Optional[User],
        api_key: Optional[APIKey],
        resource_type: str,
        amount: int = 1
    ) -> tuple[bool, Dict[str, any]]:
        """
        할당량 확인
        Returns: (allowed, quota_info)
        """
        identifier = self._get_identifier(user, api_key)
        tier = self._get_tier(user, api_key)
        quotas = self._get_quotas(tier, api_key)
        
        # 리소스별 확인
        if resource_type == "request":
            return await self._check_request_quota(identifier, quotas, amount)
        elif resource_type == "bandwidth":
            return await self._check_bandwidth_quota(identifier, quotas, amount)
        elif resource_type == "storage":
            return await self._check_storage_quota(identifier, quotas, amount)
        else:
            return True, {"type": resource_type, "unlimited": True}
    
    async def _check_request_quota(
        self,
        identifier: str,
        quotas: Dict,
        amount: int
    ) -> tuple[bool, Dict]:
        """요청 수 할당량 확인"""
        # 일일 할당량
        if quotas["requests_per_day"] is not None:
            day_key = f"quota:requests:daily:{identifier}:{datetime.utcnow().date()}"
            current_daily = await redis_client.increment_counter(day_key, 86400)
            
            if current_daily > quotas["requests_per_day"]:
                return False, {
                    "type": "request",
                    "period": "daily",
                    "current": current_daily,
                    "limit": quotas["requests_per_day"],
                    "reset_at": datetime.utcnow().replace(hour=0, minute=0, second=0) + timedelta(days=1)
                }
        
        # 월간 할당량
        if quotas["requests_per_month"] is not None:
            month_key = f"quota:requests:monthly:{identifier}:{datetime.utcnow().strftime('%Y-%m')}"
            current_monthly = await redis_client.increment_counter(month_key, 86400 * 31)
            
            if current_monthly > quotas["requests_per_month"]:
                return False, {
                    "type": "request",
                    "period": "monthly",
                    "current": current_monthly,
                    "limit": quotas["requests_per_month"],
                    "reset_at": datetime.utcnow().replace(day=1, hour=0, minute=0, second=0) + timedelta(days=32)
                }
        
        return True, {
            "type": "request",
            "daily": {
                "current": current_daily if 'current_daily' in locals() else 0,
                "limit": quotas["requests_per_day"]
            },
            "monthly": {
                "current": current_monthly if 'current_monthly' in locals() else 0,
                "limit": quotas["requests_per_month"]
            }
        }
    
    async def _check_bandwidth_quota(
        self,
        identifier: str,
        quotas: Dict,
        amount_mb: int
    ) -> tuple[bool, Dict]:
        """대역폭 할당량 확인"""
        if quotas["bandwidth_mb_per_day"] is None:
            return True, {"type": "bandwidth", "unlimited": True}
        
        day_key = f"quota:bandwidth:daily:{identifier}:{datetime.utcnow().date()}"
        
        # 현재 사용량 조회
        current = await redis_client.redis.get(day_key)
        current_mb = float(current) if current else 0
        
        if current_mb + amount_mb > quotas["bandwidth_mb_per_day"]:
            return False, {
                "type": "bandwidth",
                "period": "daily",
                "current_mb": current_mb,
                "requested_mb": amount_mb,
                "limit_mb": quotas["bandwidth_mb_per_day"],
                "reset_at": datetime.utcnow().replace(hour=0, minute=0, second=0) + timedelta(days=1)
            }
        
        # 사용량 업데이트
        await redis_client.redis.incrbyfloat(day_key, amount_mb)
        await redis_client.redis.expire(day_key, 86400)
        
        return True, {
            "type": "bandwidth",
            "current_mb": current_mb + amount_mb,
            "limit_mb": quotas["bandwidth_mb_per_day"]
        }
    
    async def _check_storage_quota(
        self,
        identifier: str,
        quotas: Dict,
        amount_mb: int,
        db: Session
    ) -> tuple[bool, Dict]:
        """스토리지 할당량 확인"""
        # 실제 사용량은 DB에서 조회
        # 여기서는 간단한 예시
        current_mb = 0  # TODO: 실제 구현시 DB 조회
        
        if current_mb + amount_mb > quotas["storage_mb"]:
            return False, {
                "type": "storage",
                "current_mb": current_mb,
                "requested_mb": amount_mb,
                "limit_mb": quotas["storage_mb"]
            }
        
        return True, {
            "type": "storage",
            "current_mb": current_mb,
            "limit_mb": quotas["storage_mb"]
        }
    
    def _get_identifier(self, user: Optional[User], api_key: Optional[APIKey]) -> str:
        """식별자 생성"""
        if api_key:
            return f"api_key:{api_key.id}"
        elif user:
            return f"user:{user.id}"
        else:
            return "anonymous"
    
    def _get_tier(self, user: Optional[User], api_key: Optional[APIKey]) -> str:
        """사용자 등급 결정"""
        if api_key:
            return "api_key"
        elif user:
            # 역할에 따른 기본 등급
            role_tiers = {
                "USER": "free",
                "EDITOR": "basic",
                "ADMIN": "premium",
                "SUPER_ADMIN": "enterprise"
            }
            return role_tiers.get(user.role.value, "free")
        else:
            return "free"
    
    def _get_quotas(self, tier: str, api_key: Optional[APIKey]) -> Dict:
        """할당량 조회"""
        if api_key and api_key.max_requests:
            # API 키 커스텀 할당량
            return {
                "requests_per_day": api_key.rate_limit_per_day,
                "requests_per_month": api_key.max_requests,
                "bandwidth_mb_per_day": None,
                "storage_mb": None
            }
        else:
            return self.default_quotas.get(tier, self.default_quotas["free"])
    
    async def get_usage_summary(self, identifier: str) -> Dict:
        """사용량 요약 조회"""
        today = datetime.utcnow().date()
        month = datetime.utcnow().strftime('%Y-%m')
        
        # 각종 사용량 조회
        daily_requests = await redis_client.redis.get(f"quota:requests:daily:{identifier}:{today}")
        monthly_requests = await redis_client.redis.get(f"quota:requests:monthly:{identifier}:{month}")
        daily_bandwidth = await redis_client.redis.get(f"quota:bandwidth:daily:{identifier}:{today}")
        
        return {
            "requests": {
                "daily": int(daily_requests) if daily_requests else 0,
                "monthly": int(monthly_requests) if monthly_requests else 0
            },
            "bandwidth_mb": {
                "daily": float(daily_bandwidth) if daily_bandwidth else 0
            }
        }

# 전역 Quota Manager
quota_manager = QuotaManager()
