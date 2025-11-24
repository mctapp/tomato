# app/api/security/sanitization.py
from typing import Any, Dict, List, Union
import html
import re
import json
from app.core.security.constants import SENSITIVE_FIELDS

class OutputSanitizer:
    """출력 데이터 정제"""
    
    def __init__(self):
        self.html_escape_fields = ["description", "content", "message", "title"]
        self.url_fields = ["url", "link", "href", "redirect_url"]
        self.sensitive_fields = SENSITIVE_FIELDS
    
    def sanitize_response(self, data: Any, content_type: str = "application/json") -> Any:
        """응답 데이터 정제"""
        if content_type == "application/json":
            return self._sanitize_json(data)
        elif content_type.startswith("text/"):
            return self._sanitize_text(data)
        else:
            return data
    
    def _sanitize_json(self, data: Any, path: str = "") -> Any:
        """JSON 데이터 정제"""
        if isinstance(data, dict):
            sanitized = {}
            for key, value in data.items():
                current_path = f"{path}.{key}" if path else key
                
                # 민감한 필드 마스킹
                if key.lower() in self.sensitive_fields:
                    sanitized[key] = self._mask_sensitive_value(value)
                else:
                    sanitized[key] = self._sanitize_json(value, current_path)
            
            return sanitized
            
        elif isinstance(data, list):
            return [self._sanitize_json(item, f"{path}[]") for item in data]
            
        elif isinstance(data, str):
            # 필드별 정제
            field_name = path.split(".")[-1] if path else ""
            
            if field_name in self.html_escape_fields:
                return html.escape(data)
            elif field_name in self.url_fields:
                return self._sanitize_url(data)
            else:
                return self._sanitize_string(data)
                
        else:
            return data
    
    def _mask_sensitive_value(self, value: Any) -> str:
        """민감한 값 마스킹"""
        if isinstance(value, str):
            if len(value) <= 4:
                return "****"
            elif len(value) <= 8:
                return value[:2] + "*" * (len(value) - 2)
            else:
                return value[:3] + "*" * (len(value) - 6) + value[-3:]
        else:
            return "****"
    
    def _sanitize_string(self, text: str) -> str:
        """일반 문자열 정제"""
        # Null 바이트 제거
        text = text.replace('\x00', '')
        
        # 제어 문자 제거 (탭, 줄바꿈 제외)
        text = re.sub(r'[\x01-\x08\x0B-\x0C\x0E-\x1F\x7F]', '', text)
        
        # Unicode 정규화
        import unicodedata
        text = unicodedata.normalize('NFKC', text)
        
        return text
    
    def _sanitize_url(self, url: str) -> str:
        """URL 정제"""
        # 위험한 스킴 차단
        dangerous_schemes = ['javascript:', 'vbscript:', 'data:', 'file:']
        
        url_lower = url.lower().strip()
        for scheme in dangerous_schemes:
            if url_lower.startswith(scheme):
                return ""
        
        # URL 인코딩
        from urllib.parse import quote
        return quote(url, safe=':/?#[]@!$&\'()*+,;=')
    
    def _sanitize_text(self, text: str) -> str:
        """텍스트 데이터 정제"""
        return self._sanitize_string(text)
    
    def remove_internal_fields(self, data: Any, internal_fields: List[str] = None) -> Any:
        """내부 필드 제거"""
        if internal_fields is None:
            internal_fields = [
                "_sa_instance_state",
                "hashed_password",
                "password_hash",
                "api_key",
                "secret_key",
                "__pydantic_private__"
            ]
        
        if isinstance(data, dict):
            return {
                k: self.remove_internal_fields(v, internal_fields)
                for k, v in data.items()
                if k not in internal_fields and not k.startswith("_")
            }
        elif isinstance(data, list):
            return [self.remove_internal_fields(item, internal_fields) for item in data]
        else:
            return data
    
    def add_security_headers(self, headers: Dict[str, str], content_type: str) -> Dict[str, str]:
        """보안 헤더 추가"""
        security_headers = {
            "X-Content-Type-Options": "nosniff",
            "Cache-Control": "no-store, no-cache, must-revalidate, private",
            "Pragma": "no-cache",
            "X-XSS-Protection": "1; mode=block"
        }
        
        # 콘텐츠 타입별 추가 헤더
        if content_type == "application/json":
            security_headers["Content-Type"] = "application/json; charset=utf-8"
        
        headers.update(security_headers)
        return headers

# 전역 정제기
output_sanitizer = OutputSanitizer()
