# app/core/security/validators.py
"""보안 검증 로직"""

import re
from typing import List, Optional, Dict
from datetime import datetime, timedelta
import secrets
import string
import logging
from email_validator import validate_email, EmailNotValidError
import redis.asyncio as redis

from .config import security_config
from .constants import REGEX_PATTERNS, RESERVED_USERNAMES, SENSITIVE_FIELDS
from app.config import settings

# 로거 설정
logger = logging.getLogger(__name__)

class PasswordValidator:
    """비밀번호 검증 클래스"""
    
    @staticmethod
    def validate(password: str) -> tuple[bool, List[str]]:
        """
        비밀번호 검증
        Returns: (valid: bool, errors: List[str])
        """
        errors = []
        
        # 길이 검증
        if len(password) < security_config.PASSWORD_MIN_LENGTH:
            errors.append(f"비밀번호는 최소 {security_config.PASSWORD_MIN_LENGTH}자 이상이어야 합니다")
        
        # 대문자 검증
        if security_config.PASSWORD_REQUIRE_UPPERCASE and not re.search(r"[A-Z]", password):
            errors.append("대문자를 포함해야 합니다")
        
        # 소문자 검증
        if security_config.PASSWORD_REQUIRE_LOWERCASE and not re.search(r"[a-z]", password):
            errors.append("소문자를 포함해야 합니다")
        
        # 숫자 검증
        if security_config.PASSWORD_REQUIRE_NUMBERS and not re.search(r"\d", password):
            errors.append("숫자를 포함해야 합니다")
        
        # 특수문자 검증
        if security_config.PASSWORD_REQUIRE_SPECIAL and not re.search(r"[@$!%*?&]", password):
            errors.append("특수문자(@$!%*?&)를 포함해야 합니다")
        
        # 일반적인 패턴 검증
        common_patterns = ["12345", "password", "qwerty", "abc123"]
        for pattern in common_patterns:
            if pattern in password.lower():
                errors.append("일반적인 패턴은 사용할 수 없습니다")
                break
        
        return len(errors) == 0, errors
    
    @staticmethod
    def check_password_history(password: str, password_history: List[str]) -> bool:
        """이전 비밀번호 재사용 체크"""
        # 실제 구현에서는 bcrypt로 해시된 비밀번호와 비교
        return password not in password_history[-security_config.PASSWORD_HISTORY_COUNT:]
    
    @staticmethod
    def generate_strong_password(length: int = 16) -> str:
        """강력한 비밀번호 생성"""
        characters = ""
        if security_config.PASSWORD_REQUIRE_UPPERCASE:
            characters += string.ascii_uppercase
        if security_config.PASSWORD_REQUIRE_LOWERCASE:
            characters += string.ascii_lowercase
        if security_config.PASSWORD_REQUIRE_NUMBERS:
            characters += string.digits
        if security_config.PASSWORD_REQUIRE_SPECIAL:
            characters += "@$!%*?&"
        
        # 각 카테고리에서 최소 하나씩 포함
        password = []
        if security_config.PASSWORD_REQUIRE_UPPERCASE:
            password.append(secrets.choice(string.ascii_uppercase))
        if security_config.PASSWORD_REQUIRE_LOWERCASE:
            password.append(secrets.choice(string.ascii_lowercase))
        if security_config.PASSWORD_REQUIRE_NUMBERS:
            password.append(secrets.choice(string.digits))
        if security_config.PASSWORD_REQUIRE_SPECIAL:
            password.append(secrets.choice("@$!%*?&"))
        
        # 나머지 길이 채우기
        for _ in range(length - len(password)):
            password.append(secrets.choice(characters))
        
        # 섞기
        secrets.SystemRandom().shuffle(password)
        return ''.join(password)

class EmailValidator:
    """이메일 검증 클래스"""
    
    @staticmethod
    def validate(email: str) -> tuple[bool, Optional[str]]:
        """이메일 검증"""
        try:
            # email-validator 라이브러리 사용
            validation = validate_email(email, check_deliverability=False)
            email = validation.email
            return True, email
        except EmailNotValidError as e:
            return False, str(e)

class UsernameValidator:
    """사용자명 검증 클래스"""
    
    @staticmethod
    def validate(username: str) -> tuple[bool, List[str]]:
        """사용자명 검증"""
        errors = []
        
        # 길이 검증
        if len(username) < 3 or len(username) > 20:
            errors.append("사용자명은 3-20자 사이여야 합니다")
        
        # 패턴 검증 (영문, 숫자, 언더스코어만)
        if not re.match(r"^[a-zA-Z0-9_]+$", username):
            errors.append("사용자명은 영문, 숫자, 언더스코어만 사용 가능합니다")
        
        # 예약어 검증
        if username.lower() in RESERVED_USERNAMES:
            errors.append("해당 사용자명은 사용할 수 없습니다")
        
        return len(errors) == 0, errors

class TokenValidator:
    """토큰 검증 클래스"""
    
    @staticmethod
    def generate_api_key() -> str:
        """API 키 생성"""
        alphabet = string.ascii_letters + string.digits
        return ''.join(secrets.choice(alphabet) for _ in range(security_config.API_KEY_LENGTH))
    
    @staticmethod
    def validate_api_key(api_key: str) -> bool:
        """API 키 형식 검증"""
        return bool(re.match(REGEX_PATTERNS["api_key"], api_key))
    
    @staticmethod
    def generate_secure_token(length: int = 32) -> str:
        """보안 토큰 생성"""
        return secrets.token_urlsafe(length)

class FileValidator:
    """파일 검증 클래스"""
    
    @staticmethod
    def validate_file_extension(filename: str) -> bool:
        """파일 확장자 검증"""
        ext = filename.lower().split('.')[-1] if '.' in filename else ''
        return f".{ext}" in security_config.ALLOWED_FILE_EXTENSIONS
    
    @staticmethod
    def validate_file_size(file_size_bytes: int) -> bool:
        """파일 크기 검증"""
        max_size_bytes = security_config.MAX_UPLOAD_SIZE_MB * 1024 * 1024
        return file_size_bytes <= max_size_bytes

class InputSanitizer:
    """입력 값 정제 클래스"""
    
    @staticmethod
    def sanitize_html(text: str) -> str:
        """HTML 태그 제거"""
        # 간단한 구현. 실제로는 bleach 라이브러리 사용 권장
        import html
        return html.escape(text)
    
    @staticmethod
    def sanitize_filename(filename: str) -> str:
        """파일명 정제"""
        # 위험한 문자 제거
        dangerous_chars = ['/', '\\', '..', '~', '|', '<', '>', ':', '*', '?', '"']
        for char in dangerous_chars:
            filename = filename.replace(char, '')
        return filename.strip()
    
    @staticmethod
    def mask_sensitive_data(data: Dict, fields: Optional[set] = None) -> Dict:
        """민감한 데이터 마스킹"""
        if fields is None:
            fields = SENSITIVE_FIELDS
        
        masked_data = data.copy()
        for key, value in masked_data.items():
            if key.lower() in fields and value:
                if isinstance(value, str):
                    masked_data[key] = value[:3] + "*" * (len(value) - 3)
                else:
                    masked_data[key] = "***"
        return masked_data

class RateLimiter:
    """Redis 기반 요청 제한 검증 클래스"""
    
    def __init__(self):
        self._redis_client: Optional[redis.Redis] = None
    
    async def get_redis(self) -> Optional[redis.Redis]:
        """Redis 클라이언트 가져오기"""
        if self._redis_client is None:
            if settings.REDIS_URL:
                self._redis_client = redis.from_url(
                    settings.REDIS_URL,
                    password=settings.REDIS_PASSWORD.get_secret_value() if settings.REDIS_PASSWORD else None,
                    db=settings.REDIS_DB,
                    decode_responses=settings.REDIS_DECODE_RESPONSES
                )
        return self._redis_client
    
    async def check_rate_limit(self, identifier: str, window_minutes: int = 1) -> tuple[bool, int]:
        """
        요청 제한 체크 (Redis 기반)
        Returns: (allowed: bool, remaining: int)
        """
        redis_client = await self.get_redis()
        if redis_client is None:
            # Redis가 없으면 제한 없음
            return True, 999
        
        try:
            key = f"rate_limit:{identifier}:{window_minutes}"
            window_seconds = window_minutes * 60
            limit = security_config.RATE_LIMIT_PER_MINUTE if window_minutes == 1 else security_config.RATE_LIMIT_PER_HOUR
            
            # Redis 파이프라인 사용
            async with redis_client.pipeline() as pipe:
                # 현재 카운트 증가
                await pipe.incr(key)
                # TTL 설정
                await pipe.expire(key, window_seconds)
                # 실행
                results = await pipe.execute()
                
            current_count = results[0]
            
            if current_count > limit:
                return False, 0
            
            return True, limit - current_count
            
        except Exception as e:
            logger.error(f"Redis rate limit error: {e}")
            # Redis 오류 시 제한 없음 (fail-open)
            return True, 999
    
    async def reset_rate_limit(self, identifier: str):
        """특정 식별자의 요청 제한 초기화"""
        redis_client = await self.get_redis()
        if redis_client:
            pattern = f"rate_limit:{identifier}:*"
            async for key in redis_client.scan_iter(match=pattern):
                await redis_client.delete(key)
    
    async def close(self):
        """Redis 연결 종료"""
        if self._redis_client:
            await self._redis_client.close()
            self._redis_client = None
