# app/schemas/media_access.py
from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import Field
from app.schemas.base import BaseSchema

# 접근 요청 스키마
class MediaAccessRequestBase(BaseSchema):
    """미디어 접근 요청 기본 스키마"""
    media_id: int = Field(..., description="접근성 미디어 자산 ID")
    device_id: Optional[str] = Field(None, description="기기 ID (익명 요청의 경우)")
    user_id: Optional[int] = Field(None, description="사용자 ID (로그인된 경우)")
    request_reason: Optional[str] = Field(None, description="요청 이유")

class MediaAccessRequestCreate(MediaAccessRequestBase):
    """미디어 접근 요청 생성 스키마"""
    pass

class MediaAccessRequestUpdate(BaseSchema):
    """미디어 접근 요청 업데이트 스키마"""
    status: Optional[str] = Field(None, pattern="^(pending|approved|rejected|expired)$", description="변경할 상태")
    admin_id: Optional[int] = Field(None, description="처리자 ID")
    admin_notes: Optional[str] = Field(None, description="관리자 노트")
    expiry_date: Optional[datetime] = Field(None, description="만료일 (승인 시)")

class MediaAccessRequestInDB(MediaAccessRequestBase):
    id: int
    status: str
    admin_id: Optional[int] = None
    admin_notes: Optional[str] = None
    expiry_date: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    
    model_config = {
        "from_attributes": True
    }

# 평가 스키마
class MediaRatingBase(BaseSchema):
    media_id: int
    rating_score: int = Field(..., ge=1, le=5)
    device_id: Optional[str] = None
    user_id: Optional[int] = None
    rating_type: Optional[str] = Field(None, pattern="^(user|expert|admin)$")
    ip_address: Optional[str] = None

class MediaRatingCreate(MediaRatingBase):
    pass

class MediaRatingUpdate(BaseSchema):
    rating_score: Optional[int] = Field(None, ge=1, le=5)
    is_verified: Optional[bool] = None
    admin_modified: Optional[bool] = None

class MediaRatingInDB(MediaRatingBase):
    id: int
    is_verified: bool = False
    admin_id: Optional[int] = None
    admin_modified: bool = False
    created_at: datetime
    updated_at: datetime
    
    model_config = {
        "from_attributes": True
    }

# 피드백 스키마
class RatingFeedbackBase(BaseSchema):
    rating_id: int
    feedback_type: str = Field(..., pattern="^(text|voice)$")
    text_content: Optional[str] = None
    voice_file_path: Optional[str] = None
    is_public: Optional[bool] = False

class RatingFeedbackCreate(RatingFeedbackBase):
    pass

class RatingFeedbackUpdate(BaseSchema):
    text_content: Optional[str] = None
    voice_transcription: Optional[str] = None
    sentiment_score: Optional[float] = None
    sentiment_analysis: Optional[Dict[str, Any]] = None
    is_public: Optional[bool] = None

class RatingFeedbackInDB(RatingFeedbackBase):
    id: int
    voice_transcription: Optional[str] = None
    sentiment_score: Optional[float] = None
    sentiment_analysis: Optional[Dict[str, Any]] = None
    created_at: datetime
    
    model_config = {
        "from_attributes": True
    }

# 제작 작업 스키마
class MediaProductionTaskBase(BaseSchema):
    media_id: int
    task_type: str = Field(..., pattern="^(translation|recording|editing|review|publish)$")
    assigned_to: Optional[int] = None
    due_date: Optional[datetime] = None

class MediaProductionTaskCreate(MediaProductionTaskBase):
    pass

class MediaProductionTaskUpdate(BaseSchema):
    status: Optional[str] = Field(None, pattern="^(pending|in_progress|completed|on_hold)$")
    assigned_to: Optional[int] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    due_date: Optional[datetime] = None
    completion_notes: Optional[str] = None

class MediaProductionTaskInDB(MediaProductionTaskBase):
    id: int
    status: str
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    completion_notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    model_config = {
        "from_attributes": True
    }
