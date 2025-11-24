# app/models/db_backup.py
from sqlmodel import SQLModel, Field
from datetime import datetime
from typing import Optional

class DBBackup(SQLModel, table=True):
    __tablename__ = "db_backups"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    filename: str = Field(index=True, unique=True)
    description: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.now)
    size_bytes: int
    scheduled_backup_id: Optional[int] = Field(default=None, foreign_key="scheduled_backups.id")

class ScheduledBackup(SQLModel, table=True):
    __tablename__ = "scheduled_backups"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    description: Optional[str] = None
    schedule_type: str  # "daily", "weekly", "monthly"
    hour: int  # 0-23
    minute: int  # 0-59
    day_of_week: Optional[int] = None  # 0-6 (월요일-일요일)
    day_of_month: Optional[int] = None  # 1-31
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.now)
    last_run: Optional[datetime] = None
