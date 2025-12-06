# app/core/security/config.py
"""보안 설정 정의"""

from typing import Set
from pydantic import BaseModel
import os


class SecurityConfig(BaseModel):
    """보안 관련 설정"""

    # 비밀번호 정책
    PASSWORD_MIN_LENGTH: int = 12
    PASSWORD_REQUIRE_UPPERCASE: bool = True
    PASSWORD_REQUIRE_LOWERCASE: bool = True
    PASSWORD_REQUIRE_NUMBERS: bool = True
    PASSWORD_REQUIRE_SPECIAL: bool = True
    PASSWORD_HISTORY_COUNT: int = 5  # 최근 N개 비밀번호 재사용 금지
    PASSWORD_EXPIRY_DAYS: int = 90  # 비밀번호 만료 기간

    # API 키 설정
    API_KEY_LENGTH: int = 32

    # 파일 업로드 설정
    ALLOWED_FILE_EXTENSIONS: Set[str] = {
        ".jpg", ".jpeg", ".png", ".gif", ".webp",  # 이미지
        ".mp4", ".webm", ".mov", ".avi",  # 비디오
        ".mp3", ".wav", ".aac", ".flac",  # 오디오
        ".pdf", ".doc", ".docx", ".xlsx", ".xls",  # 문서
        ".srt", ".vtt", ".ass",  # 자막
        ".zip", ".tar", ".gz",  # 압축 파일
    }
    MAX_UPLOAD_SIZE_MB: int = 500  # 500MB

    # 요청 제한 (Rate Limiting)
    RATE_LIMIT_PER_MINUTE: int = 60
    RATE_LIMIT_PER_HOUR: int = 1000

    # 세션 설정
    SESSION_TIMEOUT_MINUTES: int = 60
    MAX_CONCURRENT_SESSIONS: int = 5

    # 로그인 시도 제한
    MAX_LOGIN_ATTEMPTS: int = 5
    LOCKOUT_DURATION_MINUTES: int = 15

    # JWT 설정
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24시간
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # MFA 설정
    MFA_CODE_LENGTH: int = 6
    MFA_CODE_EXPIRY_SECONDS: int = 300  # 5분

    class Config:
        frozen = True  # Immutable


# 환경 변수에서 오버라이드 가능한 설정 로드
def load_security_config() -> SecurityConfig:
    """환경 변수를 기반으로 보안 설정 로드"""
    return SecurityConfig(
        PASSWORD_MIN_LENGTH=int(os.getenv("SECURITY_PASSWORD_MIN_LENGTH", "12")),
        PASSWORD_REQUIRE_UPPERCASE=os.getenv("SECURITY_PASSWORD_REQUIRE_UPPERCASE", "true").lower() == "true",
        PASSWORD_REQUIRE_LOWERCASE=os.getenv("SECURITY_PASSWORD_REQUIRE_LOWERCASE", "true").lower() == "true",
        PASSWORD_REQUIRE_NUMBERS=os.getenv("SECURITY_PASSWORD_REQUIRE_NUMBERS", "true").lower() == "true",
        PASSWORD_REQUIRE_SPECIAL=os.getenv("SECURITY_PASSWORD_REQUIRE_SPECIAL", "true").lower() == "true",
        PASSWORD_HISTORY_COUNT=int(os.getenv("SECURITY_PASSWORD_HISTORY_COUNT", "5")),
        API_KEY_LENGTH=int(os.getenv("SECURITY_API_KEY_LENGTH", "32")),
        MAX_UPLOAD_SIZE_MB=int(os.getenv("SECURITY_MAX_UPLOAD_SIZE_MB", "500")),
        RATE_LIMIT_PER_MINUTE=int(os.getenv("SECURITY_RATE_LIMIT_PER_MINUTE", "60")),
        RATE_LIMIT_PER_HOUR=int(os.getenv("SECURITY_RATE_LIMIT_PER_HOUR", "1000")),
    )


# 전역 설정 인스턴스
security_config = load_security_config()
