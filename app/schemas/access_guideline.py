from typing import Optional, List
from datetime import datetime
from pydantic import Field
from app.schemas.base import BaseSchema

# 주요내용 스키마
class AccessGuidelineContentBase(BaseSchema):
    category: str = Field(..., description="구분")
    content: str = Field(..., description="내용")
    sequence_number: int = Field(..., description="순서")

class AccessGuidelineContentCreate(AccessGuidelineContentBase):
    pass

class AccessGuidelineContentInDB(AccessGuidelineContentBase):
    id: int
    guideline_id: int
    created_at: datetime
    
    model_config = {
        "from_attributes": True
    }

# 피드백 스키마
class AccessGuidelineFeedbackBase(BaseSchema):
    feedback_type: str = Field(..., pattern="^(non_disabled|visually_impaired|hearing_impaired)$", description="비장애인/시각장애인/청각장애인")
    content: str = Field(..., description="내용")
    sequence_number: int = Field(..., description="순번")

class AccessGuidelineFeedbackCreate(AccessGuidelineFeedbackBase):
    pass

class AccessGuidelineFeedbackInDB(AccessGuidelineFeedbackBase):
    id: int
    guideline_id: int
    created_at: datetime
    
    model_config = {
        "from_attributes": True
    }

# 메모 스키마
class AccessGuidelineMemoBase(BaseSchema):
    content: str = Field(..., description="메모 내용")

class AccessGuidelineMemoCreate(AccessGuidelineMemoBase):
    pass

class AccessGuidelineMemoInDB(AccessGuidelineMemoBase):
    id: int
    guideline_id: int
    created_at: datetime
    
    model_config = {
        "from_attributes": True
    }

# 가이드라인 스키마
class AccessGuidelineBase(BaseSchema):
    name: str = Field(..., min_length=1, max_length=200, description="가이드라인 이름")
    type: str = Field(..., pattern="^(AD|CC|SL)$", description="음성해설(AD)/자막해설(CC)/수어해설(SL)")
    field: str = Field(..., pattern="^(movie|exhibition|theater|musical|concert|other)$", description="영화영상/전시회/연극/뮤지컬/콘서트/기타")
    field_other: Optional[str] = Field(None, max_length=100, description="분야 기타 직접입력")
    version: str = Field(..., max_length=50, description="버전")
    attachment: Optional[str] = Field(None, description="첨부파일 URL")

class AccessGuidelineCreate(AccessGuidelineBase):
    contents: Optional[List[AccessGuidelineContentCreate]] = []
    feedbacks: Optional[List[AccessGuidelineFeedbackCreate]] = []
    memos: Optional[List[AccessGuidelineMemoCreate]] = []

class AccessGuidelineUpdate(BaseSchema):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    type: Optional[str] = Field(None, pattern="^(AD|CC|SL)$")
    field: Optional[str] = Field(None, pattern="^(movie|exhibition|theater|musical|concert|other)$")
    field_other: Optional[str] = Field(None, max_length=100)
    version: Optional[str] = Field(None, max_length=50)
    attachment: Optional[str] = None
    contents: Optional[List[AccessGuidelineContentCreate]] = None
    feedbacks: Optional[List[AccessGuidelineFeedbackCreate]] = None
    memos: Optional[List[AccessGuidelineMemoCreate]] = None

class AccessGuidelineInDBBase(AccessGuidelineBase):
    id: int
    created_at: datetime
    updated_at: datetime
    contents: List[AccessGuidelineContentInDB] = []
    feedbacks: List[AccessGuidelineFeedbackInDB] = []
    memos: List[AccessGuidelineMemoInDB] = []
    
    model_config = {
        "from_attributes": True
    }

class AccessGuideline(AccessGuidelineInDBBase):
    pass

# 목록 조회용 요약 스키마
class AccessGuidelineSummary(BaseSchema):
    id: int
    name: str
    type: str
    field: str
    field_other: Optional[str]
    version: str
    attachment: Optional[str]
    created_at: datetime
    
    model_config = {
        "from_attributes": True
    }

# 파일 업로드 응답 스키마
class AttachmentResponse(BaseSchema):
    attachment: str
    
    model_config = {
        "from_attributes": True
    }

