# app/schemas/scriptwriter.py
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

# 해설작가 사용언어 스키마
class ScriptwriterLanguageBase(BaseSchema):
    language_code: str = Field(..., pattern="^(ko|en|zh|ja|vi|tl|ne|id|km|my|si)$")
    proficiency_level: int = Field(..., ge=1, le=9)

class ScriptwriterLanguageCreate(ScriptwriterLanguageBase):
    pass

class ScriptwriterLanguageInDB(ScriptwriterLanguageBase):
    id: int
    scriptwriter_id: int
    created_at: datetime

# 해설작가 해설분야 스키마
class ScriptwriterSpecialtyBase(BaseSchema):
    specialty_type: str = Field(..., pattern="^(AD|CC)$")
    skill_grade: int = Field(..., ge=1, le=9)

class ScriptwriterSpecialtyCreate(ScriptwriterSpecialtyBase):
    pass

class ScriptwriterSpecialtyInDB(ScriptwriterSpecialtyBase):
    id: int
    scriptwriter_id: int
    created_at: datetime

# 해설작가 작업로그 스키마
class ScriptwriterWorkLogBase(BaseSchema):
    work_title: str = Field(..., min_length=1, max_length=255)
    work_year_month: str = Field(..., pattern="^\\d{4}-\\d{2}$")  # YYYY-MM 형식
    content: str = Field(..., min_length=1)

class ScriptwriterWorkLogCreate(ScriptwriterWorkLogBase):
    pass

class ScriptwriterWorkLogInDB(ScriptwriterWorkLogBase):
    id: int
    scriptwriter_id: int
    created_at: datetime

# 해설작가 대표해설 스키마
class ScriptwriterSampleBase(BaseSchema):
    work_title: str = Field(..., min_length=1, max_length=255)
    director_name: Optional[str] = Field(None, max_length=100)
    work_year: Optional[int] = Field(None, ge=1900, le=2100)
    has_ad: bool = Field(default=False)
    has_cc: bool = Field(default=False)
    timecode_in: Optional[str] = Field(None, max_length=20)
    timecode_out: Optional[str] = Field(None, max_length=20)
    reference_url: Optional[str] = None
    narration_content: Optional[str] = None
    narration_memo: Optional[str] = None
    sequence_number: int = Field(..., ge=1, le=5)

class ScriptwriterSampleCreate(ScriptwriterSampleBase):
    pass

class ScriptwriterSampleInDB(ScriptwriterSampleBase):
    id: int
    poster_image: Optional[str] = None
    reference_image: Optional[str] = None
    scriptwriter_id: int
    created_at: datetime
    updated_at: datetime

# 해설작가 스키마
class ScriptwriterBase(BaseSchema):
    name: str = Field(..., min_length=1, max_length=100)
    profile_image: Optional[str] = None
    gender: Optional[str] = Field(None, pattern="^(male|female|other|prefer_not_to_say)$")
    location: Optional[str] = None
    skill_level: Optional[int] = Field(None, ge=1, le=9)
    phone: Optional[str] = Field(None, max_length=50)
    email: Optional[str] = Field(None, max_length=255)
    memo: Optional[str] = None

class ScriptwriterCreate(ScriptwriterBase):
    languages: Optional[List[ScriptwriterLanguageCreate]] = []
    specialties: Optional[List[ScriptwriterSpecialtyCreate]] = []

class ScriptwriterUpdate(BaseSchema):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    profile_image: Optional[str] = None
    gender: Optional[str] = Field(None, pattern="^(male|female|other|prefer_not_to_say)$")
    location: Optional[str] = None
    skill_level: Optional[int] = Field(None, ge=1, le=9)
    phone: Optional[str] = Field(None, max_length=50)
    email: Optional[str] = Field(None, max_length=255)
    memo: Optional[str] = None
    languages: Optional[List[ScriptwriterLanguageCreate]] = None
    specialties: Optional[List[ScriptwriterSpecialtyCreate]] = None

class ScriptwriterInDBBase(ScriptwriterBase):
    id: int
    created_at: datetime
    updated_at: datetime

class Scriptwriter(ScriptwriterInDBBase):
    languages: List[ScriptwriterLanguageInDB] = []
    specialties: List[ScriptwriterSpecialtyInDB] = []
    work_logs: List[ScriptwriterWorkLogInDB] = []
    samples: List[ScriptwriterSampleInDB] = []

# 목록 조회용 최적화된 스키마
class ScriptwriterSummary(BaseSchema):
    id: int
    name: str
    skill_level: Optional[int]
    profile_image: Optional[str] = None
    gender: Optional[str] = None
    location: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    languages: List[str] = Field(default_factory=list, description="사용언어 코드 목록")
    specialties: List[str] = Field(default_factory=list, description="해설분야 목록")
    samples_count: int = Field(default=0, description="총 대표해설 수")
    work_logs_count: int = Field(default=0, description="총 작업로그 수")
    created_at: datetime

# 검색 필터 스키마
class ScriptwriterSearchFilters(BaseSchema):
    keyword: Optional[str] = Field(None, description="검색 키워드")
    skill_levels: Optional[List[int]] = Field(None, description="스킬 레벨 목록")
    languages: Optional[List[str]] = Field(None, description="사용언어 목록")
    specialties: Optional[List[str]] = Field(None, description="해설분야 목록")
    locations: Optional[List[str]] = Field(None, description="지역 목록")
    genders: Optional[List[str]] = Field(None, description="성별 목록")

# 프로필 이미지 응답 스키마
class ProfileImageResponse(BaseSchema):
    profile_image: str

# 포스터 이미지 응답 스키마
class PosterImageResponse(BaseSchema):
    poster_image: str

# 참고 이미지 응답 스키마
class ReferenceImageResponse(BaseSchema):
    reference_image: str
# 크레딧(작업이력) 관련 스키마
class ScriptwriterCreditBase(BaseSchema):
    access_asset_id: int
    movie_id: int
    movie_title: str
    movie_title_en: Optional[str] = None
    release_year: Optional[int] = None
    poster_image: Optional[str] = None
    access_type: str  # AD 또는 CC
    created_at: datetime
    is_primary: bool = Field(default=False, description="주 작업자 여부")

class ScriptwriterCredit(ScriptwriterCreditBase):
    pass

class ScriptwriterCreditsResponse(BaseSchema):
    data: List[ScriptwriterCredit]
    pagination: PaginationMeta
