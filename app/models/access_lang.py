# app/models/access_lang.py
from sqlmodel import SQLModel, Field, Column
from typing import Optional
from datetime import datetime
from sqlalchemy import TIMESTAMP
from sqlalchemy.sql import func

class AccessLang(SQLModel, table=True):
    __tablename__ = "access_lang"
    
    id: Optional[int] = Field(default=None, primary_key=True, index=True)
    code: str = Field(max_length=10, unique=True, nullable=False)
    name: str = Field(max_length=50, nullable=False)
    native_name: Optional[str] = Field(default=None, max_length=50)
    is_active: bool = Field(default=True)
    is_default: bool = Field(default=False)
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
