# app/models/access_asset.py
from __future__ import annotations
from typing import Optional, List, TYPE_CHECKING
from datetime import datetime
from sqlmodel import SQLModel, Field, Column, Relationship
from sqlalchemy import DateTime, ForeignKey, CheckConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

if TYPE_CHECKING:  # 순환 import 해결용
    from app.models.movies import Movie
    from app.models.access_asset_credit import AccessAssetCredit
    from app.models.access_asset_memo import AccessAssetMemo
    from app.models.access_guideline import AccessGuideline
    from app.models.media_access import MediaAccessRequest, MediaRating, MediaProductionTask
    from app.models.file_assets import FileAsset


class AccessAsset(SQLModel, table=True):
    __tablename__ = "access_assets"
    __table_args__ = (
        CheckConstraint("media_type IN ('AD', 'CC', 'SL', 'IA', 'IC', 'IS', 'RA', 'RC', 'RS')", name="check_media_type"),
        CheckConstraint("asset_type IN ('description', 'introduction', 'review')", name="check_asset_type"),
        {"extend_existing": True}
    )

    
    # ── 기본 키 ────────────────────────────────────────────────────────────
    id: Optional[int] = Field(default=None, primary_key=True)
    
    # ── FK ────────────────────────────────────────────────────────────────
    movie_id: int = Field(foreign_key="movie.id")
    guideline_id: Optional[int] = Field(default=None, foreign_key="access_guidelines.id", nullable=True)
    
    # 파일 에셋 관계 필드 추가
    media_file_id: Optional[int] = Field(default=None, foreign_key="file_assets.id")
    
    # ── 파일/메타 정보 ─────────────────────────────────────────────────────
    asset_type: str                       # "description", "introduction", "review"
    media_type: str                       # "AD", "CC", "SL" 등 미디어 형식
    language: str                         # 언어 코드 (ko, en, vi)
    file_type: str                        # mp3, mp4, srt 등 파일 형식

    name: str
    
    # 설명 필드 추가
    description: Optional[str] = Field(default=None, nullable=True)
    
    s3_directory: str                     # S3 디렉토리 경로
    s3_filename: str                      # S3 파일명
    original_filename: str                # 원본 파일명
    
    file_size: int                        # 파일 크기 (bytes)
    uploaded_at: datetime                 # 업로드 시간
    
    production_year: Optional[int] = None # 제작 연도
    supported_os: Optional[str] = None    # 지원 OS

    # ── 접근 제어 필드 (새로 추가) ─────────────────────────────────────────
    is_public: Optional[bool] = Field(default=False)
    is_locked: Optional[bool] = Field(default=True)
    publishing_status: Optional[str] = Field(default="draft")
    access_policy: Optional[str] = Field(default="private")
    production_status: Optional[str] = Field(default="planning")
    
    # ── 타임스탬프 ────────────────────────────────────────────────────────
    created_at: Optional[datetime] = Field(
        default=None,
        sa_column=Column(
            DateTime(timezone=True),
            server_default=func.now(),
            nullable=False,
        ),
    )
    updated_at: Optional[datetime] = Field(
        default=None,
        sa_column=Column(
            DateTime(timezone=True),
            server_default=func.now(),
            onupdate=func.now(),
            nullable=False,
        ),
    )

# 모델 정의와 관계 설정을 분리
# 클래스 외부에서 관계 설정을 정의하여 순환 참조 문제 해결
AccessAsset.movie = relationship(
    "Movie",
    back_populates="access_assets",
    foreign_keys=[AccessAsset.movie_id]
)

AccessAsset.guideline = relationship(
    "AccessGuideline",
    back_populates="assets",
    foreign_keys=[AccessAsset.guideline_id]
)

# 파일 에셋 관계 정의 추가
AccessAsset.media_file = relationship(
    "FileAsset",
    foreign_keys=[AccessAsset.media_file_id]
)

AccessAsset.credits = relationship(
    "AccessAssetCredit",
    back_populates="access_asset",
    cascade="all, delete-orphan"
)

AccessAsset.memos = relationship(
    "AccessAssetMemo",
    back_populates="access_asset",
    cascade="all, delete-orphan"
)

AccessAsset.access_requests = relationship(
    "MediaAccessRequest",
    back_populates="media",
    cascade="all, delete-orphan",
    foreign_keys="[MediaAccessRequest.media_id]"
)

AccessAsset.ratings = relationship(
    "MediaRating",
    back_populates="media",
    cascade="all, delete-orphan"
)

AccessAsset.production_tasks = relationship(
    "MediaProductionTask",
    back_populates="media",
    cascade="all, delete-orphan"
)
