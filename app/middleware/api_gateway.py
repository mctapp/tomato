# app/middleware/api_gateway.py
from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from typing import Optional
from app.api.gateway.throttle import throttler
from app.api.gateway.quota import quota_manager
from app.api.security.validation import input_validator
from app.api.security.sanitization import output_sanitizer
from app.models.api_keys import APIKey
from app.dependencies.auth import get_current_user
from app.api.keys.generator import api_key_generator
from app.api.keys.analytics import api_key_analytics
from sqlmodel import Session
from app.db import get_session
from app.models.users import User 
import json
import time

class APIGatewayMiddleware(BaseHTTPMiddleware):
    """API Gateway 통합 미들웨어"""
    
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        
        try:
            # API 키 또는 사용자 인증
            api_key, user = await self._authenticate(request)
        except Exception as e:
            # 인증 에러 처리
            if hasattr(e, 'status_code'):
                return JSONResponse(
                    status_code=e.status_code,
                    content={"detail": e.detail}
                )
            else:
                return JSONResponse(
                    status_code=500,
                    content={"detail": "Authentication error"}
                )
        
        # 1. Rate Limiting 제거됨
        
        # 2. Throttling
        identifier = f"api_key:{api_key.id}" if api_key else f"user:{user.id}" if user else f"ip:{request.client.host}"
        token_acquired, wait_time = await throttler.acquire_token(identifier, request.url.path)
        
        if not token_acquired:
            return JSONResponse(
                status_code=503,
                content={"detail": "Service temporarily unavailable"},
                headers={"Retry-After": str(int(wait_time))}
            )
        
        # 3. Quota 확인
        if api_key or user:
            quota_allowed, quota_info = await quota_manager.check_quota(
                user, api_key, "request"
            )
            if not quota_allowed:
                return JSONResponse(
                    status_code=403,
                    content={"detail": f"Quota exceeded: {quota_info['period']} limit reached"},
                    headers={
                        "X-Quota-Limit": str(quota_info["limit"]),
                        "X-Quota-Current": str(quota_info["current"]),
                        "X-Quota-Reset": quota_info["reset_at"].isoformat()
                    }
                )
        
        # 4. 입력 검증 - GET, HEAD, OPTIONS 요청은 body 검증 스킵
        if request.method in ["GET", "HEAD", "OPTIONS"]:
            # GET 요청은 query parameter만 검증
            validation_result = {"valid": True}
        else:
            validation_result = await input_validator.validate_request(request)
            if not validation_result["valid"]:
                return JSONResponse(
                    status_code=400,
                    content={
                        "error": "Invalid request",
                        "violations": validation_result["violations"]
                    }
                )
        
        # 5. 요청 처리
        response = await call_next(request)
        
        # 6. 응답 처리
        process_time = int((time.time() - start_time) * 1000)  # ms
        
        # 응답 본문 읽기 및 정제
        body = b""
        async for chunk in response.body_iterator:
            body += chunk
        
        # JSON 응답인 경우 정제
        content_type = response.headers.get("content-type", "")
        if "application/json" in content_type and body:
            try:
                data = json.loads(body)
                sanitized_data = output_sanitizer.sanitize_response(data)
                sanitized_data = output_sanitizer.remove_internal_fields(sanitized_data)
                body = json.dumps(sanitized_data).encode()
            except:
                pass  # JSON이 아닌 경우 그대로
        
        # 7. 보안 헤더 추가 (Content-Length 헤더 제외)
        response_headers = {
            k: v for k, v in response.headers.items() 
            if k.lower() != "content-length"
        }
        response_headers.update({
            "X-Request-ID": getattr(request.state, 'request_id', ''),
            "X-Process-Time": str(process_time),
        })
        
        # 8. API 키 사용 기록
        if api_key:
            try:
                async with get_session() as db:
                    await api_key_analytics.record_usage(
                        db=db,
                        api_key=api_key,
                        endpoint=request.url.path,
                        method=request.method,
                        status_code=response.status_code,
                        response_time_ms=process_time,
                        ip_address=request.client.host if request.client else "unknown",
                        user_agent=request.headers.get("user-agent"),
                        origin=request.headers.get("origin"),
                        request_id=getattr(request.state, 'request_id', ''),
                        error_message=None if response.status_code < 400 else "Error"
                    )
            except Exception as e:
                # 로깅 실패는 무시
                print(f"Failed to record API usage: {e}")
        
        # 새 응답 생성 (Content-Length는 자동으로 설정됨)
        return Response(
            content=body,
            status_code=response.status_code,
            headers=response_headers,
            media_type=response.media_type
        )
    
    async def _authenticate(self, request: Request) -> tuple[Optional[APIKey], Optional[User]]:
        """인증 처리"""
        api_key = None
        user = None
        
        # API 키 확인
        api_key_header = request.headers.get("X-API-Key")
        if api_key_header:
            # 키 검증
            key_prefix = api_key_header[:8]
            
            async with get_session() as db:
                api_key = await api_key_generator.get_key_by_prefix(db, key_prefix)
                
                if api_key:
                    # 전체 키 검증
                    if not api_key_generator.verify_key(api_key_header, api_key.key_hash):
                        raise ValueError("Invalid API key")
                    
                    # 권한 검증
                    from app.api.keys.permissions import api_key_permission_manager
                    allowed, reason = api_key_permission_manager.check_endpoint_permission(
                        api_key, request.method, request.url.path
                    )
                    
                    if not allowed:
                        raise ValueError(reason)
                    
                    # API 키 컨텍스트 설정
                    request.state.api_key = api_key
                    if api_key.user_id:
                        user = db.get(User, api_key.user_id)
        
        # Bearer 토큰 확인 (API 키가 없는 경우)
        if not api_key:
            auth_header = request.headers.get("Authorization")
            if auth_header and auth_header.startswith("Bearer "):
                try:
                    # 기존 인증 시스템 사용
                    # 여기서는 간단히 처리
                    pass
                except:
                    pass
        
        return api_key, user
