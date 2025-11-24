# app/auth/sessions/models.py
from pydantic import BaseModel
from datetime import datetime
from typing import Optional, Dict
from enum import Enum

class DeviceType(str, Enum):
    WEB = "web"
    IOS = "ios"
    ANDROID = "android"
    API = "api"

class GeoLocation(BaseModel):
    country: str
    city: Optional[str]
    latitude: Optional[float]
    longitude: Optional[float]

class SessionInfo(BaseModel):
    session_id: str
    user_id: int
    device_id: str
    device_type: DeviceType
    device_name: Optional[str]
    
    ip_address: str
    user_agent: str
    location: Optional[GeoLocation]
    
    created_at: datetime
    last_activity: datetime
    expires_at: datetime
    
    is_trusted: bool = False
    mfa_verified: bool = False
    
    # 추가 메타데이터
    metadata: Dict = {}

class SessionActivity(BaseModel):
    """세션 활동 기록"""
    session_id: str
    timestamp: datetime
    action: str
    resource: Optional[str]
    ip_address: str
    risk_score: float = 0.0
