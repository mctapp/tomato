# app/middleware/request_id.py
import uuid
import time
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

# structlog이 설치되어 있지 않을 경우 대체
try:
    import structlog
    logger = structlog.get_logger()
except ImportError:
    import logging
    logger = logging.getLogger(__name__)
    # structlog 대체 구현
    class structlog:
        @staticmethod
        class contextvars:
            @staticmethod
            def bind_contextvars(**kwargs):
                pass
            @staticmethod
            def unbind_contextvars(*args):
                pass

class RequestIDMiddleware(BaseHTTPMiddleware):
    """모든 요청에 고유 ID 부여 및 추적"""
    
    async def dispatch(self, request: Request, call_next):
        # 요청 ID 생성 또는 기존 ID 사용 (분산 추적)
        request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
        
        # 클라이언트 IP 추출
        client_ip = self._get_client_ip(request)
        
        # 요청 컨텍스트 설정
        request.state.request_id = request_id
        request.state.start_time = time.time()
        request.state.client_ip = client_ip
        
        # 구조화된 로깅 컨텍스트
        structlog.contextvars.bind_contextvars(
            request_id=request_id,
            method=request.method,
            path=request.url.path,
            client_ip=client_ip,
            user_agent=request.headers.get("User-Agent", "")
        )
        
        try:
            # 요청 처리
            response = await call_next(request)
            
            # 응답 시간 계산
            process_time = time.time() - request.state.start_time
            
            # 응답 헤더에 추가
            response.headers["X-Request-ID"] = request_id
            response.headers["X-Process-Time"] = f"{process_time:.3f}"
            
            # 요청 로깅
            await self._log_request(request, response, process_time)
            
            return response
            
        except Exception as e:
            # 오류 로깅
            if hasattr(logger, 'error'):
                logger.error(
                    "request_failed",
                    error=str(e),
                    error_type=type(e).__name__
                )
            else:
                logger.error(f"request_failed: {e} ({type(e).__name__})")
            raise
        finally:
            # 컨텍스트 정리
            structlog.contextvars.unbind_contextvars(
                "request_id", "method", "path", "client_ip", "user_agent"
            )
    
    def _get_client_ip(self, request: Request) -> str:
        """실제 클라이언트 IP 추출"""
        # 프록시 헤더 확인 (신뢰할 수 있는 프록시만)
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            # 첫 번째 IP가 실제 클라이언트
            return forwarded_for.split(",")[0].strip()
        
        # 직접 연결
        return request.client.host if request.client else "unknown"
    
    async def _log_request(self, request: Request, response: Response, process_time: float):
        """구조화된 요청 로그"""
        if hasattr(logger, 'info'):
            logger.info(
                "http_request",
                status_code=response.status_code,
                process_time=f"{process_time:.3f}s",
                request_size=request.headers.get("Content-Length", 0),
                response_size=response.headers.get("Content-Length", 0)
            )
        else:
            logger.info(
                f"http_request: {request.method} {request.url.path} - "
                f"status: {response.status_code}, time: {process_time:.3f}s"
            )
