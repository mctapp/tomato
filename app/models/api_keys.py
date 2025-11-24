# app/models/api_keys.py
from sqlmodel import SQLModel, Field, Relationship
from datetime import datetime
from typing import Optional, List
from enum import Enum
import secrets

class APIKeyType(str, Enum):
    PERSONAL = "personal"      # 개인 개발자용
    SERVICE = "service"        # 서비스 간 통신용
    INTEGRATION = "integration" # 외부 연동용
    TESTING = "testing"        # 테스트용

class APIKeyStatus(str, Enum):
    ACTIVE = "active"
    REVOKED = "revoked"
    EXPIRED = "expired"
    SUSPENDED = "suspended"

class APIKeyScope(str, Enum):
    READ = "read"
    WRITE = "write"
    DELETE = "delete"
    ADMIN = "admin"

class APIKey(SQLModel, table=True):
    """API 키"""
    __tablename__ = "api_keys"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: Optional[int] = Field(foreign_key="users.id", index=True)
    
    # 키 정보
    key_prefix: str = Field(index=True)  # 처음 8자 (검색용)
    key_hash: str = Field(unique=True)   # 전체 키의 해시
    name: str
    description: Optional[str] = None
    
    # 타입과 상태
    key_type: APIKeyType
    status: APIKeyStatus = Field(default=APIKeyStatus.ACTIVE)
    
    # 권한
    scopes: str  # JSON 배열로 저장
    allowed_ips: Optional[str] = None  # JSON 배열로 저장
    allowed_origins: Optional[str] = None  # JSON 배열로 저장
    
    # 사용 제한
    rate_limit_per_minute: int = Field(default=100)
    rate_limit_per_day: Optional[int] = None
    max_requests: Optional[int] = None  # 총 사용 횟수 제한
    
    # 통계
    request_count: int = Field(default=0)
    last_used_at: Optional[datetime] = None
    last_used_ip: Optional[str] = None
    
    # 시간 정보
    expires_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    revoked_at: Optional[datetime] = None
    
    # 관계
    user: Optional["User"] = Relationship(back_populates="api_keys")
    usage_logs: List["APIKeyUsageLog"] = Relationship(back_populates="api_key")

class APIKeyUsageLog(SQLModel, table=True):
    """API 키 사용 로그"""
    __tablename__ = "api_key_usage_logs"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    api_key_id: int = Field(foreign_key="api_keys.id", index=True)
    
    # 요청 정보
    endpoint: str
    method: str
    status_code: int
    response_time_ms: int
    
    # 클라이언트 정보
    ip_address: str
    user_agent: Optional[str] = None
    origin: Optional[str] = None
    
    # 추가 정보
    request_id: str
    error_message: Optional[str] = None
    
    timestamp: datetime = Field(default_factory=datetime.utcnow, index=True)
    
    # 관계
    api_key: Optional["APIKey"] = Relationship(back_populates="usage_logs")
