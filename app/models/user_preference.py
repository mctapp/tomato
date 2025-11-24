# app/models/user_preference.py
from typing import Optional, Dict, Any
from datetime import datetime
from sqlmodel import Field, SQLModel, Column
from sqlalchemy import DateTime
from sqlalchemy.dialects.postgresql import JSONB  # 수정된 부분
from sqlalchemy.sql import func

class UserPreference(SQLModel, table=True):
    __tablename__ = "user_preferences"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id")
    preference_type: str
    preference_data: Dict[str, Any] = Field(sa_column=Column(JSONB))  # JSONB 타입 사용
    created_at: datetime = Field(
        default=None,
        sa_column=Column(
            DateTime(timezone=True),
            server_default=func.now()
        )
    )
    updated_at: datetime = Field(
        default=None,
        sa_column=Column(
            DateTime(timezone=True),
            server_default=func.now(),
            onupdate=func.now()
        )
    )
