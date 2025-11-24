
# app/models/sl_interpreter.py
from typing import List, Optional, Any
from sqlmodel import Field, Relationship, SQLModel
from datetime import datetime

# --- SLInterpreterSignLanguage Model ---
class SLInterpreterSignLanguageBase(SQLModel):
    sign_language_code: str = Field(index=True)
    proficiency_level: int = Field(ge=1, le=9)
    sl_interpreter_id: Optional[int] = Field(default=None, foreign_key="sl_interpreters.id", index=True)

class SLInterpreterSignLanguage(SLInterpreterSignLanguageBase, table=True):
    __tablename__ = "sl_interpreter_sign_languages"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)

    # Relationship back to SLInterpreter
    sl_interpreter: Optional["SLInterpreter"] = Relationship(back_populates="sign_languages")

class SLInterpreterSignLanguageCreate(SLInterpreterSignLanguageBase):
    pass

class SLInterpreterSignLanguageRead(SLInterpreterSignLanguageBase):
    id: int
    created_at: datetime

# --- SLInterpreterExpertise Model ---
class SLInterpreterExpertiseBase(SQLModel):
    expertise_field: str = Field(index=True)
    expertise_field_other: Optional[str] = Field(default=None)
    skill_grade: int = Field(ge=1, le=9)
    sl_interpreter_id: Optional[int] = Field(default=None, foreign_key="sl_interpreters.id", index=True)

class SLInterpreterExpertise(SLInterpreterExpertiseBase, table=True):
    __tablename__ = "sl_interpreter_expertise"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)

    # Relationship back to SLInterpreter
    sl_interpreter: Optional["SLInterpreter"] = Relationship(back_populates="expertise")

class SLInterpreterExpertiseCreate(SLInterpreterExpertiseBase):
    pass

class SLInterpreterExpertiseRead(SLInterpreterExpertiseBase):
    id: int
    created_at: datetime

# --- SLInterpreterSample Model ---
class SLInterpreterSampleBase(SQLModel):
    title: str
    sample_type: str = Field(index=True)  # 'video' or 'image'
    sequence_number: int = Field(ge=1, le=5)
    file_path: Optional[str] = Field(default=None)
    file_size: Optional[int] = Field(default=None)
    file_type: Optional[str] = Field(default=None)
    sl_interpreter_id: Optional[int] = Field(default=None, foreign_key="sl_interpreters.id", index=True)

class SLInterpreterSample(SLInterpreterSampleBase, table=True):
    __tablename__ = "sl_interpreter_samples"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    updated_at: datetime = Field(default_factory=datetime.utcnow, nullable=False, sa_column_kwargs={"onupdate": datetime.utcnow})

    # Relationship back to SLInterpreter
    sl_interpreter: Optional["SLInterpreter"] = Relationship(back_populates="samples")

class SLInterpreterSampleCreate(SLInterpreterSampleBase):
    pass

class SLInterpreterSampleRead(SLInterpreterSampleBase):
    id: int
    created_at: datetime
    updated_at: datetime

# --- SLInterpreter Model ---
class SLInterpreterBase(SQLModel):
    name: str = Field(index=True)
    gender: Optional[str] = Field(default=None)
    location: Optional[str] = Field(default=None)
    skill_level: Optional[int] = Field(default=None, ge=1, le=9)
    profile_image: Optional[str] = Field(default=None)
    phone: Optional[str] = Field(default=None)
    email: Optional[str] = Field(default=None)
    memo: Optional[str] = Field(default=None)

class SLInterpreter(SLInterpreterBase, table=True):
    __tablename__ = "sl_interpreters"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    updated_at: datetime = Field(default_factory=datetime.utcnow, nullable=False, sa_column_kwargs={"onupdate": datetime.utcnow})

    # --- Relationships ---
    sign_languages: List["SLInterpreterSignLanguage"] = Relationship(
        back_populates="sl_interpreter",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )
    expertise: List["SLInterpreterExpertise"] = Relationship(
        back_populates="sl_interpreter",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )
    samples: List["SLInterpreterSample"] = Relationship(
        back_populates="sl_interpreter",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )
    
    # 접근성 자산 크레딧 관계 추가
    access_asset_credits: List["AccessAssetCredit"] = Relationship(
        back_populates="sl_interpreter",
        sa_relationship_kwargs={"foreign_keys": "[AccessAssetCredit.sl_interpreter_id]"}
    )

# --- SLInterpreter Schemas (Read/Create/Update) ---
class SLInterpreterReadBase(SLInterpreterBase):
    id: int
    created_at: datetime
    updated_at: datetime

# 상세 조회용 스키마 (관계 포함)
class SLInterpreterRead(SLInterpreterReadBase):
    sign_languages: List[SLInterpreterSignLanguageRead] = []
    expertise: List[SLInterpreterExpertiseRead] = []
    samples: List[SLInterpreterSampleRead] = []

# 목록 요약 조회용 스키마
class SLInterpreterSummary(SQLModel):
    id: int
    name: str
    skill_level: Optional[int] = None
    profile_image: Optional[str] = None
    sign_languages: List[str] = []  # sign_language_code 문자열 리스트
    samples_count: int = 0
    video_samples_count: int = 0
    image_samples_count: int = 0
    created_at: datetime

# 생성용 스키마 (관계 데이터 포함)
class SLInterpreterCreate(SLInterpreterBase):
    sign_languages: Optional[List[SLInterpreterSignLanguageCreate]] = []
    expertise: Optional[List[SLInterpreterExpertiseCreate]] = []

# 수정용 스키마 (관계 데이터 포함, Optional)
class SLInterpreterUpdate(SLInterpreterBase):
    name: Optional[str] = None  # 모든 필드를 Optional로 변경
    gender: Optional[str] = None
    location: Optional[str] = None
    skill_level: Optional[int] = None
    profile_image: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    memo: Optional[str] = None
    # 관계 업데이트는 전체 교체 방식이므로 List 유지, Optional 아님 (None 허용)
    sign_languages: Optional[List[SLInterpreterSignLanguageCreate]] = None
    expertise: Optional[List[SLInterpreterExpertiseCreate]] = None

# 이미지 업로드 응답 스키마
class ProfileImageResponse(SQLModel):
    profile_image: str
