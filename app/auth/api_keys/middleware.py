# app/auth/api_keys/middleware.py
from fastapi import Request, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional

from app.auth.api_keys.manager import APIKeyManager
from app.models.api_keys import APIKeyScope

class APIKeyAuth(HTTPBearer):
    def __init__(self, required_scope: APIKeyScope = APIKeyScope.READ):
        super().__init__(scheme_name="API Key")
        self.required_scope = required_scope
    
    async def __call__(self, request: Request) -> Optional[str]:
        # Bearer 토큰 또는 X-API-Key 헤더 확인
        api_key = None
        
        # 1. Authorization: Bearer {api_key}
        credentials = await super().__call__(request)
        if credentials:
            api_key = credentials.credentials
        
        # 2. X-API-Key: {api_key}
        if not api_key:
            api_key = request.headers.get("X-API-Key")
        
        if not api_key:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="API key required"
            )
        
        # API 키 검증
        api_key_manager = APIKeyManager(request.state.db)
        db_key = await api_key_manager.validate_api_key(api_key)
        
        if not db_key:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid API key"
            )
        
        # 권한 확인
        client_ip = request.client.host if request.client else "unknown"
        origin = request.headers.get("Origin")
        
        if not await api_key_manager.check_permissions(
            db_key,
            self.required_scope,
            client_ip,
            origin
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions"
            )
        
        # Rate limiting 확인 (Redis 사용)
        # ... rate limiting 로직 ...
        
        # 요청에 API 키 정보 추가
        request.state.api_key = db_key
        request.state.auth_method = "api_key"
        
        return api_key

# 의존성 함수들
api_key_read = APIKeyAuth(APIKeyScope.READ)
api_key_write = APIKeyAuth(APIKeyScope.WRITE)
api_key_admin = APIKeyAuth(APIKeyScope.ADMIN)
