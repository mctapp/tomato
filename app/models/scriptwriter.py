# app/models/scriptwriter.py
from typing import List, Optional, Any
from sqlmodel import Field, Relationship, SQLModel
from datetime import datetime

# --- ScriptwriterLanguage Model ---
class ScriptwriterLanguageBase(SQLModel):
    language_code: str = Field(index=True)
    proficiency_level: int = Field(ge=1, le=9)
    scriptwriter_id: Optional[int] = Field(default=None, foreign_key="scriptwriters.id", index=True)

class ScriptwriterLanguage(ScriptwriterLanguageBase, table=True):
    __tablename__ = "scriptwriter_languages"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)

    # Relationship back to Scriptwriter
    scriptwriter: Optional["Scriptwriter"] = Relationship(back_populates="languages")

class ScriptwriterLanguageCreate(ScriptwriterLanguageBase):
    pass

class ScriptwriterLanguageRead(ScriptwriterLanguageBase):
    id: int
    created_at: datetime

# --- ScriptwriterSpecialty Model ---
class ScriptwriterSpecialtyBase(SQLModel):
    specialty_type: str = Field(index=True)  # 'AD' or 'CC'
    skill_grade: int = Field(ge=1, le=9)
    scriptwriter_id: Optional[int] = Field(default=None, foreign_key="scriptwriters.id", index=True)

class ScriptwriterSpecialty(ScriptwriterSpecialtyBase, table=True):
    __tablename__ = "scriptwriter_specialties"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)

    # Relationship back to Scriptwriter
    scriptwriter: Optional["Scriptwriter"] = Relationship(back_populates="specialties")

class ScriptwriterSpecialtyCreate(ScriptwriterSpecialtyBase):
    pass

class ScriptwriterSpecialtyRead(ScriptwriterSpecialtyBase):
    id: int
    created_at: datetime

# --- ScriptwriterWorkLog Model ---
class ScriptwriterWorkLogBase(SQLModel):
    work_title: str
    work_year_month: str  # YYYY-MM 형식
    content: str
    scriptwriter_id: Optional[int] = Field(default=None, foreign_key="scriptwriters.id", index=True)

class ScriptwriterWorkLog(ScriptwriterWorkLogBase, table=True):
    __tablename__ = "scriptwriter_work_logs"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)

    # Relationship back to Scriptwriter
    scriptwriter: Optional["Scriptwriter"] = Relationship(back_populates="work_logs")

class ScriptwriterWorkLogCreate(ScriptwriterWorkLogBase):
    pass

class ScriptwriterWorkLogRead(ScriptwriterWorkLogBase):
    id: int
    created_at: datetime

# --- ScriptwriterSample Model ---
class ScriptwriterSampleBase(SQLModel):
    work_title: str
    director_name: Optional[str] = Field(default=None)
    work_year: Optional[int] = Field(default=None)
    has_ad: bool = Field(default=False)
    has_cc: bool = Field(default=False)
    timecode_in: Optional[str] = Field(default=None)
    timecode_out: Optional[str] = Field(default=None)
    reference_url: Optional[str] = Field(default=None)
    narration_content: Optional[str] = Field(default=None)
    narration_memo: Optional[str] = Field(default=None)
    poster_image: Optional[str] = Field(default=None)
    reference_image: Optional[str] = Field(default=None)
    sequence_number: int = Field(ge=1, le=5)
    scriptwriter_id: Optional[int] = Field(default=None, foreign_key="scriptwriters.id", index=True)

class ScriptwriterSample(ScriptwriterSampleBase, table=True):
    __tablename__ = "scriptwriter_samples"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    updated_at: datetime = Field(default_factory=datetime.utcnow, nullable=False, sa_column_kwargs={"onupdate": datetime.utcnow})

    # Relationship back to Scriptwriter
    scriptwriter: Optional["Scriptwriter"] = Relationship(back_populates="samples")

class ScriptwriterSampleCreate(ScriptwriterSampleBase):
    pass

class ScriptwriterSampleRead(ScriptwriterSampleBase):
    id: int
    created_at: datetime
    updated_at: datetime

# --- Scriptwriter Model ---
class ScriptwriterBase(SQLModel):
    name: str = Field(index=True)
    gender: Optional[str] = Field(default=None)
    location: Optional[str] = Field(default=None)
    skill_level: Optional[int] = Field(default=None, ge=1, le=9)
    profile_image: Optional[str] = Field(default=None)
    phone: Optional[str] = Field(default=None)
    email: Optional[str] = Field(default=None)
    memo: Optional[str] = Field(default=None)

class Scriptwriter(ScriptwriterBase, table=True):
    __tablename__ = "scriptwriters"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    updated_at: datetime = Field(default_factory=datetime.utcnow, nullable=False, sa_column_kwargs={"onupdate": datetime.utcnow})

    # --- Relationships ---
    languages: List["ScriptwriterLanguage"] = Relationship(
        back_populates="scriptwriter",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )
    specialties: List["ScriptwriterSpecialty"] = Relationship(
        back_populates="scriptwriter",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )
    work_logs: List["ScriptwriterWorkLog"] = Relationship(
        back_populates="scriptwriter",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )
    samples: List["ScriptwriterSample"] = Relationship(
        back_populates="scriptwriter",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )
    
    # 접근성 자산 크레딧 관계 추가
    access_asset_credits: List["AccessAssetCredit"] = Relationship(
        back_populates="scriptwriter",
        sa_relationship_kwargs={"foreign_keys": "[AccessAssetCredit.scriptwriter_id]"}
    )

# --- Scriptwriter Schemas (Read/Create/Update) ---
class ScriptwriterReadBase(ScriptwriterBase):
    id: int
    created_at: datetime
    updated_at: datetime

# 상세 조회용 스키마 (관계 포함)
class ScriptwriterRead(ScriptwriterReadBase):
    languages: List[ScriptwriterLanguageRead] = []
    specialties: List[ScriptwriterSpecialtyRead] = []
    work_logs: List[ScriptwriterWorkLogRead] = []
    samples: List[ScriptwriterSampleRead] = []

# 목록 요약 조회용 스키마
class ScriptwriterSummary(SQLModel):
    id: int
    name: str
    skill_level: Optional[int] = None
    profile_image: Optional[str] = None
    gender: Optional[str] = None
    location: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    languages: List[str] = []  # language_code 문자열 리스트
    specialties: List[str] = []  # specialty_type 문자열 리스트
    samples_count: int = 0
    work_logs_count: int = 0
    created_at: datetime

# 생성용 스키마 (관계 데이터 포함)
class ScriptwriterCreate(ScriptwriterBase):
    languages: Optional[List[ScriptwriterLanguageCreate]] = []
    specialties: Optional[List[ScriptwriterSpecialtyCreate]] = []

# 수정용 스키마 (관계 데이터 포함, Optional)
class ScriptwriterUpdate(ScriptwriterBase):
    name: Optional[str] = None
    gender: Optional[str] = None
    location: Optional[str] = None
    skill_level: Optional[int] = None
    profile_image: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    memo: Optional[str] = None
    languages: Optional[List[ScriptwriterLanguageCreate]] = None
    specialties: Optional[List[ScriptwriterSpecialtyCreate]] = None

# 이미지 업로드 응답 스키마
class ProfileImageResponse(SQLModel):
    profile_image: str
