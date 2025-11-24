# app/middleware/monitoring_integration.py
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from app.monitoring import (
    audit_logger, security_logger, rules_engine,
    metrics_collector
)
from app.monitoring.logging.structured import logger 
import time
import json
import uuid

class MonitoringMiddleware(BaseHTTPMiddleware):
    """모니터링 시스템 통합 미들웨어"""
    
    async def dispatch(self, request: Request, call_next):
        # 시작 시간
        start_time = time.time()
        
        # request_id가 없으면 생성
        if not hasattr(request.state, "request_id"):
            request.state.request_id = str(uuid.uuid4())
        
        # client_ip 추출
        client_ip = self._get_client_ip(request)
        if not hasattr(request.state, "client_ip"):
            request.state.client_ip = client_ip
        
        # 컨텍스트 준비
        context = {
            "request_id": request.state.request_id,
            "ip_address": client_ip,
            "user_id": getattr(request.state, "user_id", None),
            "session_id": getattr(request.state, "session_id", None),
        }
        
        # Request body 읽기 (필요한 경우)
        if request.method in ["POST", "PUT", "PATCH"]:
            try:
                body = await request.body()
                context["request_body"] = body.decode() if body else ""
                # Request 재구성
                request = Request(request.scope, receive=lambda: {"type": "http.request", "body": body})
            except Exception:
                # Body 읽기 실패 시 무시
                context["request_body"] = ""
        
        try:
            # 위협 탐지 (요청 전)
            threats = await rules_engine.evaluate(request, context)
            if threats:
                for threat in threats:
                    if threat["severity"] in ["HIGH", "CRITICAL"]:
                        # 요청 차단
                        return Response(
                            content=json.dumps({"error": "Request blocked for security reasons"}),
                            status_code=403,
                            media_type="application/json"
                        )
            
            # 요청 처리
            response = await call_next(request)
            
            # 처리 시간
            process_time = time.time() - start_time
            
            # 메트릭 기록
            metrics_collector.record_http_request(
                method=request.method,
                endpoint=request.url.path,
                status=response.status_code,
                duration=process_time,
                request_size=int(request.headers.get("content-length", 0))
            )
            
            # 감사 로그
            await audit_logger.log_action(
                request_id=context["request_id"],
                action=f"{request.method}_{request.url.path}",
                user_id=context["user_id"],
                session_id=context["session_id"],
                method=request.method,
                path=request.url.path,
                ip_address=context["ip_address"],
                user_agent=request.headers.get("user-agent"),
                status_code=response.status_code,
                response_time_ms=int(process_time * 1000)
            )
            
            # 보안 이벤트 확인
            if response.status_code == 401:
                await security_logger.log_permission_denied(
                    user_id=context["user_id"],
                    resource=request.url.path,
                    action=request.method,
                    ip_address=context["ip_address"],
                    required_permission="authentication"
                )
            
            return response
            
        except Exception as e:
            # 에러 로깅
            logger.error(
                "request_failed",
                error=str(e),
                error_type=type(e).__name__,
                **context
            )
            
            # 에러 메트릭
            metrics_collector.record_http_request(
                method=request.method,
                endpoint=request.url.path,
                status=500,
                duration=time.time() - start_time,
                request_size=0
            )
            
            raise
    
    def _get_client_ip(self, request: Request) -> str:
        """실제 클라이언트 IP 추출"""
        # 프록시 헤더 확인
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            # 첫 번째 IP가 실제 클라이언트
            return forwarded_for.split(",")[0].strip()
        
        # 직접 연결
        return request.client.host if request.client else "unknown"
