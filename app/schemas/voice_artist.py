# app/schemas/voice_artist.py
from typing import Optional, List
from datetime import datetime
from pydantic import Field
from app.schemas.base import BaseSchema

# 성우 아티스트 샘플 스키마
class VoiceArtistSampleBase(BaseSchema):
    sequence_number: int = Field(..., ge=1, le=5)
    title: str = Field(..., min_length=1, max_length=255)
    file_path: Optional[str] = None

class VoiceArtistSampleCreate(VoiceArtistSampleBase):
    pass

class VoiceArtistSampleInDB(VoiceArtistSampleBase):
    id: int
    voice_artist_id: int
    file_path: str
    created_at: datetime
    
    model_config = {
        "from_attributes": True
    }

# 성우 아티스트 전문영역 스키마
class VoiceArtistExpertiseBase(BaseSchema):
    domain: str = Field(..., pattern="^(movie|video|theater|performance|other)$")
    domain_other: Optional[str] = None
    grade: int = Field(..., ge=1, le=9)

class VoiceArtistExpertiseCreate(VoiceArtistExpertiseBase):
    pass

class VoiceArtistExpertiseInDB(VoiceArtistExpertiseBase):
    voice_artist_id: int
    created_at: datetime
    
    model_config = {
        "from_attributes": True
    }

# 성우 아티스트 스키마
class VoiceArtistBase(BaseSchema):
    # 필드명을 데이터베이스 컬럼명과 일치시킴
    voiceartist_name: str = Field(..., min_length=1, max_length=100)
    profile_image: Optional[str] = None
    voiceartist_gender: Optional[str] = Field(None, pattern="^(male|female|other|prefer_not_to_say)$")
    voiceartist_location: Optional[str] = None
    voiceartist_level: Optional[int] = Field(None, ge=1, le=9)
    voiceartist_phone: Optional[str] = Field(None, max_length=50)
    voiceartist_email: Optional[str] = Field(None, max_length=255)
    voiceartist_memo: Optional[str] = None
    
    model_config = {
        "from_attributes": True
    }

class VoiceArtistCreate(VoiceArtistBase):
    expertise: Optional[List[VoiceArtistExpertiseCreate]] = []

class VoiceArtistUpdate(BaseSchema):
    # 필드명을 데이터베이스 컬럼명과 일치시킴
    voiceartist_name: Optional[str] = Field(None, min_length=1, max_length=100)
    profile_image: Optional[str] = None
    voiceartist_gender: Optional[str] = Field(None, pattern="^(male|female|other|prefer_not_to_say)$")
    voiceartist_location: Optional[str] = None
    voiceartist_level: Optional[int] = Field(None, ge=1, le=9)
    voiceartist_phone: Optional[str] = Field(None, max_length=50)
    voiceartist_email: Optional[str] = Field(None, max_length=255)
    voiceartist_memo: Optional[str] = None
    expertise: Optional[List[VoiceArtistExpertiseCreate]] = None
    
    model_config = {
        "from_attributes": True
    }

class VoiceArtistInDBBase(VoiceArtistBase):
    id: int
    created_at: datetime
    updated_at: datetime
    samples: List[VoiceArtistSampleInDB] = []
    expertise: List[VoiceArtistExpertiseInDB] = []
    
    model_config = {
        "from_attributes": True
    }

class VoiceArtist(VoiceArtistInDBBase):
    pass

class VoiceArtistSummary(BaseSchema):
    id: int
    # 필드명을 데이터베이스 컬럼명과 일치시킴
    voiceartist_name: str
    voiceartist_level: Optional[int] = None
    voiceartist_gender: Optional[str] = None
    voiceartist_location: Optional[str] = None
    voiceartist_phone: Optional[str] = None
    voiceartist_email: Optional[str] = None
    profile_image: Optional[str] = None
    samples_count: int = 0
    created_at: datetime
    
    model_config = {
        "from_attributes": True
    }

# 검색 필터 스키마
class VoiceArtistSearchFilters(BaseSchema):
    keyword: Optional[str] = None
    skill_levels: Optional[List[int]] = None
    locations: Optional[List[str]] = None
    genders: Optional[List[str]] = None

# 페이지네이션 메타 스키마
class PaginationMeta(BaseSchema):
    total: int
    page: int
    limit: int
    total_pages: int
    has_next: bool
    has_prev: bool

# 프로필 이미지 응답 스키마
class ProfileImageResponse(BaseSchema):
    profile_image: str
    
    model_config = {
        "from_attributes": True
    }

# 성우 통계 정보 응답 스키마 (대시보드용)
class VoiceArtistStats(BaseSchema):
    total_voice_artists: int
    total_samples: int
    
    model_config = {
        "from_attributes": True
    }
# 성우가 참여한 접근성 미디어 자산 응답 스키마
class AccessAssetMovieInfo(BaseSchema):
    id: int
    title: str
    director: Optional[str] = None
    release_date: Optional[datetime] = None
    
    model_config = {
        "from_attributes": True
    }

class AccessAssetCreditInfo(BaseSchema):
    role: str
    is_primary: bool
    sequence_number: int
    memo: Optional[str] = None
    
    model_config = {
        "from_attributes": True
    }

class AccessAssetWithMovie(BaseSchema):
    id: int
    name: str
    media_type: str
    language: str
    asset_type: str
    production_year: Optional[int] = None
    production_status: str
    publishing_status: str
    created_at: datetime
    movie: Optional[AccessAssetMovieInfo] = None
    credit: Optional[AccessAssetCreditInfo] = None
    
    model_config = {
        "from_attributes": True
    }
