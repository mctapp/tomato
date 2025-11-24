# app/models/mfa.py
from sqlmodel import SQLModel, Field, Relationship
from datetime import datetime
from typing import Optional, List
from enum import Enum

class MFAMethod(str, Enum):
    TOTP = "totp"
    SMS = "sms"
    EMAIL = "email"
    BIOMETRIC = "biometric"

class MFAStatus(str, Enum):
    PENDING = "pending"
    ACTIVE = "active"
    DISABLED = "disabled"

class MFADevice(SQLModel, table=True):
    """MFA 디바이스 정보"""
    __tablename__ = "mfa_devices"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    device_name: str
    method: MFAMethod
    secret: Optional[str] = None  # TOTP secret (암호화 저장)
    phone_number: Optional[str] = None  # SMS용
    email: Optional[str] = None  # Email용
    public_key: Optional[str] = None  # Biometric용
    
    status: MFAStatus = Field(default=MFAStatus.PENDING)
    is_primary: bool = Field(default=False)
    
    backup_codes: Optional[str] = None  # JSON 암호화 저장
    last_used_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # 관계
    user: Optional["User"] = Relationship(back_populates="mfa_devices")

class MFAChallenge(SQLModel, table=True):
    """MFA 챌린지 (임시 토큰)"""
    __tablename__ = "mfa_challenges"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    device_id: int = Field(foreign_key="mfa_devices.id", index=True)
    
    challenge_token: str = Field(index=True, unique=True)
    code: Optional[str] = None  # 생성된 코드 (SMS/Email)
    attempts: int = Field(default=0)
    max_attempts: int = Field(default=3)
    
    expires_at: datetime
    verified_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
