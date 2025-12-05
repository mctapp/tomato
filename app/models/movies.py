# app/models/movies.py
from sqlmodel import SQLModel, Field, Column, Relationship
from typing import Optional, List, TYPE_CHECKING
from datetime import date, datetime
from sqlalchemy import DateTime, String
from sqlalchemy.sql import func

if TYPE_CHECKING:
    from app.models.distributors import Distributor
    from app.models.image_renditions import ImageRendition
    from app.models.access_asset import AccessAsset
    from app.models.file_assets import FileAsset

class Movie(SQLModel, table=True):
    __tablename__ = "movie"  # 테이블명이 'movie'임
    __table_args__ = {"extend_existing": True}
    
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    director: Optional[str] = None
    production_year: Optional[int] = None
    release_date: Optional[date] = None
    film_genre: Optional[str] = None
    film_rating: Optional[str] = None
    running_time: Optional[int] = None
    running_time_seconds: Optional[int] = None
    country: Optional[str] = None
    logline: Optional[str] = None
    poster_original_rendition_id: Optional[int] = Field(default=None, foreign_key="image_renditions.id")
    signature_s3_directory: Optional[str] = None
    signature_s3_filename: Optional[str] = None
    original_signature_filename: Optional[str] = None
    signature_upload_time: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True))
    )
    signature_file_size: Optional[int] = None
    visibility_type: str = "always"
    start_at: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True))
    )
    end_at: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True))
    )
    feature_code: Optional[str] = None
    admin_memo: Optional[str] = None
    distributor_id: Optional[int] = Field(default=None, foreign_key="distributors.id")
    
    # 새로 추가된 필드
    is_public: Optional[bool] = Field(default=False)
    public_version: Optional[int] = Field(default=1)
    publishing_status: Optional[str] = Field(default="draft")
    
    # 파일 에셋 관계 필드 추가
    poster_file_id: Optional[int] = Field(default=None, foreign_key="file_assets.id")
    
    created_at: Optional[datetime] = Field(
        default=None,
        sa_column=Column(
            DateTime(timezone=True),
            server_default=func.now(),
            nullable=False
        )
    )
    updated_at: Optional[datetime] = Field(
        default=None,
        sa_column=Column(
            DateTime(timezone=True),
            server_default=func.now(),
            onupdate=func.now(),
            nullable=False
        )
    )
    
    # --- Relationship 정의 ---
    distributor: Optional["Distributor"] = Relationship(back_populates="movies")
    poster_original_rendition: Optional["ImageRendition"] = Relationship(
        sa_relationship_kwargs={
            "foreign_keys": "Movie.poster_original_rendition_id"
        }
    )
    
    # 파일 에셋 관계 정의 추가
    poster_file: Optional["FileAsset"] = Relationship(
        sa_relationship_kwargs={
            "foreign_keys": "[Movie.poster_file_id]"
        }
    )
    
    # 수정된 부분: AccessAsset 관계 정의
    access_assets: List["AccessAsset"] = Relationship(back_populates="movie")
