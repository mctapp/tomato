# app/middleware/zero_trust.py
from fastapi import Request, Response, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from app.auth.zero_trust.flow import ZeroTrustFlow
from app.auth.zero_trust.context import AuthContext
from app.core.redis import redis_client
import json

class ZeroTrustMiddleware(BaseHTTPMiddleware):
    """Zero Trust 보안 검증 미들웨어"""
    
    def __init__(self, app):
        super().__init__(app)
        self.zero_trust_flow = ZeroTrustFlow()
        self.skip_paths = [
            "/api/auth/login",
            "/api/auth/mfa/verify",
            "/health",
            "/docs",
            "/_next",
            "/public"
        ]
    
    async def dispatch(self, request: Request, call_next):
        # 스킵할 경로 확인
        if any(request.url.path.startswith(path) for path in self.skip_paths):
            return await call_next(request)
        
        # 인증된 사용자만 Zero Trust 검증
        if not hasattr(request.state, "user") or not request.state.user:
            return await call_next(request)
        
        try:
            # Zero Trust 검증
            result = await self.zero_trust_flow.authenticate(
                request=request,
                credentials={"user": request.state.user}
            )
            
            # 결과에 따른 처리
            if result["status"] == "mfa_required":
                return Response(
                    content=json.dumps({
                        "error": "Additional authentication required",
                        "mfa_required": True
                    }),
                    status_code=403,
                    media_type="application/json"
                )
            
            # 위험도를 request state에 저장
            request.state.risk_level = result.get("risk_level", "LOW")
            
        except HTTPException:
            raise
        except Exception as e:
            # Zero Trust 실패 시 기본 동작 허용 (로깅만)
            print(f"Zero Trust verification failed: {e}")
        
        return await call_next(request)
