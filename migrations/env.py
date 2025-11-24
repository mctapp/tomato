# migrations/env.py
from logging.config import fileConfig
import os
import sys
from sqlalchemy import engine_from_config, pool
from alembic import context

# FastAPI 앱 경로 추가
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

# SQLModel 및 모든 모델 임포트
from sqlmodel import SQLModel
from app.models.users import User
from app.models.movies import Movie
from app.models.voice_artist import VoiceArtist, VoiceArtistSample
from app.models.user_preference import UserPreference
# 기타 모든 모델들 추가 임포트

# ──────────────────────────────────────────────────────────────
# Alembic 기본 설정 객체
# ──────────────────────────────────────────────────────────────
config = context.config

# ──────────────────────────────────────────────────────────────
# ▶︎ 1. 데이터베이스 URL 주입
# ──────────────────────────────────────────────────────────────
DEFAULT_DB_URL = "postgresql+psycopg2://utoweb:mctuto055%21@localhost:5432/tomato_db"
raw_url = os.getenv("DATABASE_URL", DEFAULT_DB_URL)
safe_url = raw_url.replace("%", "%%")
config.set_main_option("sqlalchemy.url", safe_url)

if not config.get_main_option("sqlalchemy.url"):
    raise RuntimeError("DATABASE_URL가 설정되지 않았습니다. Alembic 중단!")

# ──────────────────────────────────────────────────────────────
# ▶︎ 2. 로깅 설정
# ──────────────────────────────────────────────────────────────
fileConfig(config.config_file_name)

# ──────────────────────────────────────────────────────────────
# ▶︎ 3. 메타데이터 (자동 마이그레이션용) - 여기가 핵심!
# ──────────────────────────────────────────────────────────────
target_metadata = SQLModel.metadata  # None에서 SQLModel.metadata로 변경

# ──────────────────────────────────────────────────────────────
# ▶︎ 4. 오프라인 / 온라인 마이그레이션 함수
# ──────────────────────────────────────────────────────────────
def run_migrations_offline() -> None:
    """'offline' 모드에서 마이그레이션 실행 (DB 연결 없이)."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()

def run_migrations_online() -> None:
    """'online' 모드에서 마이그레이션 실행 (DB 연결 필요)."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()

# ──────────────────────────────────────────────────────────────
# ▶︎ 5. 진입점
# ──────────────────────────────────────────────────────────────
if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
