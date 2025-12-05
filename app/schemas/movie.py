# app/schemas/movie.py
from typing import Optional, List, Dict, Any
from datetime import date, datetime
from pydantic import Field, field_validator
from app.schemas.base import BaseSchema

# Schema for Distributor relationship
class DistributorBase(BaseSchema):
    name: str
    business_registration_number: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    address: Optional[str] = None
    is_active: bool = True

class DistributorSimple(BaseSchema):
    id: int
    name: str
    is_active: bool
    model_config = {
        "from_attributes": True
    }

# File info schema
class FileInfo(BaseSchema):
    id: int
    original_filename: str
    content_type: str
    file_size: int
    s3_key: Optional[str] = None
    is_public: bool = False
    supported_os_type: Optional[str] = None  # 추가됨: ios, android
    model_config = {
        "from_attributes": True
    }

# Movie schemas
class MovieBase(BaseSchema):
    title: str
    director: Optional[str] = None
    production_year: Optional[int] = None
    release_date: Optional[date] = None
    film_genre: Optional[str] = None
    film_rating: Optional[str] = None
    running_time: Optional[int] = None
    country: Optional[str] = None
    logline: Optional[str] = None
    visibility_type: str = "always"
    start_at: Optional[datetime] = None
    end_at: Optional[datetime] = None
    feature_code: Optional[str] = None
    admin_memo: Optional[str] = None
    distributor_id: Optional[int] = None
    is_public: bool = False
    publishing_status: str = "draft"
    
    @field_validator('start_at', 'end_at', mode='before')
    @classmethod
    def empty_str_to_none(cls, v):
        if v == "":
            return None
        return v

class MovieCreate(MovieBase):
    poster_file_id: Optional[int] = None

class MovieUpdate(BaseSchema):
    title: Optional[str] = None
    director: Optional[str] = None
    production_year: Optional[int] = None
    cast: Optional[str] = None
    release_date: Optional[date] = None
    film_genre: Optional[str] = None
    film_rating: Optional[str] = None
    running_time: Optional[int] = None
    country: Optional[str] = None
    logline: Optional[str] = None
    visibility_type: Optional[str] = None
    start_at: Optional[datetime] = None
    end_at: Optional[datetime] = None
    feature_code: Optional[str] = None
    admin_memo: Optional[str] = None
    distributor_id: Optional[int] = None
    is_public: Optional[bool] = None
    publishing_status: Optional[str] = None
    poster_file_id: Optional[int] = None
    
    @field_validator('start_at', 'end_at', mode='before')
    @classmethod
    def empty_str_to_none(cls, v):
        if v == "":
            return None
        return v

class MovieResponse(MovieBase):
    id: int
    created_at: datetime
    updated_at: datetime
    distributor: Optional[DistributorSimple] = None
    model_config = {
        "from_attributes": True
    }

# 상세 응답을 위한 확장 스키마
class MovieDetailResponse(MovieResponse):
    poster_file: Optional[FileInfo] = None
    signature_file: Optional[FileInfo] = None
    # 레거시 필드 포함 (기존 코드와의 호환성을 위해)
    poster_original_rendition_id: Optional[int] = None
    signature_s3_filename: Optional[str] = None
    signature_s3_directory: Optional[str] = None
    original_signature_filename: Optional[str] = None
    signature_file_size: Optional[int] = None
    signature_upload_time: Optional[datetime] = None
    poster_file_id: Optional[int] = None

class MovieSummaryResponse(BaseSchema):
    id: int
    title: str
    end_at: datetime
    
    # 남은 일수 계산 (선택적)
    @property
    def days_remaining(self) -> int:
        now = datetime.now()
        delta = self.end_at - now
        return max(0, delta.days)
    
    model_config = {
        "from_attributes": True
    }

# 최근 등록된, 수정된 영화 목록을 위한 스키마 추가
class RecentMovieResponse(BaseSchema):
    id: int
    title: str
    created_at: datetime
    publishing_status: str  # 추가: 게시 상태도 함께 표시하기 위함
    
    model_config = {
        "from_attributes": True
    }

# 새로 추가된 구조화된 스키마
class VisibilityTypeCounts(BaseSchema):
    always: int = 0
    period: int = 0
    hidden: int = 0

class PublishingStatusCounts(BaseSchema):
    draft: int = 0
    published: int = 0
    archived: int = 0

class MovieStats(BaseSchema):
    total: int
    visibility_types: VisibilityTypeCounts
    publishing_statuses: PublishingStatusCounts
