# app/monitoring/logging/structured.py
import structlog
from typing import Any, Dict, Optional
import json
import sys
from datetime import datetime

# pythonjsonlogger가 없을 경우 대체
try:
    from pythonjsonlogger import jsonlogger
except ImportError:
    jsonlogger = None

# settings import
try:
    from app.config import settings
except ImportError:
    settings = None

class StructuredLogger:
    """구조화된 로깅 시스템"""
    
    def __init__(self, service_name: str = "tomato-api"):
        self.service_name = service_name
        self._configure_structlog()
    
    def _configure_structlog(self):
        """structlog 설정"""
        
        # JSON 포맷터 (pythonjsonlogger가 있을 때만 사용)
        if jsonlogger:
            json_formatter = jsonlogger.JsonFormatter(
                "%(timestamp)s %(level)s %(name)s %(message)s",
                timestamp=True
            )
        
        # 프로세서 체인
        processors = [
            structlog.stdlib.filter_by_level,
            structlog.stdlib.add_logger_name,
            structlog.stdlib.add_log_level,
            structlog.stdlib.PositionalArgumentsFormatter(),
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            structlog.processors.UnicodeDecoder(),
            self._add_service_context,
            self._mask_sensitive_data,
            structlog.processors.JSONRenderer()
        ]
        
        structlog.configure(
            processors=processors,
            context_class=dict,
            logger_factory=structlog.stdlib.LoggerFactory(),
            cache_logger_on_first_use=True,
        )
    
    def _add_service_context(self, logger, method_name, event_dict):
        """서비스 컨텍스트 추가"""
        event_dict["service"] = self.service_name
        if settings:
            event_dict["environment"] = getattr(settings, 'ENVIRONMENT', 'development')
            event_dict["version"] = getattr(settings, 'VERSION', '1.0.0')
        else:
            event_dict["environment"] = 'development'
            event_dict["version"] = '1.0.0'
        return event_dict
    
    def _mask_sensitive_data(self, logger, method_name, event_dict):
        """민감한 데이터 마스킹"""
        try:
            from app.core.security.constants import SENSITIVE_FIELDS
        except ImportError:
            # SENSITIVE_FIELDS가 없으면 기본값 사용
            SENSITIVE_FIELDS = [
                'password', 'hashed_password', 'token', 'api_key', 
                'secret', 'private_key', 'credit_card', 'ssn'
            ]
        
        def mask_value(value: Any) -> Any:
            """값 마스킹"""
            if isinstance(value, str) and len(value) > 3:
                return value[:3] + "*" * (len(value) - 3)
            else:
                return "***"
        
        def mask_dict(d: dict) -> dict:
            """딕셔너리 마스킹"""
            masked = {}
            for key, value in d.items():
                if key.lower() in SENSITIVE_FIELDS:
                    masked[key] = mask_value(value)
                elif isinstance(value, dict):
                    masked[key] = mask_dict(value)
                elif isinstance(value, str):
                    # JSON 문자열인 경우 파싱해서 마스킹
                    if key == "request_body" and value.startswith("{"):
                        try:
                            parsed = json.loads(value)
                            masked_parsed = mask_dict(parsed)
                            masked[key] = json.dumps(masked_parsed)
                        except:
                            masked[key] = value
                    else:
                        masked[key] = value
                else:
                    masked[key] = value
            return masked
        
        return mask_dict(event_dict)
    
    def get_logger(self, name: Optional[str] = None) -> structlog.BoundLogger:
        """로거 인스턴스 반환"""
        return structlog.get_logger(name or self.service_name)

# 전역 로거
logger = StructuredLogger().get_logger()
