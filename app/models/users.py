
from sqlmodel import SQLModel, Field, Column, Relationship
from typing import Optional, List
from datetime import datetime
from sqlalchemy import DateTime, Boolean, String, Enum, Text
from sqlalchemy.sql import func
import enum

class Role(str, enum.Enum):
    SUPER_ADMIN = "SUPER_ADMIN"
    ADMIN = "ADMIN"
    EDITOR = "EDITOR"
    USER = "USER"

class MFAType(str, enum.Enum):
    NONE = "NONE"
    TOTP = "TOTP"
    SMS = "SMS"
    EMAIL = "EMAIL"

class User(SQLModel, table=True):
    __tablename__ = "users"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(unique=True, index=True)
    username: str = Field(unique=True, index=True)
    full_name: Optional[str] = None
    hashed_password: str
    is_active: bool = Field(default=True)
    is_admin: bool = Field(default=False)
    role: Role = Field(default=Role.USER, sa_column=Column(Enum(Role, name="user_role")))
    
    # MFA 필드 추가
    mfa_enabled: bool = Field(default=False)
    mfa_type: MFAType = Field(default=MFAType.NONE, sa_column=Column(Enum(MFAType, name="mfa_type")))
    mfa_secret: Optional[str] = Field(default=None, sa_column=Column(Text))  # 암호화 저장 예정
    mfa_backup_codes: Optional[str] = Field(default=None, sa_column=Column(Text))  # JSON 형태로 암호화 저장
    mfa_phone_number: Optional[str] = Field(default=None, max_length=20)  # SMS MFA용
    
    created_at: datetime = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), server_default=func.now())
    )
    updated_at: datetime = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    )
    
    # 관계 설정
    access_requests: List["MediaAccessRequest"] = Relationship(
        back_populates="requester",
        sa_relationship_kwargs={"foreign_keys": "[MediaAccessRequest.user_id]"}
    )
    ratings: List["MediaRating"] = Relationship(
        back_populates="user",
        sa_relationship_kwargs={"foreign_keys": "[MediaRating.user_id]"}
    )
    # Todo 관계 추가
    todos: List["Todo"] = Relationship(
        back_populates="user",
        sa_relationship_kwargs={"cascade": "all, delete"}
    )
    # API Keys 관계 추가
    api_keys: List["APIKey"] = Relationship(
        back_populates="user",
        sa_relationship_kwargs={"cascade": "all, delete"}
    )
    # Audit Logs 관계 추가
    audit_logs: List["AuditLog"] = Relationship(
        back_populates="user",
        sa_relationship_kwargs={"foreign_keys": "[AuditLog.user_id]"}
    )
