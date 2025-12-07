# app/middleware/rate_limiter.py
from typing import Dict, Optional, Tuple, Any
from datetime import datetime, timedelta
from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from app.core.redis import redis_client
from app.models.users import User, Role
from app.models.api_keys import APIKey
from app.core.security.constants import UserRole
from app.monitoring.logging.security import security_logger
import hashlib
import os

class RateLimitConfig:
    """Rate Limit 설정"""
    
    # 환경 확인
    IS_DEVELOPMENT = os.getenv("ENVIRONMENT", "production") == "development"
    
    # 🚨 보안 테스트를 위한 Rate Limit 비활성화 옵션
    DISABLE_RATE_LIMIT = os.getenv("DISABLE_RATE_LIMIT", "false").lower() == "true"
    
    # 프로덕션 환경에 맞춘 현실적인 제한
    USER_TIERS = {
        "anonymous": {"per_minute": 60, "per_hour": 600, "per_day": 3000},
        "basic": {"per_minute": 120, "per_hour": 2000, "per_day": 20000},
        "premium": {"per_minute": 300, "per_hour": 10000, "per_day": 100000},
        "enterprise": {"per_minute": 1000, "per_hour": 30000, "per_day": 300000},
    }
    
    # 역할별 제한
    ROLE_LIMITS = {
        Role.USER: "basic",
        Role.EDITOR: "premium",
        Role.ADMIN: "enterprise",
        Role.SUPER_ADMIN: "enterprise",
    }
    
    # 엔드포인트별 가중치 (더 합리적으로 조정)
    ENDPOINT_WEIGHTS = {
        # 높은 부하 엔드포인트
        "/api/movies/search": 3,
        "/api/media/transcode": 10,
        "/api/analytics/report": 5,
        
        # 일반 엔드포인트
        "/api/movies": 1,
        "/api/users": 1,
        
        # 인증 엔드포인트 (로그인은 더 관대하게)
        "/api/auth/login": 1,  # 로그인은 가중치 1로 감소
        "/api/auth/register": 2,
        "/api/auth/forgot-password": 3,  # 비밀번호 재설정은 더 엄격
    }
    
    # IP별 로그인 시도 제한 (brute force 방어)
    LOGIN_ATTEMPTS = {
        "per_minute": 10 if IS_DEVELOPMENT else 3,   # 개발: 분당 10회
        "per_hour": 60 if IS_DEVELOPMENT else 10,    # 개발: 시간당 60회
        "per_day": 200 if IS_DEVELOPMENT else 20     # 개발: 일당 200회
    }
    
    @classmethod
    def get_endpoint_weight(cls, path: str) -> int:
        """엔드포인트 가중치 조회"""
        # 정확한 매치
        if path in cls.ENDPOINT_WEIGHTS:
            return cls.ENDPOINT_WEIGHTS[path]
        
        # 패턴 매치
        for pattern, weight in cls.ENDPOINT_WEIGHTS.items():
            if path.startswith(pattern.rstrip("/")):
                return weight
        
        return 1  # 기본값

class DynamicRateLimiter:
    """동적 Rate Limiting"""
    
    def __init__(self):
        self.config = RateLimitConfig()
        self._disabled_logged = False  # 한 번만 로깅하기 위한 플래그
    
    async def check_limit(
        self,
        request: Request,
        user: Optional[User] = None,
        api_key: Optional[APIKey] = None
    ) -> Tuple[bool, Dict[str, Any]]:
        """
        Rate limit 확인
        Returns: (allowed, limit_info)
        """
        
        # 🚨 Rate Limit 비활성화 체크
        if self.config.DISABLE_RATE_LIMIT or (self.config.IS_DEVELOPMENT and os.getenv("DISABLE_RATE_LIMIT_DEV", "false").lower() == "true"):
            # 한 번만 로깅
            if not self._disabled_logged:
                print("⚠️  Rate Limit is DISABLED")
                self._disabled_logged = True
                
            return True, {
                "identifier": "disabled",
                "tier": "unlimited",
                "endpoint": request.url.path,
                "checks": [],
                "allowed": True,
                "disabled": True
            }
        
        # 식별자 결정
        identifier, tier = self._get_identifier_and_tier(request, user, api_key)
        
        print(f"🔍 Rate Limit Check for {request.url.path}")
        print(f"   - Identifier: {identifier}")
        print(f"   - Tier: {tier}")
        
        # 차단 여부 먼저 확인
        if await self.is_blocked(identifier):
            print(f"   ❌ BLOCKED: {identifier}")
            return False, {
                "identifier": identifier,
                "blocked": True,
                "checks": []
            }
        
        # 엔드포인트 가중치
        endpoint = request.url.path
        weight = self.config.get_endpoint_weight(endpoint)
        
        # 로그인 엔드포인트는 특별 처리
        if endpoint == "/api/auth/login":
            return await self._check_login_limit(request, identifier)
        
        # 제한값 가져오기
        limits = self._get_limits(tier, api_key)
        
        # 모든 시간 윈도우 확인
        checks = []
        for window, limit in [
            ("minute", limits["per_minute"]),
            ("hour", limits["per_hour"]),
            ("day", limits["per_day"])
        ]:
            if limit is None:
                continue
                
            key = f"rate_limit:{identifier}:{window}:{endpoint}"
            window_seconds = {"minute": 60, "hour": 3600, "day": 86400}[window]
            
            # 가중치 적용
            effective_limit = limit // weight if weight > 1 else limit
            
            # Redis에서 현재 카운트 확인 및 증가
            allowed, count, ttl = await redis_client.check_rate_limit(
                key, effective_limit, window_seconds
            )
            
            checks.append({
                "window": window,
                "allowed": allowed,
                "current": count,
                "limit": effective_limit,
                "reset_in": ttl
            })
        
        # 하나라도 제한 초과시 거부
        all_allowed = all(check["allowed"] for check in checks)
        
        # 제한 정보
        limit_info = {
            "identifier": identifier,
            "tier": tier,
            "endpoint": endpoint,
            "weight": weight,
            "checks": checks,
            "allowed": all_allowed
        }
        
        # 제한 초과시 로깅
        if not all_allowed:
            await self._handle_rate_limit_exceeded(request, user, limit_info)
        
        return all_allowed, limit_info
    
    async def _check_login_limit(
        self,
        request: Request,
        identifier: str
    ) -> Tuple[bool, Dict[str, Any]]:
        """로그인 엔드포인트 전용 Rate Limit"""
        ip = request.client.host if request.client else "unknown"
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            ip = forwarded_for.split(",")[0].strip()
        
        # 디버깅 로그 추가
        print(f"🔍 Login Rate Limit Check:")
        print(f"   - Original IP: {request.client.host if request.client else 'None'}")
        print(f"   - X-Forwarded-For: {forwarded_for}")
        print(f"   - Final IP: {ip}")
        print(f"   - Identifier: {identifier}")
        print(f"   - LOGIN_ATTEMPTS config: {self.config.LOGIN_ATTEMPTS}")
        print(f"   - IS_DEVELOPMENT: {self.config.IS_DEVELOPMENT}")
        
        # 먼저 차단 상태 확인
        block_key = f"rate_limit_blocked:{identifier}"
        login_block_key = f"rate_limit_blocked:login:{ip}"
        
        is_blocked = await redis_client.exists(block_key) or await redis_client.exists(login_block_key)
        if is_blocked:
            print(f"   ❌ User is BLOCKED! Keys: {block_key}, {login_block_key}")
            return False, {
                "identifier": f"login:{ip}",
                "tier": "login",
                "endpoint": "/api/auth/login",
                "checks": [],
                "allowed": False,
                "blocked": True
            }
        
        # IP 기반 로그인 제한
        checks = []
        for window, limit in [
            ("minute", self.config.LOGIN_ATTEMPTS["per_minute"]),
            ("hour", self.config.LOGIN_ATTEMPTS["per_hour"]),
            ("day", self.config.LOGIN_ATTEMPTS["per_day"])
        ]:
            key = f"login_attempts:{ip}:{window}"
            window_seconds = {"minute": 60, "hour": 3600, "day": 86400}[window]
            
            # 현재 카운트 확인 - sorted set이므로 zcount 사용
            try:
                await redis_client.ensure_connected()
                now = datetime.utcnow().timestamp()
                window_start = now - window_seconds
                current_count_before = await redis_client.redis.zcount(key, window_start, now)
            except:
                current_count_before = 0
            
            allowed, count, ttl = await redis_client.check_rate_limit(
                key, limit, window_seconds
            )
            
            print(f"   - {window}: {current_count_before} -> {count} / {limit} (allowed: {allowed}, ttl: {ttl}s)")
            
            checks.append({
                "window": window,
                "allowed": allowed,
                "current": count,
                "limit": limit,
                "reset_in": ttl
            })
        
        all_allowed = all(check["allowed"] for check in checks)
        print(f"   - Final result: {'✅ ALLOWED' if all_allowed else '❌ DENIED'}")
        
        return all_allowed, {
            "identifier": f"login:{ip}",
            "tier": "login",
            "endpoint": "/api/auth/login",
            "checks": checks,
            "allowed": all_allowed
        }
    
    def _get_identifier_and_tier(
        self,
        request: Request,
        user: Optional[User],
        api_key: Optional[APIKey]
    ) -> Tuple[str, str]:
        """식별자와 등급 결정"""
        if api_key:
            # API 키 기반
            return f"api_key:{api_key.key_prefix}", "api_key"
        elif user:
            # 사용자 기반
            tier = self.config.ROLE_LIMITS.get(user.role, "basic")
            return f"user:{user.id}", tier
        else:
            # IP 기반 (익명)
            ip = request.client.host if request.client else "unknown"
            # X-Forwarded-For 헤더 확인
            forwarded_for = request.headers.get("X-Forwarded-For")
            if forwarded_for:
                ip = forwarded_for.split(",")[0].strip()
            return f"ip:{ip}", "anonymous"
    
    def _get_limits(self, tier: str, api_key: Optional[APIKey]) -> Dict[str, Optional[int]]:
        """제한값 조회"""
        if api_key:
            # API 키는 자체 제한 사용
            return {
                "per_minute": api_key.rate_limit_per_minute,
                "per_hour": api_key.rate_limit_per_day // 24 if api_key.rate_limit_per_day else None,
                "per_day": api_key.rate_limit_per_day
            }
        else:
            # 사용자 등급별 제한
            return self.config.USER_TIERS.get(tier, self.config.USER_TIERS["anonymous"])
    
    async def _handle_rate_limit_exceeded(
        self,
        request: Request,
        user: Optional[User],
        limit_info: Dict
    ):
        """Rate limit 초과 처리"""
        # 보안 로깅
        await security_logger.log_security_event(
            event_type="rate_limit_exceeded",
            severity="WARNING",
            description=f"Rate limit exceeded for {limit_info['identifier']}",
            user_id=user.id if user else None,
            ip_address=request.client.host if request.client else "unknown",
            details={
                "endpoint": limit_info["endpoint"],
                "tier": limit_info["tier"],
                "checks": limit_info["checks"]
            }
        )
        
        # 반복적인 초과 확인
        violation_key = f"rate_limit_violations:{limit_info['identifier']}"
        violations = await redis_client.increment_counter(violation_key, 3600)
        
        # 로그인 엔드포인트는 더 엄격하게
        if limit_info["endpoint"] == "/api/auth/login":
            if violations >= 3:
                # 3회 초과시 15분 차단
                block_key = f"rate_limit_blocked:{limit_info['identifier']}"
                await redis_client.set_with_expiry(block_key, "1", 900)
            elif violations >= 5:
                # 5회 초과시 1시간 차단
                block_key = f"rate_limit_blocked:{limit_info['identifier']}"
                await redis_client.set_with_expiry(block_key, "1", 3600)
            elif violations >= 10:
                # 10회 초과시 24시간 차단
                block_key = f"rate_limit_blocked:{limit_info['identifier']}"
                await redis_client.set_with_expiry(block_key, "1", 86400)
        elif violations > 20:
            # 일반 엔드포인트는 20회 초과시 1시간 차단
            block_key = f"rate_limit_blocked:{limit_info['identifier']}"
            await redis_client.set_with_expiry(block_key, "1", 3600)
    
    async def is_blocked(self, identifier: str) -> bool:
        """차단 여부 확인"""
        try:
            block_key = f"rate_limit_blocked:{identifier}"
            return await redis_client.exists(block_key)
        except Exception as e:
            print(f"⚠️ Redis error in is_blocked: {e}")
            return False  # Redis 오류 시 차단하지 않음

# 전역 Rate Limiter
rate_limiter = DynamicRateLimiter()

# 미들웨어 클래스 추가
class RateLimitMiddleware(BaseHTTPMiddleware):
    """독립적인 Rate Limit 미들웨어"""

    async def dispatch(self, request: Request, call_next):
        # 헬스체크와 정적 파일은 스킵
        skip_paths = ["/health", "/api/health", "/docs", "/redoc", "/openapi.json", "/_next", "/public"]
        if any(request.url.path.startswith(path) for path in skip_paths):
            return await call_next(request)

        # Redis 연결 상태 확인 - 연결 안 되어 있으면 rate limiting 스킵
        redis_connected = getattr(request.app.state, 'redis_connected', False)
        if not redis_connected:
            return await call_next(request)

        # 사용자와 API 키 정보 가져오기
        user = getattr(request.state, 'user', None)
        api_key = getattr(request.state, 'api_key', None)

        # Rate limit 체크 - Redis 오류 시 통과
        try:
            allowed, rate_info = await rate_limiter.check_limit(request, user, api_key)
        except Exception as e:
            print(f"⚠️ Rate limit check failed: {e}")
            return await call_next(request)
        
        if not allowed:
            # JSONResponse 직접 반환
            return JSONResponse(
                status_code=429,
                content={"detail": "Rate limit exceeded"},
                headers={
                    "X-RateLimit-Limit": str(rate_info["checks"][0]["limit"]) if rate_info.get("checks") else "0",
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(rate_info["checks"][0]["reset_in"]) if rate_info.get("checks") else "60",
                    "Retry-After": str(rate_info["checks"][0]["reset_in"]) if rate_info.get("checks") else "60"
                }
            )
        
        # 요청 처리
        response = await call_next(request)
        
        # Rate limit 헤더 추가
        if rate_info and rate_info.get("checks"):
            response.headers["X-RateLimit-Limit"] = str(rate_info["checks"][0]["limit"])
            response.headers["X-RateLimit-Remaining"] = str(
                rate_info["checks"][0]["limit"] - rate_info["checks"][0]["current"]
            )
        
        return response
