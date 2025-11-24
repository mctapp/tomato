# app/schemas/staff.py
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

# 스태프 역할 스키마
class StaffRoleBase(BaseSchema):
    role_type: str = Field(..., pattern="^(producer|director|supervisor|monitor_general|monitor_visual|monitor_hearing|pr|marketing|design|accounting|other)$")
    role_other: Optional[str] = None

class StaffRoleCreate(StaffRoleBase):
    pass

class StaffRoleInDB(StaffRoleBase):
    id: int
    staff_id: int
    created_at: datetime

# 스태프 전문영역 스키마
class StaffExpertiseBase(BaseSchema):
    expertise_field: str = Field(..., pattern="^(movie|video|theater|performance|other)$")
    expertise_field_other: Optional[str] = None
    skill_grade: int = Field(..., ge=1, le=9)

class StaffExpertiseCreate(StaffExpertiseBase):
    pass

class StaffExpertiseInDB(StaffExpertiseBase):
    id: int
    staff_id: int
    created_at: datetime

# 스태프 작업로그 스키마
class StaffWorkLogBase(BaseSchema):
    work_title: str = Field(..., min_length=1, max_length=255)
    work_year_month: str = Field(..., pattern="^\\d{4}-\\d{2}$")  # YYYY-MM 형식
    content: str = Field(..., min_length=1)

class StaffWorkLogCreate(StaffWorkLogBase):
    pass

class StaffWorkLogInDB(StaffWorkLogBase):
    id: int
    staff_id: int
    created_at: datetime

# 스태프 대표작 스키마
class StaffPortfolioBase(BaseSchema):
    work_title: str = Field(..., min_length=1, max_length=255)
    director_name: Optional[str] = Field(None, max_length=100)
    work_year: Optional[int] = Field(None, ge=1900, le=2100)
    has_ad: bool = Field(default=False)
    has_cc: bool = Field(default=False)
    reference_url: Optional[str] = None
    participation_content: Optional[str] = None
    sequence_number: int = Field(..., ge=1, le=5)

class StaffPortfolioCreate(StaffPortfolioBase):
    pass

class StaffPortfolioInDB(StaffPortfolioBase):
    id: int
    poster_image: Optional[str] = None
    credit_image: Optional[str] = None
    staff_id: int
    created_at: datetime
    updated_at: datetime

# 스태프 스키마
class StaffBase(BaseSchema):
    name: str = Field(..., min_length=1, max_length=100)
    profile_image: Optional[str] = None
    gender: Optional[str] = Field(None, pattern="^(male|female|other|prefer_not_to_say)$")
    location: Optional[str] = None
    skill_level: Optional[int] = Field(None, ge=1, le=9)
    phone: Optional[str] = Field(None, max_length=50)
    email: Optional[str] = Field(None, max_length=255)
    memo: Optional[str] = None

class StaffCreate(StaffBase):
    roles: Optional[List[StaffRoleCreate]] = []
    expertise: Optional[List[StaffExpertiseCreate]] = []

class StaffUpdate(BaseSchema):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    profile_image: Optional[str] = None
    gender: Optional[str] = Field(None, pattern="^(male|female|other|prefer_not_to_say)$")
    location: Optional[str] = None
    skill_level: Optional[int] = Field(None, ge=1, le=9)
    phone: Optional[str] = Field(None, max_length=50)
    email: Optional[str] = Field(None, max_length=255)
    memo: Optional[str] = None
    roles: Optional[List[StaffRoleCreate]] = None
    expertise: Optional[List[StaffExpertiseCreate]] = None

class StaffInDBBase(StaffBase):
    id: int
    created_at: datetime
    updated_at: datetime

class Staff(StaffInDBBase):
    roles: List[StaffRoleInDB] = []
    expertise: List[StaffExpertiseInDB] = []
    work_logs: List[StaffWorkLogInDB] = []
    portfolios: List[StaffPortfolioInDB] = []

# 목록 조회용 최적화된 스키마
class StaffSummary(BaseSchema):
    id: int
    name: str
    skill_level: Optional[int]
    profile_image: Optional[str] = None
    gender: Optional[str] = None
    location: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    roles: List[str] = Field(default_factory=list, description="역할 목록")
    portfolios_count: int = Field(default=0, description="총 대표작 수")
    work_logs_count: int = Field(default=0, description="총 작업로그 수")
    created_at: datetime

# 검색 필터 스키마
class StaffSearchFilters(BaseSchema):
    keyword: Optional[str] = Field(None, description="검색 키워드")
    skill_levels: Optional[List[int]] = Field(None, description="스킬 레벨 목록")
    roles: Optional[List[str]] = Field(None, description="역할 목록")
    locations: Optional[List[str]] = Field(None, description="지역 목록")
    genders: Optional[List[str]] = Field(None, description="성별 목록")

# 프로필 이미지 응답 스키마
class ProfileImageResponse(BaseSchema):
    profile_image: str

# 포스터 이미지 응답 스키마
class PosterImageResponse(BaseSchema):
    poster_image: str

# 크레디트 이미지 응답 스키마
class CreditImageResponse(BaseSchema):
    credit_image: str
