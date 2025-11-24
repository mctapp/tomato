# app/schemas/sl_interpreter.py
from typing import Optional, List, Generic, TypeVar
from datetime import datetime
from pydantic import Field, BaseModel
from app.schemas.base import BaseSchema

T = TypeVar('T')

# 페이지네이션 응답 스키마
class PaginationMeta(BaseSchema):
    total: int = Field(..., description="전체 항목 수")
    page: int = Field(..., description="현재 페이지")
    limit: int = Field(..., description="페이지당 항목 수")
    total_pages: int = Field(..., description="전체 페이지 수")
    has_next: bool = Field(..., description="다음 페이지 존재 여부")
    has_prev: bool = Field(..., description="이전 페이지 존재 여부")

class PaginatedResponse(BaseSchema, Generic[T]):
    data: List[T] = Field(..., description="실제 데이터")
    pagination: PaginationMeta = Field(..., description="페이지네이션 정보")

# 수어통역사 사용수어 스키마
class SLInterpreterSignLanguageBase(BaseSchema):
    sign_language_code: str = Field(..., pattern="^(KSL|ASL|VSL|JSL|CSL|BSL|FSL|GSL|ISL|SSL|RSL)$")
    proficiency_level: int = Field(..., ge=1, le=9)

class SLInterpreterSignLanguageCreate(SLInterpreterSignLanguageBase):
    pass

class SLInterpreterSignLanguageInDB(SLInterpreterSignLanguageBase):
    id: int
    sl_interpreter_id: int
    created_at: datetime

# 수어통역사 전문영역 스키마
class SLInterpreterExpertiseBase(BaseSchema):
    expertise_field: str = Field(..., pattern="^(movie|video|theater|performance|other)$")
    expertise_field_other: Optional[str] = None
    skill_grade: int = Field(..., ge=1, le=9)

class SLInterpreterExpertiseCreate(SLInterpreterExpertiseBase):
    pass

class SLInterpreterExpertiseInDB(SLInterpreterExpertiseBase):
    id: int
    sl_interpreter_id: int
    created_at: datetime

# 수어통역사 샘플 스키마
class SLInterpreterSampleBase(BaseSchema):
    title: str = Field(..., min_length=1, max_length=255)
    sample_type: str = Field(..., pattern="^(video|image)$")
    sequence_number: int = Field(..., ge=1, le=5)

class SLInterpreterSampleCreate(SLInterpreterSampleBase):
    pass

class SLInterpreterSampleInDB(SLInterpreterSampleBase):
    id: int
    file_path: Optional[str] = None
    file_size: Optional[int] = None
    file_type: Optional[str] = None
    sl_interpreter_id: int
    created_at: datetime
    updated_at: datetime

# 수어통역사 스키마
class SLInterpreterBase(BaseSchema):
    name: str = Field(..., min_length=1, max_length=100)
    profile_image: Optional[str] = None
    gender: Optional[str] = Field(None, pattern="^(male|female|other|prefer_not_to_say)$")
    location: Optional[str] = None
    skill_level: Optional[int] = Field(None, ge=1, le=9)
    phone: Optional[str] = Field(None, max_length=50)
    email: Optional[str] = Field(None, max_length=255)
    memo: Optional[str] = None

class SLInterpreterCreate(SLInterpreterBase):
    sign_languages: Optional[List[SLInterpreterSignLanguageCreate]] = []
    expertise: Optional[List[SLInterpreterExpertiseCreate]] = []

class SLInterpreterUpdate(BaseSchema):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    profile_image: Optional[str] = None
    gender: Optional[str] = Field(None, pattern="^(male|female|other|prefer_not_to_say)$")
    location: Optional[str] = None
    skill_level: Optional[int] = Field(None, ge=1, le=9)
    phone: Optional[str] = Field(None, max_length=50)
    email: Optional[str] = Field(None, max_length=255)
    memo: Optional[str] = None
    sign_languages: Optional[List[SLInterpreterSignLanguageCreate]] = None
    expertise: Optional[List[SLInterpreterExpertiseCreate]] = None

class SLInterpreterInDBBase(SLInterpreterBase):
    id: int
    created_at: datetime
    updated_at: datetime

class SLInterpreter(SLInterpreterInDBBase):
    sign_languages: List[SLInterpreterSignLanguageInDB] = []
    expertise: List[SLInterpreterExpertiseInDB] = []
    samples: List[SLInterpreterSampleInDB] = []

# 목록 조회용 최적화된 스키마 - phone, email 필드 추가
class SLInterpreterSummary(BaseSchema):
    id: int
    name: str
    skill_level: Optional[int]
    profile_image: Optional[str] = None
    gender: Optional[str] = None
    location: Optional[str] = None
    phone: Optional[str] = None  # 추가된 필드
    email: Optional[str] = None  # 추가된 필드
    sign_languages: List[str] = Field(default_factory=list, description="사용수어 코드 목록")
    samples_count: int = Field(default=0, description="총 샘플 수")
    video_samples_count: int = Field(default=0, description="비디오 샘플 수")
    image_samples_count: int = Field(default=0, description="이미지 샘플 수")
    created_at: datetime

# 검색 필터 스키마
class SLInterpreterSearchFilters(BaseSchema):
    keyword: Optional[str] = Field(None, description="검색 키워드")
    skill_levels: Optional[List[int]] = Field(None, description="스킬 레벨 목록")
    sign_languages: Optional[List[str]] = Field(None, description="사용수어 목록")
    locations: Optional[List[str]] = Field(None, description="지역 목록")
    genders: Optional[List[str]] = Field(None, description="성별 목록")

# 프로필 이미지 응답 스키마
class ProfileImageResponse(BaseSchema):
    profile_image: str
