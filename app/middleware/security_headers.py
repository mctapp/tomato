# app/middleware/security_headers.py
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from typing import Dict, Callable
import hashlib
import secrets

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """모든 응답에 보안 헤더 추가"""
    
    def __init__(self, app, strict: bool = True):
        super().__init__(app)
        self.strict = strict
        self.nonce_generator = self._generate_nonce
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # CSP nonce 생성 (인라인 스크립트용)
        nonce = self._generate_nonce()
        request.state.csp_nonce = nonce
        
        # 요청 처리
        response = await call_next(request)
        
        # 보안 헤더 추가
        self._add_security_headers(response, nonce)
        
        return response
    
    def _generate_nonce(self) -> str:
        """CSP nonce 생성"""
        return secrets.token_urlsafe(16)
    
    def _add_security_headers(self, response: Response, nonce: str) -> None:
        """필수 보안 헤더 설정"""
        headers = {
            # XSS 방어
            "X-Content-Type-Options": "nosniff",
            "X-XSS-Protection": "1; mode=block",
            
            # Clickjacking 방어
            "X-Frame-Options": "DENY",
            
            # HTTPS 강제
            "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
            
            # Referrer 정책
            "Referrer-Policy": "strict-origin-when-cross-origin",
            
            # 권한 정책
            "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
            
            # Content Security Policy
            "Content-Security-Policy": self._build_csp(nonce),
            
            # CORP/COEP (Cross-Origin 정책)
            "Cross-Origin-Resource-Policy": "same-origin",
            "Cross-Origin-Embedder-Policy": "require-corp",
            "Cross-Origin-Opener-Policy": "same-origin",
        }
        
        # 개발 환경에서는 일부 헤더 완화
        if not self.strict:
            headers["X-Frame-Options"] = "SAMEORIGIN"
            headers["Content-Security-Policy"] = self._build_csp_dev(nonce)
        
        for key, value in headers.items():
            response.headers[key] = value
    
    def _build_csp(self, nonce: str) -> str:
        """프로덕션 CSP 정책"""
        return ";".join([
            "default-src 'self'",
            f"script-src 'self' 'nonce-{nonce}' https://cdn.jsdelivr.net",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "img-src 'self' data: https:",
            "font-src 'self' https://fonts.gstatic.com",
            "connect-src 'self' https://tomato.mct.kr wss://tomato.mct.kr",
            "media-src 'self' https://tomato-app-storage.s3.amazonaws.com",
            "object-src 'none'",
            "base-uri 'self'",
            "form-action 'self'",
            "frame-ancestors 'none'",
            "upgrade-insecure-requests",
            "block-all-mixed-content"
        ])
    
    def _build_csp_dev(self, nonce: str) -> str:
        """개발 환경 CSP (완화된 정책)"""
        return ";".join([
            "default-src 'self' 'unsafe-inline' 'unsafe-eval'",
            "connect-src 'self' http://localhost:* ws://localhost:*"
        ])
