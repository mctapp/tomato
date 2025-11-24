# app/models/access_type.py
from sqlmodel import SQLModel, Field, Column
from typing import Optional
from datetime import datetime
from sqlalchemy import TIMESTAMP, CheckConstraint
from sqlalchemy.sql import func

class AccessType(SQLModel, table=True):
    __tablename__ = "access_type"
    __table_args__ = (
        CheckConstraint("category IN ('description', 'introduction', 'review')", name="check_category"),
        CheckConstraint("format IN ('audio', 'caption', 'sign')", name="check_format"),
    )
    
    id: Optional[int] = Field(default=None, primary_key=True, index=True)
    code: str = Field(max_length=10, unique=True, nullable=False)
    name: str = Field(max_length=50, nullable=False)
    description: Optional[str] = Field(default=None)
    category: str = Field(nullable=False, max_length=20)
    format: str = Field(nullable=False, max_length=20)
    is_active: bool = Field(default=True)
    display_order: Optional[int] = Field(default=None)
    created_at: Optional[datetime] = Field(
        default=None,
        sa_column=Column(
            TIMESTAMP(timezone=True), 
            server_default=func.now()
        )
    )
    updated_at: Optional[datetime] = Field(
        default=None,
        sa_column=Column(
            TIMESTAMP(timezone=True), 
            server_default=func.now(), 
            onupdate=func.now()
        )
    )
