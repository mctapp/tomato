# app/models/audit_logs.py
from sqlmodel import SQLModel, Field, Column, Relationship
from typing import Optional, Dict, Any
from datetime import datetime
from sqlalchemy import DateTime, JSON, Index, Text
from sqlalchemy.sql import func

class AuditLog(SQLModel, table=True):
    """감사 로그 테이블"""
    __tablename__ = "audit_logs"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    timestamp: datetime = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    )
    request_id: str = Field(index=True)
    user_id: Optional[int] = Field(default=None, foreign_key="users.id", index=True)
    session_id: Optional[str] = Field(default=None, index=True)
    
    # 작업 정보
    action: str = Field(index=True)  # login, create_movie, update_media 등
    resource_type: Optional[str] = Field(default=None, index=True)  # movie, media, user 등
    resource_id: Optional[str] = Field(default=None)
    method: str  # GET, POST, PUT, DELETE
    path: str
    
    # 변경 사항
    changes: Optional[Dict[str, Any]] = Field(default=None, sa_column=Column(JSON))
    
    # 컨텍스트 정보
    ip_address: str
    user_agent: Optional[str] = Field(default=None)
    country: Optional[str] = Field(default=None)
    
    # 보안 정보
    risk_score: float = Field(default=0.0)
    anomaly_detected: bool = Field(default=False)
    
    # 규정 준수
    compliance_tags: Optional[Dict[str, Any]] = Field(
        default=None, 
        sa_column=Column(JSON)
    )  # {"gdpr": true, "data_export": true}
    
    # 응답 정보
    status_code: int
    response_time_ms: int
    error_message: Optional[str] = Field(default=None, sa_column=Column(Text))
    
    # 관계
    user: Optional["User"] = Relationship(back_populates="audit_logs")
    
    __table_args__ = (
        Index("idx_audit_timestamp_user", "timestamp", "user_id"),
        Index("idx_audit_action_resource", "action", "resource_type"),
        Index("idx_audit_compliance", "compliance_tags", postgresql_using="gin"),
    )

class SecurityEvent(SQLModel, table=True):
    """보안 이벤트 테이블"""
    __tablename__ = "security_events"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    timestamp: datetime = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    )
    event_type: str = Field(index=True)  # login_failed, permission_denied 등
    severity: str = Field(index=True)  # INFO, WARNING, CRITICAL
    
    # 대상 정보
    user_id: Optional[int] = Field(default=None, foreign_key="users.id", index=True)
    ip_address: str = Field(index=True)
    session_id: Optional[str] = Field(default=None)
    
    # 이벤트 상세
    description: str
    details: Optional[Dict[str, Any]] = Field(default=None, sa_column=Column(JSON))
    
    # 대응 조치
    action_taken: Optional[str] = Field(default=None)  # blocked, alerted, logged 등
    resolved: bool = Field(default=False)
    resolved_at: Optional[datetime] = Field(default=None)
    resolved_by: Optional[int] = Field(default=None, foreign_key="users.id")
    
    __table_args__ = (
        Index("idx_security_timestamp_type", "timestamp", "event_type"),
        Index("idx_security_severity_resolved", "severity", "resolved"),
    )
