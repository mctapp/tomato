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

# 전문영역 스키마
class AccessExpertExpertiseBase(BaseSchema):
    domain: str = Field(..., pattern="^(movie|video|theater|performance|other)$")
    domain_other: Optional[str] = None
    grade: int = Field(..., ge=1, le=9)

class AccessExpertExpertiseCreate(AccessExpertExpertiseBase):
    pass

class AccessExpertExpertiseInDB(AccessExpertExpertiseBase):
    access_expert_id: int
    created_at: datetime
    
    model_config = {
        "from_attributes": True
    }

# AccessExpert 스키마
SPECIALITY_CHOICES = [
    "감수",
    "자문",
    "연출",
    "PD",
    "자막편집",
    "녹음믹싱",
    "DCP제작",
    "모니터링(장애인)",
    "모니터링(비장애인)",
    "영상편집",
    "홍보",
    "배급",
    "기타"
]

class AccessExpertBase(BaseSchema):
    name: str = Field(..., min_length=1, max_length=100)
    profile_image: Optional[str] = None
    gender: Optional[str] = Field(None, pattern="^(male|female|other|prefer_not_to_say)$")
    location: Optional[str] = None
    level: Optional[int] = Field(None, ge=1, le=9)
    phone: Optional[str] = Field(None, max_length=50)
    email: Optional[str] = Field(None, max_length=255)
    memo: Optional[str] = None
    speciality1: Optional[str] = Field(None, pattern=f"^({'|'.join(SPECIALITY_CHOICES)})$")
    speciality1_level: Optional[int] = Field(None, ge=1, le=9)
    speciality1_memo: Optional[str] = None
    speciality2: Optional[str] = Field(None, pattern=f"^({'|'.join(SPECIALITY_CHOICES)})$")
    speciality2_level: Optional[int] = Field(None, ge=1, le=9)
    speciality2_memo: Optional[str] = None

class AccessExpertCreate(AccessExpertBase):
    expertise: Optional[List[AccessExpertExpertiseCreate]] = []
    representative_works: Optional[List[RepresentativeWorkCreate]] = []

class AccessExpertUpdate(BaseSchema):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    profile_image: Optional[str] = None
    gender: Optional[str] = Field(None, pattern="^(male|female|other|prefer_not_to_say)$")
    location: Optional[str] = None
    level: Optional[int] = Field(None, ge=1, le=9)
    phone: Optional[str] = Field(None, max_length=50)
    email: Optional[str] = Field(None, max_length=255)
    memo: Optional[str] = None
    speciality1: Optional[str] = Field(None, pattern=f"^({'|'.join(SPECIALITY_CHOICES)})$")
    speciality1_level: Optional[int] = Field(None, ge=1, le=9)
    speciality1_memo: Optional[str] = None
    speciality2: Optional[str] = Field(None, pattern=f"^({'|'.join(SPECIALITY_CHOICES)})$")
    speciality2_level: Optional[int] = Field(None, ge=1, le=9)
    speciality2_memo: Optional[str] = None
    expertise: Optional[List[AccessExpertExpertiseCreate]] = None
    representative_works: Optional[List[RepresentativeWorkCreate]] = None

class AccessExpertInDBBase(AccessExpertBase):
    id: int
    created_at: datetime
    updated_at: datetime
    expertise: List[AccessExpertExpertiseInDB] = []
    representative_works: Optional[List[RepresentativeWorkInDB]] = []
    
    model_config = {
        "from_attributes": True
    }

class AccessExpert(AccessExpertInDBBase):
    pass

# 목록 조회용 간단한 스키마
class AccessExpertSummary(BaseSchema):
    id: int
    name: str
    level: Optional[int]
    profile_image: Optional[str] = None
    speciality1: Optional[str] = None
    speciality2: Optional[str] = None
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
