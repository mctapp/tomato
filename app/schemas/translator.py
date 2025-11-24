from typing import Optional, List
from datetime import datetime
from pydantic import Field
from app.schemas.base import BaseSchema

# 대표작품 스키마
class RepresentativeWorkBase(BaseSchema):
    year: int
    category: str
    title: str
    role: Optional[str] = None
    memo: Optional[str] = None
    sequence_number: int

class RepresentativeWorkCreate(RepresentativeWorkBase):
    pass

class RepresentativeWorkInDB(RepresentativeWorkBase):
    id: int
    person_type: str
    person_id: int
    movie_id: Optional[int] = None
    external_link: Optional[str] = None
    created_at: datetime
    
    model_config = {
        "from_attributes": True
    }

# 번역가 전문능력 스키마
class TranslatorSpecialtyBase(BaseSchema):
    specialty_type: str = Field(..., pattern="^(AD|CC|SL)$")

class TranslatorSpecialtyCreate(TranslatorSpecialtyBase):
    pass

class TranslatorSpecialtyInDB(TranslatorSpecialtyBase):
    translator_id: int
    created_at: datetime
    
    model_config = {
        "from_attributes": True
    }

# 번역가 전문영역 스키마
class TranslatorExpertiseBase(BaseSchema):
    domain: str = Field(..., pattern="^(movie|video|theater|performance|other)$")
    domain_other: Optional[str] = None
    grade: int = Field(..., ge=1, le=9)

class TranslatorExpertiseCreate(TranslatorExpertiseBase):
    pass

class TranslatorExpertiseInDB(TranslatorExpertiseBase):
    translator_id: int
    created_at: datetime
    
    model_config = {
        "from_attributes": True
    }

# 번역가 스키마
class TranslatorBase(BaseSchema):
    name: str = Field(..., min_length=1, max_length=100)
    profile_image: Optional[str] = None
    gender: Optional[str] = Field(None, pattern="^(male|female|other|prefer_not_to_say)$")
    location: Optional[str] = None
    level: Optional[int] = Field(None, ge=1, le=9)
    phone: Optional[str] = Field(None, max_length=50)  # 전화번호 추가
    email: Optional[str] = Field(None, max_length=255)  # 이메일 추가
    memo: Optional[str] = None

class TranslatorCreate(TranslatorBase):
    specialties: Optional[List[TranslatorSpecialtyCreate]] = []
    expertise: Optional[List[TranslatorExpertiseCreate]] = []
    representative_works: Optional[List[RepresentativeWorkCreate]] = []

class TranslatorUpdate(BaseSchema):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    profile_image: Optional[str] = None
    gender: Optional[str] = Field(None, pattern="^(male|female|other|prefer_not_to_say)$")
    location: Optional[str] = None
    level: Optional[int] = Field(None, ge=1, le=9)
    phone: Optional[str] = Field(None, max_length=50)  # 전화번호 추가
    email: Optional[str] = Field(None, max_length=255)  # 이메일 추가
    memo: Optional[str] = None
    specialties: Optional[List[TranslatorSpecialtyCreate]] = None
    expertise: Optional[List[TranslatorExpertiseCreate]] = None
    representative_works: Optional[List[RepresentativeWorkCreate]] = None

class TranslatorInDBBase(TranslatorBase):
    id: int
    created_at: datetime
    updated_at: datetime
    specialties: List[TranslatorSpecialtyInDB] = []
    expertise: List[TranslatorExpertiseInDB] = []
    representative_works: Optional[List[RepresentativeWorkInDB]] = []
    
    model_config = {
        "from_attributes": True
    }

class Translator(TranslatorInDBBase):
    pass

# 목록 조회용 간단한 스키마
class TranslatorSummary(BaseSchema):
    id: int
    name: str
    level: Optional[int]
    profile_image: Optional[str] = None
    specialties: List[str]
    created_at: datetime
    
    model_config = {
        "from_attributes": True
    }

# 프로필 이미지 응답 스키마
class ProfileImageResponse(BaseSchema):
    profile_image: str
    
    model_config = {
        "from_attributes": True
    }
