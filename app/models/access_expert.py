# app/models/access_expert.py
from typing import List, Optional, Any
from sqlmodel import Field, Relationship, SQLModel
from datetime import datetime

# 순환 참조 방지를 위해 TYPE_CHECKING 사용
from typing import TYPE_CHECKING
if TYPE_CHECKING:
    from .representative_works import RepresentativeWork

# --- AccessExpertExpertise Model ---
class AccessExpertExpertiseBase(SQLModel):
    domain: str = Field(index=True)
    domain_other: Optional[str] = Field(default=None)
    grade: int
    access_expert_id: Optional[int] = Field(default=None, foreign_key="access_experts.id", index=True)

class AccessExpertExpertise(AccessExpertExpertiseBase, table=True):
    __tablename__ = "access_expert_expertise"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    
    # Relationship back to AccessExpert
    access_expert: Optional["AccessExpert"] = Relationship(back_populates="expertise")

# --- AccessExpert Model ---
class AccessExpertBase(SQLModel):
    name: str = Field(index=True)
    gender: Optional[str] = Field(default=None)
    location: Optional[str] = Field(default=None)
    level: Optional[int] = Field(default=None)
    profile_image: Optional[str] = Field(default=None)
    phone: Optional[str] = Field(default=None)
    email: Optional[str] = Field(default=None)
    memo: Optional[str] = Field(default=None)
    speciality1: Optional[str] = Field(default=None)
    speciality1_level: Optional[int] = Field(default=None)
    speciality1_memo: Optional[str] = Field(default=None)
    speciality2: Optional[str] = Field(default=None)
    speciality2_level: Optional[int] = Field(default=None)
    speciality2_memo: Optional[str] = Field(default=None)

class AccessExpert(AccessExpertBase, table=True):
    __tablename__ = "access_experts"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    updated_at: datetime = Field(default_factory=datetime.utcnow, nullable=False, sa_column_kwargs={"onupdate": datetime.utcnow})
    
    # --- Relationships ---
    expertise: List["AccessExpertExpertise"] = Relationship(
        back_populates="access_expert",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )
    
    # representative_works 관계 정의
    representative_works: List["RepresentativeWork"] = Relationship(
        sa_relationship_kwargs={
            "primaryjoin": "and_(foreign(RepresentativeWork.person_id) == AccessExpert.id, foreign(RepresentativeWork.person_type) == 'accessexpert')",
            "cascade": "all, delete-orphan",
            "order_by": "foreign(RepresentativeWork.sequence_number)"
        }
    )
