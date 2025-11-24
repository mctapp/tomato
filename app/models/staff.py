# app/models/staff.py
from typing import List, Optional, Any
from sqlmodel import Field, Relationship, SQLModel
from datetime import datetime

# --- StaffRole Model ---
class StaffRoleBase(SQLModel):
    role_type: str = Field(index=True)  # producer, director, supervisor, etc.
    role_other: Optional[str] = Field(default=None)  # 기타 선택 시 직접 입력
    staff_id: Optional[int] = Field(default=None, foreign_key="staffs.id", index=True)

class StaffRole(StaffRoleBase, table=True):
    __tablename__ = "staff_roles"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)

    # Relationship back to Staff
    staff: Optional["Staff"] = Relationship(back_populates="roles")

class StaffRoleCreate(StaffRoleBase):
    pass

class StaffRoleRead(StaffRoleBase):
    id: int
    created_at: datetime

# --- StaffExpertise Model ---
class StaffExpertiseBase(SQLModel):
    expertise_field: str = Field(index=True)
    expertise_field_other: Optional[str] = Field(default=None)
    skill_grade: int = Field(ge=1, le=9)
    staff_id: Optional[int] = Field(default=None, foreign_key="staffs.id", index=True)

class StaffExpertise(StaffExpertiseBase, table=True):
    __tablename__ = "staff_expertise"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)

    # Relationship back to Staff
    staff: Optional["Staff"] = Relationship(back_populates="expertise")

class StaffExpertiseCreate(StaffExpertiseBase):
    pass

class StaffExpertiseRead(StaffExpertiseBase):
    id: int
    created_at: datetime

# --- StaffWorkLog Model ---
class StaffWorkLogBase(SQLModel):
    work_title: str
    work_year_month: str  # YYYY-MM 형식
    content: str
    staff_id: Optional[int] = Field(default=None, foreign_key="staffs.id", index=True)

class StaffWorkLog(StaffWorkLogBase, table=True):
    __tablename__ = "staff_work_logs"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)

    # Relationship back to Staff
    staff: Optional["Staff"] = Relationship(back_populates="work_logs")

class StaffWorkLogCreate(StaffWorkLogBase):
    pass

class StaffWorkLogRead(StaffWorkLogBase):
    id: int
    created_at: datetime

# --- StaffPortfolio Model ---
class StaffPortfolioBase(SQLModel):
    work_title: str
    director_name: Optional[str] = Field(default=None)
    work_year: Optional[int] = Field(default=None)
    has_ad: bool = Field(default=False)
    has_cc: bool = Field(default=False)
    reference_url: Optional[str] = Field(default=None)
    participation_content: Optional[str] = Field(default=None)  # 참여 내용 (구 narration_memo)
    poster_image: Optional[str] = Field(default=None)
    credit_image: Optional[str] = Field(default=None)  # 크레디트 이미지 (구 reference_image)
    sequence_number: int = Field(ge=1, le=5)
    staff_id: Optional[int] = Field(default=None, foreign_key="staffs.id", index=True)

class StaffPortfolio(StaffPortfolioBase, table=True):
    __tablename__ = "staff_portfolios"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    updated_at: datetime = Field(default_factory=datetime.utcnow, nullable=False, sa_column_kwargs={"onupdate": datetime.utcnow})

    # Relationship back to Staff
    staff: Optional["Staff"] = Relationship(back_populates="portfolios")

class StaffPortfolioCreate(StaffPortfolioBase):
    pass

class StaffPortfolioRead(StaffPortfolioBase):
    id: int
    created_at: datetime
    updated_at: datetime

# --- Staff Model ---
class StaffBase(SQLModel):
    name: str = Field(index=True)
    gender: Optional[str] = Field(default=None)
    location: Optional[str] = Field(default=None)
    skill_level: Optional[int] = Field(default=None, ge=1, le=9)
    profile_image: Optional[str] = Field(default=None)
    phone: Optional[str] = Field(default=None)
    email: Optional[str] = Field(default=None)
    memo: Optional[str] = Field(default=None)

class Staff(StaffBase, table=True):
    __tablename__ = "staffs"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    updated_at: datetime = Field(default_factory=datetime.utcnow, nullable=False, sa_column_kwargs={"onupdate": datetime.utcnow})

    # --- Relationships ---
    roles: List["StaffRole"] = Relationship(
        back_populates="staff",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )
    expertise: List["StaffExpertise"] = Relationship(
        back_populates="staff",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )
    work_logs: List["StaffWorkLog"] = Relationship(
        back_populates="staff",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )
    portfolios: List["StaffPortfolio"] = Relationship(
        back_populates="staff",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )
    
    # 접근성 자산 크레딧 관계 추가
    access_asset_credits: List["AccessAssetCredit"] = Relationship(
        back_populates="staff",
        sa_relationship_kwargs={"foreign_keys": "[AccessAssetCredit.staff_id]"}
    )

# --- Staff Schemas (Read/Create/Update) ---
class StaffReadBase(StaffBase):
    id: int
    created_at: datetime
    updated_at: datetime

# 상세 조회용 스키마 (관계 포함)
class StaffRead(StaffReadBase):
    roles: List[StaffRoleRead] = []
    expertise: List[StaffExpertiseRead] = []
    work_logs: List[StaffWorkLogRead] = []
    portfolios: List[StaffPortfolioRead] = []

# 목록 요약 조회용 스키마
class StaffSummary(SQLModel):
    id: int
    name: str
    skill_level: Optional[int] = None
    profile_image: Optional[str] = None
    gender: Optional[str] = None
    location: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    roles: List[str] = []  # role_type 문자열 리스트
    portfolios_count: int = 0
    work_logs_count: int = 0
    created_at: datetime

# 생성용 스키마 (관계 데이터 포함)
class StaffCreate(StaffBase):
    roles: Optional[List[StaffRoleCreate]] = []
    expertise: Optional[List[StaffExpertiseCreate]] = []

# 수정용 스키마 (관계 데이터 포함, Optional)
class StaffUpdate(StaffBase):
    name: Optional[str] = None
    gender: Optional[str] = None
    location: Optional[str] = None
    skill_level: Optional[int] = None
    profile_image: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    memo: Optional[str] = None
    roles: Optional[List[StaffRoleCreate]] = None
    expertise: Optional[List[StaffExpertiseCreate]] = None

# 이미지 업로드 응답 스키마
class ProfileImageResponse(SQLModel):
    profile_image: str
