
from logging.config import fileConfig

from sqlalchemy import engine_from_config
from sqlalchemy import pool

from alembic import context

# --- SQLModel 및 모델 임포트 ---
# 프로젝트 구조에 맞게 경로를 조정하세요.
# 예를 들어, app 폴더가 프로젝트 루트에 있다면 아래 경로가 맞습니다.
try:
    from app.models.translator import Translator, TranslatorSpecialty, TranslatorExpertise
    from app.models.representative_works import RepresentativeWork
    # --- 다른 모델이 있다면 여기에 추가 ---
    # from app.models.other_model import OtherModel

    # SQLModel 베이스 클래스를 임포트합니다.
    # app.db 모듈에서 SQLModel을 직접 정의하거나 가져온다고 가정합니다.
    from app.db.base_class import SQLModel # 경로 확인 필요 (예: app.db.base_class 또는 app.db)
except ImportError:
    # Alembic 실행 환경에서 app 모듈을 찾지 못할 경우를 대비
    import sys
    import os
    # 프로젝트 루트 경로를 sys.path에 추가 (필요시 경로 조정)
    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
    if project_root not in sys.path:
        sys.path.insert(0, project_root)
    from app.models.translator import Translator, TranslatorSpecialty, TranslatorExpertise
    from app.models.representative_works import RepresentativeWork
    # --- 다른 모델이 있다면 여기에 추가 ---
    from app.db.base_class import SQLModel # 경로 확인 필요

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# --- SQLModel 메타데이터 설정 ---
# add your model's MetaData object here
# for 'autogenerate' support
# from myapp import mymodel
# target_metadata = mymodel.Base.metadata
# target_metadata = None # 기존 설정 주석 처리
target_metadata = SQLModel.metadata # SQLModel의 메타데이터 사용

# other values from the config, defined by the needs of env.py,
# can be acquired:
# my_important_option = config.get_main_option("my_important_option")
# ... etc.


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.

    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        # SQLModel/Pydantic V2 호환성을 위해 추가 (선택적)
        render_as_batch=True,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode.

    In this scenario we need to create an Engine
    and associate a connection with the context.

    """
    # alembic.ini 파일에서 데이터베이스 설정을 읽어옵니다.
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            # SQLModel/Pydantic V2 호환성을 위해 추가 (선택적)
            render_as_batch=True,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
