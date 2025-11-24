# app/models/devices.py
from sqlmodel import SQLModel, Field, Relationship
from datetime import datetime
from typing import Optional
import json

class DeviceStatus(str, Enum):
    UNKNOWN = "unknown"
    TRUSTED = "trusted"
    UNTRUSTED = "untrusted"
    BLOCKED = "blocked"

class UserDevice(SQLModel, table=True):
    """사용자 디바이스 정보"""
    __tablename__ = "user_devices"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    
    # 디바이스 식별
    device_id: str = Field(unique=True, index=True)
    device_fingerprint: str
    device_name: Optional[str] = None
    
    # 디바이스 정보
    user_agent: str
    platform: Optional[str] = None
    browser: Optional[str] = None
    
    # 신뢰 상태
    status: DeviceStatus = Field(default=DeviceStatus.UNKNOWN)
    trust_score: float = Field(default=0.5)
    
    # 위치 정보
    last_ip: str
    last_country: Optional[str] = None
    last_city: Optional[str] = None
    
    # 시간 정보
    first_seen_at: datetime = Field(default_factory=datetime.utcnow)
    last_seen_at: datetime = Field(default_factory=datetime.utcnow)
    trusted_at: Optional[datetime] = None
    blocked_at: Optional[datetime] = None
    
    # 관계
    user: Optional["User"] = Relationship(back_populates="devices")
