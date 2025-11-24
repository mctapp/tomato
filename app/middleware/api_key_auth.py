"""API 키 인증 미들웨어"""
from fastapi import Request, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
from sqlmodel import Session
from app.db import get_session
from app.auth.api_keys.manager import APIKeyManager
from app.models.api_keys import APIKeyScope
import time

class APIKeyAuth(HTTPBearer):
    """API 키 인증"""
    
    def __init__(self, auto_error: bool = True):
        super().__init__(auto_error=auto_error)
    
    async def __call__(self, request: Request) -> Optional[HTTPAuthorizationCredentials]:
        # Bearer 토큰 확인
        credentials = await super().__call__(request)
        
        if credentials:
            # API 키 형식 확인 (tk_로 시작)
            if credentials.credentials.startswith("tk_"):
                return credentials
        
        # X-API-Key 헤더 확인
        api_key = request.headers.get("X-API-Key")
        if api_key and api_key.startswith("tk_"):
            return HTTPAuthorizationCredentials(scheme="Bearer", credentials=api_key)
        
        if self.auto_error:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Invalid API Key"
            )
        
        return None

api_key_auth = APIKeyAuth()

async def verify_api_key(
    request: Request,
    credentials: HTTPAuthorizationCredentials = None,
    required_scope: APIKeyScope = APIKeyScope.READ
) -> Optional[dict]:
    """API 키 검증 및 권한 확인"""
    if not credentials:
        return None
    
    # 세션 가져오기
    db = next(get_session())
    manager = APIKeyManager(db)
    
    try:
        # API 키 검증
        api_key = await manager.validate_api_key(credentials.credentials)
        if not api_key:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired API key"
            )
        
        # 권한 확인
        client_ip = request.client.host if request.client else "unknown"
        origin = request.headers.get("Origin")
        
        has_permission = await manager.check_permissions(
            api_key=api_key,
            required_scope=required_scope,
            request_ip=client_ip,
            origin=origin
        )
        
        if not has_permission:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions"
            )
        
        # 요청 컨텍스트에 API 키 정보 저장
        request.state.api_key = api_key
        request.state.api_key_id = api_key.id
        request.state.auth_method = "api_key"
        
        # 사용 로그 (비동기로 처리)
        start_time = time.time()
        
        async def log_usage():
            response_time = int((time.time() - start_time) * 1000)
            await manager.log_usage(
                api_key=api_key,
                endpoint=str(request.url.path),
                method=request.method,
                status_code=200,  # 실제 응답 코드로 업데이트 필요
                response_time_ms=response_time,
                request_ip=client_ip,
                user_agent=request.headers.get("User-Agent"),
                origin=origin,
                request_id=getattr(request.state, "request_id", "unknown")
            )
        
        # 백그라운드 태스크로 추가
        request.state.background_tasks = getattr(request.state, "background_tasks", [])
        request.state.background_tasks.append(log_usage)
        
        return {
            "api_key_id": api_key.id,
            "user_id": api_key.user_id,
            "scopes": api_key.scopes,
            "type": api_key.key_type
        }
        
    finally:
        db.close()
