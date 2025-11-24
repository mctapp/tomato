from sqlmodel import SQLModel, Field, Column, Relationship
from typing import Optional
from datetime import datetime
from sqlalchemy import DateTime, Boolean, ForeignKey
from sqlalchemy.sql import func

from app.models.users import User

class Todo(SQLModel, table=True):
    __tablename__ = "todos"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    is_completed: bool = Field(default=False)
    user_id: int = Field(foreign_key="users.id", index=True)
    created_at: datetime = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), server_default=func.now())
    )
    updated_at: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)
    )
    
    # 관계 설정
    user: User = Relationship(back_populates="todos")
