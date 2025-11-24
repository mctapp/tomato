from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime
from sqlalchemy import Column, DateTime  # SQLAlchemy Column과 DateTime 임포트
from sqlalchemy.sql import func        # SQLAlchemy func 임포트 (func.now() 사용 위해)

class ImageRendition(SQLModel, table=True):
    __tablename__ = "image_renditions"
    __table_args__ = {"extend_existing": True}

    id: Optional[int] = Field(default=None, primary_key=True)
    movie_id: int = Field(foreign_key="movie.id")
    rendition_type: str
    s3_directory: str
    s3_filename: str
    width: Optional[int] = Field(default=None) # 기본값 명시적으로 설정 권장
    height: Optional[int] = Field(default=None) # 기본값 명시적으로 설정 권장
    file_size: Optional[int] = Field(default=None) # 기본값 명시적으로 설정 권장

    # --- 수정된 부분 ---
    # sa_column을 사용하여 SQLAlchemy Column 옵션 지정
    created_at: Optional[datetime] = Field(
        default=None, # Python 기본값은 None 유지 (DB에서 생성하므로)
        sa_column=Column(DateTime(timezone=True), server_default=func.now()) # DB에서 생성 시 현재 시간 자동 기록
    )
    updated_at: Optional[datetime] = Field(
        default=None, # Python 기본값은 None 유지
        sa_column=Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now()) # DB에서 생성 및 업데이트 시 현재 시간 자동 기록
    )
    # --- 수정 끝 ---

