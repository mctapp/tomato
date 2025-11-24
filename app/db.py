from sqlmodel import SQLModel, create_engine, Session
from dotenv import load_dotenv
import os

# 모델 정의 import (metadata에 포함되게)
from app.models.image_renditions import ImageRendition
from app.models.movies import Movie

# 순환 참조 제거 - 이 라인 삭제
# from app.db import get_db as get_session

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL, echo=False)  # echo=False: SQL 로그 비활성화

def init_db():
    # 모든 모델 모듈을 metadata에 포함시키기 위해 import
    import app.models.image_renditions
    import app.models.distributors
    import app.models.movies
    import app.models.movie_files
    import app.models.distributor_contacts
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session

# ✅ 추가된 get_db 함수
def get_db():
    with Session(engine) as session:
        yield session
