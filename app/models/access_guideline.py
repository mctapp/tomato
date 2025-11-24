# app/models/access_guideline.py
from sqlmodel import SQLModel, Field, Relationship
from typing import List, Optional, TYPE_CHECKING
from datetime import datetime
from sqlalchemy import Column, DateTime
from sqlalchemy.sql import func

if TYPE_CHECKING:
    from app.models.access_asset import AccessAsset
    from app.models.file_assets import FileAsset

class AccessGuidelineContent(SQLModel, table=True):
    __tablename__ = "access_guideline_contents"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    guideline_id: int = Field(foreign_key="access_guidelines.id")
    category: str
    content: str
    sequence_number: int
    created_at: datetime = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), server_default=func.now())
    )
    
    # 관계 정의
    guideline: "AccessGuideline" = Relationship(back_populates="contents")

class AccessGuidelineFeedback(SQLModel, table=True):
    __tablename__ = "access_guideline_feedbacks"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    guideline_id: int = Field(foreign_key="access_guidelines.id")
    feedback_type: str
    content: str
    sequence_number: int
    created_at: datetime = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), server_default=func.now())
    )
    
    # 관계 정의
    guideline: "AccessGuideline" = Relationship(back_populates="feedbacks")

class AccessGuidelineMemo(SQLModel, table=True):
    __tablename__ = "access_guideline_memos"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    guideline_id: int = Field(foreign_key="access_guidelines.id")
    content: str
    created_at: datetime = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), server_default=func.now())
    )
    
    # 관계 정의
    guideline: "AccessGuideline" = Relationship(back_populates="memos")

class AccessGuideline(SQLModel, table=True):
    __tablename__ = "access_guidelines"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    type: str
    field: str
    field_other: Optional[str] = None
    version: str
    attachment: Optional[str] = None
    
    # 파일 에셋 관계 필드 추가
    attachment_file_id: Optional[int] = Field(default=None, foreign_key="file_assets.id")
    
    created_at: datetime = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), server_default=func.now())
    )
    updated_at: datetime = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    )
    
    # 관계 정의
    contents: List["AccessGuidelineContent"] = Relationship(back_populates="guideline")
    feedbacks: List["AccessGuidelineFeedback"] = Relationship(back_populates="guideline")
    memos: List["AccessGuidelineMemo"] = Relationship(back_populates="guideline")
    assets: List["AccessAsset"] = Relationship(back_populates="guideline")
    
    # 파일 에셋 관계 정의 추가
    attachment_file: Optional["FileAsset"] = Relationship(
        sa_relationship_kwargs={
            "foreign_keys": "[AccessGuideline.attachment_file_id]"
        }
    )

