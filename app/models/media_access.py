from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List, Dict, Any, TYPE_CHECKING
from datetime import datetime
from sqlalchemy import Column, DateTime, Text, String, Boolean, Integer, Float, ForeignKey, CheckConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func

if TYPE_CHECKING:
    from app.models.access_asset import AccessAsset
    from app.models.users import User

class MediaAccessRequest(SQLModel, table=True):
    __tablename__ = "media_access_requests"
    __table_args__ = {"extend_existing": True}

    id: Optional[int] = Field(default=None, primary_key=True)
    media_id: int = Field(foreign_key="access_assets.id", index=True)
    user_id: Optional[int] = Field(default=None, foreign_key="users.id")
    device_id: Optional[str] = None
    request_reason: Optional[str] = Field(default=None, sa_column=Column(Text))
    status: str = Field(default="pending", index=True)
    admin_id: Optional[int] = Field(default=None, foreign_key="users.id")
    admin_notes: Optional[str] = Field(default=None, sa_column=Column(Text))
    expiry_date: Optional[datetime] = None
    created_at: datetime = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), server_default=func.now())
    )
    updated_at: datetime = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    )

    # 관계 설정
    media: "AccessAsset" = Relationship(back_populates="access_requests")
    # 수정: back_populates 추가
    requester: Optional["User"] = Relationship(
        back_populates="access_requests",
        sa_relationship_kwargs={"foreign_keys": "[MediaAccessRequest.user_id]"}
    )
    admin: Optional["User"] = Relationship(
        sa_relationship_kwargs={"foreign_keys": "[MediaAccessRequest.admin_id]"}
    )

class MediaRating(SQLModel, table=True):
    __tablename__ = "media_ratings"
    __table_args__ = (
        CheckConstraint("rating_score BETWEEN 1 AND 5", name="check_rating_score"),
        {"extend_existing": True}  # 마지막에 옵션 딕셔너리 배치
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    media_id: int = Field(foreign_key="access_assets.id")
    user_id: Optional[int] = Field(default=None, foreign_key="users.id")
    device_id: Optional[str] = None
    rating_score: int = Field(...)
    rating_type: Optional[str] = Field(default="user")
    ip_address: Optional[str] = None
    is_verified: Optional[bool] = Field(default=False)
    admin_id: Optional[int] = Field(default=None, foreign_key="users.id")
    admin_modified: Optional[bool] = Field(default=False)
    created_at: datetime = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), server_default=func.now())
    )
    updated_at: datetime = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    )

    # 관계 설정
    media: "AccessAsset" = Relationship(back_populates="ratings")
    # 수정: back_populates 추가
    user: Optional["User"] = Relationship(
        back_populates="ratings",
        sa_relationship_kwargs={"foreign_keys": "[MediaRating.user_id]"}
    )
    admin: Optional["User"] = Relationship(
        sa_relationship_kwargs={"foreign_keys": "[MediaRating.admin_id]"}
    )
    feedbacks: List["RatingFeedback"] = Relationship(
        back_populates="rating",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )

class RatingFeedback(SQLModel, table=True):
    __tablename__ = "rating_feedback"
    __table_args__ = {"extend_existing": True}

    id: Optional[int] = Field(default=None, primary_key=True)
    rating_id: int = Field(foreign_key="media_ratings.id")
    feedback_type: str
    text_content: Optional[str] = Field(default=None, sa_column=Column(Text))
    voice_file_path: Optional[str] = None
    voice_transcription: Optional[str] = Field(default=None, sa_column=Column(Text))
    sentiment_score: Optional[float] = None
    sentiment_analysis: Optional[Dict[str, Any]] = Field(default=None, sa_column=Column(JSONB))
    is_public: Optional[bool] = Field(default=False)
    created_at: datetime = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), server_default=func.now())
    )

    # 관계 설정
    rating: MediaRating = Relationship(back_populates="feedbacks")

class MediaProductionTask(SQLModel, table=True):
    __tablename__ = "media_production_tasks"
    __table_args__ = {"extend_existing": True}

    id: Optional[int] = Field(default=None, primary_key=True)
    media_id: int = Field(foreign_key="access_assets.id", index=True)
    task_type: str
    status: str = Field(default="pending", index=True)
    assigned_to: Optional[int] = Field(default=None, foreign_key="users.id")
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    due_date: Optional[datetime] = None
    completion_notes: Optional[str] = Field(default=None, sa_column=Column(Text))
    created_at: datetime = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), server_default=func.now())
    )
    updated_at: datetime = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    )

    # 관계 설정
    media: "AccessAsset" = Relationship(back_populates="production_tasks")
    # 수정: back_populates 추가 (필요한 경우)
    assignee: Optional["User"] = Relationship(
        sa_relationship_kwargs={"foreign_keys": "[MediaProductionTask.assigned_to]"}
    )
