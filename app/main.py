# app/main.py (DebugLoginMiddleware 삭제 버전)
from __future__ import annotations
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.middleware.base import BaseHTTPMiddleware
from app.routes import api_keys
from app.core.redis import redis_client
from app.monitoring import initialize_monitoring, shutdown_monitoring
from app.middleware.security_headers import SecurityHeadersMiddleware
from app.middleware.request_id import RequestIDMiddleware
from app.middleware.ip_filter import IPFilterMiddleware
from app.middleware.anomaly_detection import AnomalyDetectionMiddleware
from app.middleware.monitoring_integration import MonitoringMiddleware
from app.middleware.api_gateway import APIGatewayMiddleware
from app.middleware.rate_limiter import RateLimitMiddleware
from app.core.security.config import security_config
from app.config import settings
import os

# 전역 IP 필터 인스턴스 (startup 메서드 호출을 위해)
ip_filter_instance = None

# lifespan 컨텍스트 매니저 정의
@asynccontextmanager
async def lifespan(app: FastAPI):
    """애플리케이션 생명주기 관리"""
    # 시작 시
    print("🚀 Starting Tomato Security System...")
    
    # Redis 연결
    redis_connected = False
    try:
        await redis_client.connect()
        redis_connected = True
        print("✅ Redis connected successfully!")
    except Exception as e:
        print(f"⚠️  Redis connection failed: {e}")
        print("Please check:")
        print("1. Redis is running: sudo systemctl status redis")
        print("2. Redis password in .env file")
        print("3. Redis host/port settings")
        print("⚠️  Server will start without Redis - rate limiting and some security features disabled")

    # Redis 연결 상태를 앱 상태에 저장
    app.state.redis_connected = redis_connected
    
    # 모니터링 시스템 초기화
    try:
        await initialize_monitoring()
        print("✅ Monitoring system initialized")
    except Exception as e:
        print(f"⚠️  Monitoring initialization failed: {e}")
        # 모니터링은 선택사항이므로 계속 진행
    
    # IP 필터 미들웨어 초기화
    global ip_filter_instance
    if ip_filter_instance:
        try:
            await ip_filter_instance.startup()
            print("✅ IP filter initialized")
        except Exception as e:
            print(f"⚠️  IP filter initialization failed: {e}")
    
    print("🔒 Security system ready!")
    
    yield
    
    # 종료 시
    print("👋 Shutting down Tomato Security System...")
    
    # 모니터링 시스템 종료
    try:
        await shutdown_monitoring()
    except:
        pass
    
    # Redis 연결 해제
    try:
        await redis_client.disconnect()
    except:
        pass
    
    print("✅ Shutdown complete")

# FastAPI 애플리케이션 인스턴스 생성
app = FastAPI(
    title="Tomato API",
    version="2.0.0",
    lifespan=lifespan,
    # Swagger UI가 HTTP에서도 작동하도록 명시적 설정 추가
    openapi_url="/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc"
)

# 미들웨어 설정 (순서 중요!)
def setup_middleware(app: FastAPI):
    """미들웨어 스택 설정"""
    global ip_filter_instance
    
    # 1. Request ID (가장 먼저)
    app.add_middleware(RequestIDMiddleware)
    
    # 2. IP 필터링 - 인스턴스를 생성하고 저장
    ip_filter_instance = IPFilterMiddleware(app)
    app.add_middleware(BaseHTTPMiddleware, dispatch=ip_filter_instance.dispatch)
    
    # 3. Rate Limiting (독립적으로 작동)
    app.add_middleware(RateLimitMiddleware)
    
    # 4. 이상 탐지
    app.add_middleware(
        AnomalyDetectionMiddleware,
        model_path="models/anomaly_detection.pkl",
        enable_ml=False  # ML 비활성화, 규칙 기반만 사용
    )
    
    # 5. API Gateway (Throttling, Validation만 처리)
    app.add_middleware(APIGatewayMiddleware)
    
    # 5.5. Zero Trust 미들웨어 추가 (API Gateway 다음)
    from app.middleware.zero_trust import ZeroTrustMiddleware
    app.add_middleware(ZeroTrustMiddleware)
    
    # 6. 모니터링 통합
    app.add_middleware(MonitoringMiddleware)
    
    # 7. 보안 헤더
    app.add_middleware(
        SecurityHeadersMiddleware,
        strict=settings.ENVIRONMENT == "production"
    )
    
    # CORS 설정 - 보안 강화
    # 환경변수 ALLOWED_ORIGINS 또는 settings.ALLOWED_ORIGINS 사용
    allowed_origins = settings.ALLOWED_ORIGINS
    if not allowed_origins:
        # 설정이 없으면 프로덕션 기본값 사용
        allowed_origins = ["https://tomato.mct.kr"]
        print(f"⚠️  ALLOWED_ORIGINS not configured, using default: {allowed_origins}")

    print(f"🔒 CORS allowed origins: {allowed_origins}")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "X-Requested-With", "X-Request-ID"],
    )

# 미들웨어 설정
setup_middleware(app)

# API 엔드포인트 등록 - SPA 마운팅 전에!
@app.get("/api/health")
async def health_check():
    """헬스체크 엔드포인트"""
    return {
        "status": "healthy",
        "security": {
            "rate_limiting": "enabled" if not os.getenv("DISABLE_RATE_LIMIT", "false").lower() == "true" else "disabled",
            "monitoring": "active",
            "mfa": "available"
        }
    }

# 루트 main.py에서 가져온 라우터 등록 - 이것도 SPA 마운팅 전에!
from app.routes import (
    admin_movies,
    admin_distributors,
    admin_distributor_contacts,
    admin_movie_files,
    admin_image_renditions,
    auth,
    users,
    admin_uploads,
    admin_access_guidelines,
    user_preferences,
    admin_dashboard,
    admin_access_assets,
    admin_todos,
    admin_voice_artists,
    file_server,
    admin_database,  
    admin_sl_interpreters,
    admin_scriptwriters,
    admin_staffs,
    admin_production_analytics,
    admin_production_kanban,
    admin_production_templates,
    admin_production_memo,
    api_keys,
)

app.include_router(admin_movies.router)
app.include_router(admin_distributors.router)
app.include_router(admin_distributor_contacts.router)
app.include_router(admin_movie_files.router)
app.include_router(admin_image_renditions.router)
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(admin_uploads.router)
app.include_router(admin_access_guidelines.router)
app.include_router(user_preferences.router)
app.include_router(admin_dashboard.router)
app.include_router(admin_access_assets.router)
app.include_router(admin_todos.router)
app.include_router(admin_voice_artists.router) 
app.include_router(file_server.router)
app.include_router(admin_database.router) 
app.include_router(admin_sl_interpreters.router)
app.include_router(admin_scriptwriters.router)
app.include_router(admin_staffs.router)
app.include_router(admin_production_analytics.router)
app.include_router(admin_production_kanban.router)
app.include_router(admin_production_templates.router)
app.include_router(admin_production_memo.router)
app.include_router(api_keys.router)

# ── Next.js 프론트엔드 정적 파일 서빙 ────────────────────────────────────────
# 빌드된 Next.js 앱 경로 설정
NEXT_APP_DIR = "admin-panel/.next/standalone"
NEXT_STATIC_DIR = "admin-panel/.next/static"

# Next.js 정적 파일 서빙을 위한 SPA 핸들러
class SPAStaticFiles(StaticFiles):
    async def get_response(self, path, scope):
        response = await super().get_response(path, scope)
        if response.status_code == 404:
            return await super().get_response("index.html", scope)
        return response

# 정적 파일 폴더가 존재하는지 확인
if os.path.exists(NEXT_APP_DIR):
    print(f"Found Next.js app directory: {NEXT_APP_DIR}")
    # 정적 파일 마운트
    if os.path.exists(NEXT_STATIC_DIR):
        print(f"Mounting static directory: {NEXT_STATIC_DIR}")
        app.mount("/_next/static", StaticFiles(directory=NEXT_STATIC_DIR), name="next_static")
    
    # standalone에 있는 .next 디렉토리 확인
    if os.path.exists(f"{NEXT_APP_DIR}/.next/static"):
        print(f"Mounting static directory: {NEXT_APP_DIR}/.next/static")
        app.mount("/_next/static", StaticFiles(directory=f"{NEXT_APP_DIR}/.next/static"), name="standalone_static")
    
    # public 디렉토리가 있다면 마운트
    if os.path.exists("admin-panel/public"):
        app.mount("/public", StaticFiles(directory="admin-panel/public"), name="public_files")
    
    # SPA를 위한 모든 다른 라우트 처리 (이 마운트는 맨 마지막에 위치해야 함)
    app.mount("/", SPAStaticFiles(directory=NEXT_APP_DIR, html=True), name="spa")
    print("Mounted Next.js app successfully")
else:
    print(f"Warning: Next.js app directory '{NEXT_APP_DIR}' not found. Frontend will not be served.")
