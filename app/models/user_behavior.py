# app/models/user_behavior.py
from sqlmodel import SQLModel, Field
from datetime import datetime
from typing import Optional, Dict, Any

class UserBehaviorPattern(SQLModel, table=True):
    """사용자 행동 패턴"""
    __tablename__ = "user_behavior_patterns"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    
    # 접속 패턴
    typical_hours: str  # JSON: {"start": 9, "end": 18}
    typical_days: str   # JSON: [1, 2, 3, 4, 5]
    typical_locations: str  # JSON: ["Seoul", "Busan"]
    
    # 사용 패턴
    avg_session_duration: int  # 초
    avg_requests_per_session: int
    common_endpoints: str  # JSON: {"/api/movies": 50, ...}
    
    # 위험 지표
    failed_login_count: int = Field(default=0)
    anomaly_count: int = Field(default=0)
    last_anomaly_at: Optional[datetime] = None
    
    updated_at: datetime = Field(default_factory=datetime.utcnow)
