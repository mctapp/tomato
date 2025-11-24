# app/models/distributor_contacts.py
# Current Date and Time (UTC): 2025-04-25 08:08:00
# File: app/models/distributor_contacts.py

from sqlmodel import SQLModel, Field, Column, Relationship
from typing import Optional
from datetime import datetime
from sqlalchemy import DateTime, Integer, String, Boolean
from sqlalchemy.sql import func
from sqlalchemy import ForeignKey

# --- 암호화 관련 임포트 ---
try:
    from app.services.encryption import EncryptedField
    ENCRYPTION_ENABLED = True
except ImportError:
    # 암호화 서비스가 아직 구현되지 않은 경우
    ENCRYPTION_ENABLED = False
    class EncryptedField:
        def __init__(self, *args, **kwargs):
            pass

# --- 순환 참조 방지를 위해 다른 모델 임포트는 맨 아래 또는 필요시 ---
# from .distributors import Distributor

class DistributorContact(SQLModel, table=True):
    """배급사 담당자 정보 모델"""
    __tablename__ = "distributor_contacts"

    id: Optional[int] = Field(default=None, primary_key=True)

    # --- 외래 키: Distributor 모델과 연결 ---
    distributor_id: int = Field(foreign_key="distributors.id", index=True, nullable=False)

    # --- 담당자 정보 필드 ---
    name: str = Field(index=True)  # 검색 가능성 고려
    position: Optional[str] = Field(default=None)
    department: Optional[str] = Field(default=None)
    email: Optional[str] = Field(default=None, index=True)  # 이메일 검색 고려
    
    # --- 암호화될 필드들 ---
    office_phone: Optional[str] = Field(default=None)
    mobile_phone: Optional[str] = Field(default=None)
    
    # --- 암호화된 데이터 저장 필드 ---
    office_phone_encrypted: Optional[str] = Field(
        default=None, 
        sa_column=Column(String, nullable=True),
        exclude=True  # API 응답에서 제외
    )
    mobile_phone_encrypted: Optional[str] = Field(
        default=None,
        sa_column=Column(String, nullable=True),
        exclude=True  # API 응답에서 제외
    )
    
    # --- 일반 필드 ---
    is_primary: bool = Field(default=False)  # 기본값은 False로 설정하는 것이 안전할 수 있음
    notes: Optional[str] = Field(default=None)

    # --- 타임스탬프 ---
    created_at: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    )
    updated_at: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    )

    # --- 중요: Distributor 모델과의 관계 설정 (역방향) ---
    distributor: "Distributor" = Relationship(back_populates="contacts")

    # --- 암호화 필드 설정 ---
    if ENCRYPTION_ENABLED:
        # 암호화 디스크립터 설정 (컨텍스트 필드 포함)
        office_phone = EncryptedField("office_phone", context_fields=["id", "distributor_id", "name"])
        mobile_phone = EncryptedField("mobile_phone", context_fields=["id", "distributor_id", "name"])
    
    class Config:
        # SQLModel 설정
        table = True
        
    def __repr__(self):
        return f"<DistributorContact(id={self.id}, name={self.name}, distributor_id={self.distributor_id})>"
    
    def to_dict(self, include_encrypted=False):
        """모델을 딕셔너리로 변환"""
        data = {
            "id": self.id,
            "distributor_id": self.distributor_id,
            "name": self.name,
            "position": self.position,
            "department": self.department,
            "email": self.email,
            "office_phone": self.office_phone,
            "mobile_phone": self.mobile_phone,
            "is_primary": self.is_primary,
            "notes": self.notes,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
        
        # 암호화된 필드 포함 옵션 (디버깅용)
        if include_encrypted and ENCRYPTION_ENABLED:
            data["office_phone_encrypted"] = self.office_phone_encrypted
            data["mobile_phone_encrypted"] = self.mobile_phone_encrypted
        
        return data

# --- 순환 참조 방지를 위해 필요한 임포트 ---
from .distributors import Distributor
