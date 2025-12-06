# app/models/ip_management.py
from sqlmodel import SQLModel, Field
from datetime import datetime
from typing import Optional

class AllowedIP(SQLModel, table=True):
    """허용된 IP 화이트리스트 테이블"""
    __tablename__ = "allowed_ips"

    id: Optional[int] = Field(default=None, primary_key=True)
    ip_address: str = Field(index=True, unique=True, max_length=45)  # IPv4/IPv6 지원
    username: str = Field(max_length=100)  # 사용자명
    memo: Optional[str] = Field(default=None, max_length=500)  # 메모
    is_active: bool = Field(default=True)  # 활성화 여부
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    created_by: Optional[int] = Field(default=None, foreign_key="users.id")  # 등록한 관리자


class AccessLog(SQLModel, table=True):
    """접속 로그 테이블"""
    __tablename__ = "access_logs"

    id: Optional[int] = Field(default=None, primary_key=True)
    ip_address: str = Field(index=True, max_length=45)
    username: Optional[str] = Field(default=None, max_length=100)  # allowed_ips와 연동
    request_path: Optional[str] = Field(default=None, max_length=500)  # 요청 경로
    request_method: Optional[str] = Field(default=None, max_length=10)  # GET, POST 등
    user_agent: Optional[str] = Field(default=None, max_length=500)  # 브라우저 정보
    status_code: Optional[int] = Field(default=None)  # HTTP 상태 코드
    accessed_at: datetime = Field(default_factory=datetime.now, index=True)
    allowed_ip_id: Optional[int] = Field(default=None, foreign_key="allowed_ips.id")


# Pydantic 스키마 for API requests/responses
class AllowedIPCreate(SQLModel):
    """IP 등록 요청 스키마"""
    ip_address: str
    username: str
    memo: Optional[str] = None


class AllowedIPUpdate(SQLModel):
    """IP 수정 요청 스키마"""
    username: Optional[str] = None
    memo: Optional[str] = None
    is_active: Optional[bool] = None


class AllowedIPResponse(SQLModel):
    """IP 응답 스키마"""
    id: int
    ip_address: str
    username: str
    memo: Optional[str]
    is_active: bool
    created_at: datetime
    updated_at: datetime
    created_by: Optional[int]


class AccessLogResponse(SQLModel):
    """접속 로그 응답 스키마"""
    id: int
    ip_address: str
    username: Optional[str]
    request_path: Optional[str]
    request_method: Optional[str]
    user_agent: Optional[str]
    status_code: Optional[int]
    accessed_at: datetime


class CurrentIPResponse(SQLModel):
    """현재 접속 IP 응답 스키마"""
    ip_address: str
    username: Optional[str]
    is_registered: bool
