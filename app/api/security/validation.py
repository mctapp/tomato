# app/api/security/validation.py
from typing import Dict, List, Any, Optional
from fastapi import Request, HTTPException
from pydantic import BaseModel, validator
import re
from app.core.security.constants import REGEX_PATTERNS
from app.monitoring.threat_detection.patterns import AttackPattern
import json

class InputValidator:
    """입력 데이터 검증"""
    
    def __init__(self):
        self.attack_patterns = AttackPattern.compile_patterns()
        
        # 콘텐츠 타입별 검증기
        self.content_validators = {
            "application/json": self._validate_json,
            "application/x-www-form-urlencoded": self._validate_form,
            "multipart/form-data": self._validate_multipart,
            "text/plain": self._validate_text
        }
    
    async def validate_request(self, request: Request) -> Dict[str, Any]:
        """요청 전체 검증"""
        violations = []
        
        # 1. 헤더 검증
        header_violations = self._validate_headers(request.headers)
        violations.extend(header_violations)
        
        # 2. URL 파라미터 검증
        query_violations = self._validate_query_params(str(request.url.query))
        violations.extend(query_violations)
        
        # 3. 경로 파라미터 검증
        path_violations = self._validate_path_params(request.path_params)
        violations.extend(path_violations)
        
        # 4. 바디 검증
        content_type = request.headers.get("content-type", "").split(";")[0]
        if content_type in self.content_validators:
            body = await request.body()
            body_violations = await self.content_validators[content_type](body, request)
            violations.extend(body_violations)
        
        # 5. 공격 패턴 검사
        attack_detected = self._check_attack_patterns(request)
        if attack_detected:
            violations.append({
                "type": "attack_pattern",
                "severity": "critical",
                "details": attack_detected
            })
        
        return {
            "valid": len(violations) == 0,
            "violations": violations
        }
    
    def _validate_headers(self, headers: Dict[str, str]) -> List[Dict]:
        """헤더 검증"""
        violations = []
        
        # 필수 헤더
        required_headers = ["user-agent"]
        for header in required_headers:
            if header not in headers:
                violations.append({
                    "field": f"header.{header}",
                    "type": "missing_required",
                    "message": f"Missing required header: {header}"
                })
        
        # 헤더 값 크기 제한
        for name, value in headers.items():
            if len(value) > 8192:  # 8KB
                violations.append({
                    "field": f"header.{name}",
                    "type": "size_limit",
                    "message": f"Header value too large: {len(value)} bytes"
                })
            
            # 위험한 문자 확인
            if self._contains_dangerous_chars(value):
                violations.append({
                    "field": f"header.{name}",
                    "type": "dangerous_content",
                    "message": "Header contains dangerous characters"
                })
        
        return violations
    
    def _validate_query_params(self, query_string: str) -> List[Dict]:
        """쿼리 파라미터 검증"""
        violations = []
        
        if not query_string:
            return violations
        
        # 전체 길이 제한
        if len(query_string) > 2048:
            violations.append({
                "field": "query",
                "type": "size_limit",
                "message": f"Query string too long: {len(query_string)} bytes"
            })
        
        # 파라미터 파싱
        try:
            params = {}
            for param in query_string.split("&"):
                if "=" in param:
                    key, value = param.split("=", 1)
                    if key in params:
                        # 중복 파라미터
                        violations.append({
                            "field": f"query.{key}",
                            "type": "duplicate",
                            "message": f"Duplicate parameter: {key}"
                        })
                    params[key] = value
                    
                    # 값 검증
                    if self._contains_dangerous_chars(value):
                        violations.append({
                            "field": f"query.{key}",
                            "type": "dangerous_content",
                            "message": "Parameter contains dangerous characters"
                        })
        except Exception as e:
            violations.append({
                "field": "query",
                "type": "parse_error",
                "message": str(e)
            })
        
        return violations
    
    def _validate_path_params(self, path_params: Dict[str, Any]) -> List[Dict]:
        """경로 파라미터 검증"""
        violations = []
        
        for name, value in path_params.items():
            # ID 파라미터 검증
            if name.endswith("_id") or name == "id":
                if not isinstance(value, (int, str)):
                    violations.append({
                        "field": f"path.{name}",
                        "type": "invalid_type",
                        "message": "ID must be integer or string"
                    })
                elif isinstance(value, str) and not value.isdigit():
                    # UUID 패턴 확인
                    uuid_pattern = r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
                    if not re.match(uuid_pattern, value, re.IGNORECASE):
                        violations.append({
                            "field": f"path.{name}",
                            "type": "invalid_format",
                            "message": "Invalid ID format"
                        })
        
        return violations
    
    async def _validate_json(self, body: bytes, request: Request) -> List[Dict]:
        """JSON 바디 검증"""
        violations = []
        
        try:
            data = json.loads(body)
            
            # 최대 깊이 제한
            if self._get_json_depth(data) > 10:
                violations.append({
                    "field": "body",
                    "type": "depth_limit",
                    "message": "JSON nesting too deep"
                })
            
            # 크기 제한
            if len(body) > 1024 * 1024:  # 1MB
                violations.append({
                    "field": "body",
                    "type": "size_limit",
                    "message": f"Request body too large: {len(body)} bytes"
                })
            
            # 필드별 검증
            violations.extend(self._validate_json_fields(data))
            
        except json.JSONDecodeError as e:
            violations.append({
                "field": "body",
                "type": "parse_error",
                "message": f"Invalid JSON: {str(e)}"
            })
        
        return violations
    
    def _validate_json_fields(self, data: Any, path: str = "body") -> List[Dict]:
        """JSON 필드 재귀 검증"""
        violations = []
        
        if isinstance(data, dict):
            for key, value in data.items():
                # 키 이름 검증
                if not re.match(r'^[a-zA-Z0-9_-]+$', key):
                    violations.append({
                        "field": f"{path}.{key}",
                        "type": "invalid_key",
                        "message": "Invalid field name"
                    })
                
                # 재귀 검증
                violations.extend(self._validate_json_fields(value, f"{path}.{key}"))
                
        elif isinstance(data, list):
            for i, item in enumerate(data):
                violations.extend(self._validate_json_fields(item, f"{path}[{i}]"))
                
        elif isinstance(data, str):
            # 문자열 검증
            if len(data) > 65536:  # 64KB
                violations.append({
                    "field": path,
                    "type": "size_limit",
                    "message": "String too long"
                })
            
            # 특수 필드 검증
            if path.endswith("email"):
                if not re.match(REGEX_PATTERNS["email"], data):
                    violations.append({
                        "field": path,
                        "type": "invalid_format",
                        "message": "Invalid email format"
                    })
        
        return violations
    
    def _contains_dangerous_chars(self, value: str) -> bool:
        """위험한 문자 포함 여부"""
        dangerous_patterns = [
            r'<script',
            r'javascript:',
            r'vbscript:',
            r'onload=',
            r'onerror=',
            r'onclick=',
            r'\x00',  # Null byte
            r'\.\./',  # Path traversal
            r'%00',  # URL encoded null
        ]
        
        value_lower = value.lower()
        return any(re.search(pattern, value_lower) for pattern in dangerous_patterns)
    
    def _check_attack_patterns(self, request: Request) -> Optional[Dict]:
        """공격 패턴 검사"""
        # URL과 쿼리 검사
        full_url = str(request.url)
        
        for attack_type, patterns in self.attack_patterns.items():
            for pattern in patterns:
                if pattern.search(full_url):
                    return {
                        "attack_type": attack_type.value,
                        "matched_pattern": pattern.pattern,
                        "location": "url"
                    }
        
        return None
    
    def _get_json_depth(self, obj: Any, current_depth: int = 0) -> int:
        """JSON 객체 깊이 계산"""
        if isinstance(obj, dict):
            if not obj:
                return current_depth
            return max(self._get_json_depth(v, current_depth + 1) for v in obj.values())
        elif isinstance(obj, list):
            if not obj:
                return current_depth
            return max(self._get_json_depth(item, current_depth + 1) for item in obj)
        else:
            return current_depth
    
    async def _validate_form(self, body: bytes, request: Request) -> List[Dict]:
        """폼 데이터 검증"""
        # URL 인코딩된 폼 데이터 검증
        violations = []
        # 구현 생략 (JSON과 유사)
        return violations
    
    async def _validate_multipart(self, body: bytes, request: Request) -> List[Dict]:
        """멀티파트 데이터 검증"""
        violations = []
        # 파일 업로드 검증 로직
        # 구현 생략
        return violations
    
    async def _validate_text(self, body: bytes, request: Request) -> List[Dict]:
        """텍스트 데이터 검증"""
        violations = []
        # 일반 텍스트 검증
        # 구현 생략
        return violations

# 전역 검증기
input_validator = InputValidator()
