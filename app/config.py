# app/config.py
"""
애플리케이션 설정 관리
환경변수에서 설정을 로드합니다.
"""
import os
from typing import List
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """애플리케이션 설정"""

    # 환경
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"

    # 보안
    SECRET_KEY: str = os.getenv("SECRET_KEY", "")

    # CORS 설정 - 쉼표로 구분된 도메인 리스트
    ALLOWED_ORIGINS: List[str] = []

    # AWS
    AWS_ACCESS_KEY_ID: str = os.getenv("AWS_ACCESS_KEY_ID", "")
    AWS_SECRET_ACCESS_KEY: str = os.getenv("AWS_SECRET_ACCESS_KEY", "")
    AWS_REGION: str = os.getenv("AWS_REGION", "ap-northeast-2")
    PRIVATE_BUCKET_NAME: str = os.getenv("PRIVATE_BUCKET_NAME", "")
    PUBLIC_BUCKET_NAME: str = os.getenv("PUBLIC_BUCKET_NAME", "")

    # Redis
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379")

    # IP 필터
    ENABLE_IP_FILTER: bool = os.getenv("ENABLE_IP_FILTER", "true").lower() == "true"
    IP_WHITELIST: List[str] = []

    # 기타
    ANOMALY_MODEL_PATH: str = os.getenv("ANOMALY_MODEL_PATH", "models/anomaly_detection.pkl")

    def __init__(self, **kwargs):
        super().__init__(**kwargs)

        # ALLOWED_ORIGINS 파싱
        origins_str = os.getenv("ALLOWED_ORIGINS", "")
        if origins_str:
            self.ALLOWED_ORIGINS = [origin.strip() for origin in origins_str.split(",") if origin.strip()]
        else:
            # 기본값: 프로덕션에서는 특정 도메인만, 개발에서는 localhost 포함
            if self.ENVIRONMENT == "production":
                self.ALLOWED_ORIGINS = [
                    "https://tomato.mct.kr",
                    "https://www.tomato.mct.kr",
                ]
            else:
                self.ALLOWED_ORIGINS = [
                    "http://localhost:3000",
                    "http://localhost:8000",
                    "http://127.0.0.1:3000",
                    "http://127.0.0.1:8000",
                    "https://tomato.mct.kr",
                    "https://www.tomato.mct.kr",
                ]

        # IP_WHITELIST 파싱
        whitelist_str = os.getenv("IP_WHITELIST", "")
        if whitelist_str:
            self.IP_WHITELIST = [ip.strip() for ip in whitelist_str.split(",") if ip.strip()]

        # SECRET_KEY 검증 (프로덕션에서만)
        if self.ENVIRONMENT == "production" and (not self.SECRET_KEY or len(self.SECRET_KEY) < 32):
            raise ValueError("SECRET_KEY must be set and at least 32 characters in production")

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    """캐시된 설정 인스턴스 반환"""
    return Settings()


# 전역 설정 인스턴스
settings = get_settings()
