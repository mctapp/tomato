# app/core/middleware.py
from fastapi import FastAPI
from app.middleware.security_headers import SecurityHeadersMiddleware
from app.middleware.request_id import RequestIDMiddleware
from app.middleware.ip_filter import IPFilterMiddleware
from app.middleware.anomaly_detection import AnomalyDetectionMiddleware

async def setup_middleware(app: FastAPI, settings):
    """미들웨어 스택 설정 (순서 중요!)"""
    
    # 1. 요청 ID (가장 먼저)
    app.add_middleware(RequestIDMiddleware)
    
    # 2. IP 필터링 (차단은 빠르게)
    ip_filter = IPFilterMiddleware(app, settings.REDIS_URL)
    await ip_filter.startup()
    app.add_middleware(lambda app: ip_filter)
    
    # 3. 이상 탐지
    app.add_middleware(
        AnomalyDetectionMiddleware,
        model_path=settings.ANOMALY_MODEL_PATH
    )
    
    # 4. 보안 헤더 (마지막)
    app.add_middleware(
        SecurityHeadersMiddleware,
        strict=settings.ENVIRONMENT == "production"
    )
    
    # CORS는 FastAPI 내장 사용
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
