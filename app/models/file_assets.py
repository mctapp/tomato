
# app/models/file_assets.py
from typing import Optional, List, TYPE_CHECKING
from datetime import datetime
from sqlmodel import Field, SQLModel, Relationship, Column
from sqlalchemy import DateTime
from sqlalchemy.sql import func

if TYPE_CHECKING:
    from app.models.movies import Movie
    from app.models.access_asset import AccessAsset
    from app.models.access_guideline import AccessGuideline
    from app.models.users import User

class FileAsset(SQLModel, table=True):
    __tablename__ = "file_assets"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    s3_key: str
    s3_bucket: str
    original_filename: str
    content_type: str
    file_size: int
    is_public: bool = Field(default=False)
    
    # 이미지 관련 필드
    width: Optional[int] = None
    height: Optional[int] = None
    is_original: Optional[bool] = Field(default=True)  
    original_file_id: Optional[int] = Field(default=None, foreign_key="file_assets.id")
    rendition_type: Optional[str] = None
    
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
    
    created_by: Optional[int] = Field(default=None, foreign_key="users.id")
    entity_type: str  # 'movie', 'access_asset', 'guideline', 'staff'
    entity_id: int
    usage_type: str
    status: str = Field(default="active")
    
    # 관계 정의
    creator: Optional["User"] = Relationship(
        sa_relationship_kwargs={
            "foreign_keys": "[FileAsset.created_by]"
        }
    )
    
    # 원본-렌디션 관계
    original_file: Optional["FileAsset"] = Relationship(
        sa_relationship_kwargs={
            "foreign_keys": "[FileAsset.original_file_id]"
        }
    )
    
    renditions: List["FileAsset"] = Relationship(
        sa_relationship_kwargs={
            "primaryjoin": "FileAsset.id == foreign(FileAsset.original_file_id)",
            "cascade": "all, delete-orphan"
        }
    )
