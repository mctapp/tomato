# app/api/security/signing.py
import hmac
import hashlib
import time
from typing import Dict, Optional, Tuple
from fastapi import Request, HTTPException
from app.core.security.config import security_config
import base64

class RequestSigner:
    """요청 서명 및 검증"""
    
    def __init__(self):
        self.signature_header = "X-Signature"
        self.timestamp_header = "X-Timestamp"
        self.nonce_header = "X-Nonce"
        self.max_time_diff = 300  # 5분
    
    def generate_signature(
        self,
        method: str,
        path: str,
        timestamp: str,
        nonce: str,
        body: bytes,
        secret_key: str
    ) -> str:
        """요청 서명 생성"""
        # 서명할 데이터 구성
        message_parts = [
            method.upper(),
            path,
            timestamp,
            nonce,
            hashlib.sha256(body).hexdigest() if body else ""
        ]
        
        message = "\n".join(message_parts)
        
        # HMAC-SHA256 서명
        signature = hmac.new(
            secret_key.encode(),
            message.encode(),
            hashlib.sha256
        ).digest()
        
        # Base64 인코딩
        return base64.b64encode(signature).decode()
    
    async def verify_signature(
        self,
        request: Request,
        secret_key: str
    ) -> Tuple[bool, Optional[str]]:
        """요청 서명 검증"""
        # 헤더 확인
        signature = request.headers.get(self.signature_header)
        timestamp = request.headers.get(self.timestamp_header)
        nonce = request.headers.get(self.nonce_header)
        
        if not all([signature, timestamp, nonce]):
            return False, "Missing signature headers"
        
        # 타임스탬프 검증
        try:
            request_time = float(timestamp)
            current_time = time.time()
            
            if abs(current_time - request_time) > self.max_time_diff:
                return False, "Request timestamp too old"
        except ValueError:
            return False, "Invalid timestamp"
        
        # Nonce 중복 확인
        if not await self._check_nonce(nonce, timestamp):
            return False, "Duplicate nonce"
        
        # 바디 읽기
        body = await request.body()
        
        # 서명 생성
        expected_signature = self.generate_signature(
            method=request.method,
            path=request.url.path,
            timestamp=timestamp,
            nonce=nonce,
            body=body,
            secret_key=secret_key
        )
        
        # 서명 비교
        if not hmac.compare_digest(signature, expected_signature):
            return False, "Invalid signature"
        
        return True, None
    
    async def _check_nonce(self, nonce: str, timestamp: str) -> bool:
        """Nonce 중복 확인"""
        from app.core.redis import redis_client
        
        # Redis에 nonce 저장 (타임스탬프 기반 TTL)
        key = f"request_nonce:{nonce}"
        
        # 이미 존재하면 중복
        if await redis_client.redis.exists(key):
            return False
        
        # 새 nonce 저장
        await redis_client.set_with_expiry(key, timestamp, self.max_time_diff)
        return True
    
    def create_signed_url(
        self,
        url: str,
        expires_in: int,
        secret_key: str,
        user_id: Optional[int] = None
    ) -> str:
        """서명된 URL 생성"""
        from urllib.parse import urlparse, parse_qs, urlencode
        
        parsed = urlparse(url)
        params = parse_qs(parsed.query)
        
        # 만료 시간 추가
        expires_at = int(time.time()) + expires_in
        params["expires"] = [str(expires_at)]
        
        if user_id:
            params["uid"] = [str(user_id)]
        
        # 서명 생성
        message = f"{parsed.path}?{urlencode(params, doseq=True)}"
        signature = hmac.new(
            secret_key.encode(),
            message.encode(),
            hashlib.sha256
        ).hexdigest()
        
        params["signature"] = [signature]
        
        # 최종 URL
        signed_query = urlencode(params, doseq=True)
        return f"{parsed.scheme}://{parsed.netloc}{parsed.path}?{signed_query}"
    
    def verify_signed_url(
        self,
        url: str,
        secret_key: str
    ) -> Tuple[bool, Optional[str]]:
        """서명된 URL 검증"""
        from urllib.parse import urlparse, parse_qs, urlencode
        
        parsed = urlparse(url)
        params = parse_qs(parsed.query)
        
        # 필수 파라미터 확인
        if "expires" not in params or "signature" not in params:
            return False, "Missing required parameters"
        
        # 만료 시간 확인
        try:
            expires_at = int(params["expires"][0])
            if expires_at < time.time():
                return False, "URL expired"
        except (ValueError, IndexError):
            return False, "Invalid expiration"
        
        # 서명 추출 및 제거
        provided_signature = params["signature"][0]
        del params["signature"]
        
        # 서명 재생성
        message = f"{parsed.path}?{urlencode(params, doseq=True)}"
        expected_signature = hmac.new(
            secret_key.encode(),
            message.encode(),
            hashlib.sha256
        ).hexdigest()
        
        # 비교
        if not hmac.compare_digest(provided_signature, expected_signature):
            return False, "Invalid signature"
        
        return True, None

# 전역 서명기
request_signer = RequestSigner()
