# app/models/worker_performance_records.py
from sqlmodel import SQLModel, Field, Column, Relationship
from typing import Optional, TYPE_CHECKING
from datetime import datetime
from decimal import Decimal
from sqlalchemy import DateTime, CheckConstraint, DECIMAL
from sqlalchemy.sql import func

# 중앙화된 Enum import
from app.models.enums import (
    PersonType, WorkType, QualityScore, Rating,
    get_enum_constraint_string
)

if TYPE_CHECKING:
    from app.models.production_task import ProductionTask
    from app.models.access_asset_credit import AccessAssetCredit


class WorkerPerformanceRecord(SQLModel, table=True):
    __tablename__ = "worker_performance_records"
    __table_args__ = (
        # Enum 값을 사용한 체크 제약조건
        CheckConstraint(
            f"person_type IN ({get_enum_constraint_string(PersonType)})", 
            name="check_person_type"
        ),
        CheckConstraint(
            f"work_type IN ({get_enum_constraint_string(WorkType)})", 
            name="check_work_type"
        ),
        CheckConstraint(
            f"quality_score IS NULL OR quality_score IN ({get_enum_constraint_string(QualityScore)})", 
            name="check_quality_score"
        ),
        CheckConstraint(
            f"supervisor_rating IS NULL OR supervisor_rating IN ({get_enum_constraint_string(Rating)})", 
            name="check_supervisor_rating"
        ),
        CheckConstraint(
            f"collaboration_rating IS NULL OR collaboration_rating IN ({get_enum_constraint_string(Rating)})", 
            name="check_collaboration_rating"
        ),
        CheckConstraint(
            f"punctuality_rating IS NULL OR punctuality_rating IN ({get_enum_constraint_string(Rating)})", 
            name="check_punctuality_rating"
        ),
        CheckConstraint(
            "efficiency_ratio IS NULL OR (efficiency_ratio >= 0)", 
            name="check_efficiency_ratio"
        ),
        CheckConstraint(
            "planned_hours >= 0 AND actual_hours >= 0 AND rework_hours >= 0", 
            name="check_positive_hours"
        ),
        {"extend_existing": True}
    )
    
    # ── 기본 키 ────────────────────────────────────────────────────────────
    id: Optional[int] = Field(default=None, primary_key=True)
    
    # ── FK ────────────────────────────────────────────────────────────────
    production_task_id: int = Field(foreign_key="production_tasks.id", index=True)
    credit_id: int = Field(foreign_key="access_asset_credits.id", index=True)
    
    # ── 작업자 정보 (Enum 사용) ──────────────────────────────────────────────
    person_type: str = Field(description="작업자 유형")
    role_name: str = Field(max_length=50, description="역할명 (예: 대본작가, 감수자, 프로듀서)")
    work_type: str = Field(description="작업 유형")
    
    # ── 시간 성과 (Decimal 타입으로 통일) ────────────────────────────────────
    planned_hours: Decimal = Field(
        sa_column=Column(DECIMAL(6,2)), 
        ge=0,
        description="계획된 작업 시간"
    )
    actual_hours: Decimal = Field(
        sa_column=Column(DECIMAL(6,2)), 
        ge=0,
        description="실제 작업 시간"
    )
    efficiency_ratio: Optional[Decimal] = Field(
        default=None, 
        sa_column=Column(DECIMAL(5,2)),
        ge=0,
        description="효율성 비율 (actual/planned)"
    )
    
    # ── 품질 성과 ──────────────────────────────────────────────────────────
    quality_score: Optional[int] = Field(default=None, description="품질 점수 (1-5)")
    rework_required: bool = Field(default=False, description="재작업 필요 여부")
    rework_hours: Decimal = Field(
        default=Decimal('0.00'), 
        sa_column=Column(DECIMAL(6,2)),
        ge=0,
        description="재작업 소요 시간"
    )
    
    # ── 일정 성과 ──────────────────────────────────────────────────────────
    planned_completion: Optional[datetime] = Field(default=None, description="계획된 완료일")
    actual_completion: Optional[datetime] = Field(default=None, description="실제 완료일")
    days_variance: Optional[int] = Field(default=None, description="계획 대비 일수 차이")
    
    # ── 평가 및 피드백 ──────────────────────────────────────────────────────
    supervisor_rating: Optional[int] = Field(default=None, description="관리자 평가 (1-5)")
    collaboration_rating: Optional[int] = Field(default=None, description="협업 평가 (1-5)")
    punctuality_rating: Optional[int] = Field(default=None, description="일정 준수 평가 (1-5)")
    feedback_notes: Optional[str] = Field(
        default=None, 
        max_length=2000, 
        description="피드백 메모"
    )
    
    # ── 타임스탬프 ────────────────────────────────────────────────────────
    recorded_at: datetime = Field(
        sa_column=Column(
            DateTime(timezone=True),
            server_default=func.now(),
            nullable=False
        ),
        description="기록 생성 시간"
    )
    
    # ── 관계 설정 ──────────────────────────────────────────────────────────
    production_task: Optional["ProductionTask"] = Relationship(
        back_populates="performance_records",
        sa_relationship_kwargs={
            "foreign_keys": "[WorkerPerformanceRecord.production_task_id]",
            "lazy": "select"  # 일관된 lazy loading
        }
    )
    
    credit: Optional["AccessAssetCredit"] = Relationship(
        sa_relationship_kwargs={
            "foreign_keys": "[WorkerPerformanceRecord.credit_id]",
            "lazy": "select"
        }
    )
    
    # ── 계산된 속성 ────────────────────────────────────────────────────────
    @property
    def efficiency_percentage(self) -> Optional[float]:
        """효율성을 백분율로 반환"""
        if self.efficiency_ratio is not None:
            return float(self.efficiency_ratio * 100)
        return None
    
    @property
    def total_hours(self) -> float:
        """총 작업 시간 (실제 + 재작업)"""
        return float(self.actual_hours + self.rework_hours)
    
    @property
    def is_on_schedule(self) -> Optional[bool]:
        """일정 준수 여부"""
        if self.days_variance is not None:
            return self.days_variance <= 0
        return None
    
    @property
    def overall_rating(self) -> Optional[float]:
        """전체 평가 점수 (품질, 관리자, 협업, 일정 준수 평균)"""
        ratings = []
        
        if self.quality_score is not None:
            ratings.append(self.quality_score)
        if self.supervisor_rating is not None:
            ratings.append(self.supervisor_rating)
        if self.collaboration_rating is not None:
            ratings.append(self.collaboration_rating)
        if self.punctuality_rating is not None:
            ratings.append(self.punctuality_rating)
        
        if ratings:
            return sum(ratings) / len(ratings)
        return None
    
    @property
    def person_type_display(self) -> str:
        """작업자 유형 한글 표시"""
        display_names = {
            PersonType.SCRIPTWRITER.value: "해설작가",
            PersonType.VOICE_ARTIST.value: "성우",
            PersonType.SL_INTERPRETER.value: "수어통역사",
            PersonType.STAFF.value: "스태프"
        }
        return display_names.get(self.person_type, self.person_type)
    
    @property
    def work_type_display(self) -> str:
        """작업 유형 한글 표시"""
        display_names = {
            WorkType.MAIN.value: "메인 작업",
            WorkType.REVIEW.value: "감수",
            WorkType.MONITORING.value: "모니터링"
        }
        return display_names.get(self.work_type, self.work_type)
    
    # ── 유틸리티 메서드 ────────────────────────────────────────────────────
    def calculate_efficiency_ratio(self) -> None:
        """효율성 비율 계산 및 업데이트"""
        if self.planned_hours and self.planned_hours > 0:
            self.efficiency_ratio = self.actual_hours / self.planned_hours
    
    def calculate_days_variance(self) -> None:
        """일정 차이 계산 및 업데이트"""
        if self.planned_completion and self.actual_completion:
            delta = self.actual_completion - self.planned_completion
            self.days_variance = delta.days
    
    def to_dict(self) -> dict:
        """딕셔너리로 변환 (API 응답용)"""
        return {
            "id": self.id,
            "production_task_id": self.production_task_id,
            "credit_id": self.credit_id,
            "person_type": self.person_type,
            "person_type_display": self.person_type_display,
            "role_name": self.role_name,
            "work_type": self.work_type,
            "work_type_display": self.work_type_display,
            "planned_hours": float(self.planned_hours),
            "actual_hours": float(self.actual_hours),
            "efficiency_ratio": float(self.efficiency_ratio) if self.efficiency_ratio else None,
            "efficiency_percentage": self.efficiency_percentage,
            "quality_score": self.quality_score,
            "rework_required": self.rework_required,
            "rework_hours": float(self.rework_hours),
            "total_hours": self.total_hours,
            "planned_completion": self.planned_completion.isoformat() if self.planned_completion else None,
            "actual_completion": self.actual_completion.isoformat() if self.actual_completion else None,
            "days_variance": self.days_variance,
            "is_on_schedule": self.is_on_schedule,
            "supervisor_rating": self.supervisor_rating,
            "collaboration_rating": self.collaboration_rating,
            "punctuality_rating": self.punctuality_rating,
            "overall_rating": self.overall_rating,
            "feedback_notes": self.feedback_notes,
            "recorded_at": self.recorded_at.isoformat() if self.recorded_at else None
        }
    
    def __repr__(self) -> str:
        return (
            f"<WorkerPerformanceRecord(id={self.id}, "
            f"person_type={self.person_type}, "
            f"work_type={self.work_type}, "
            f"efficiency={self.efficiency_percentage}%)>"
        )


# ── 유틸리티 함수들 ──────────────────────────────────────────────────────────

def validate_person_type(person_type: str) -> bool:
    """작업자 유형 유효성 검증"""
    try:
        PersonType(person_type)
        return True
    except ValueError:
        return False


def validate_work_type(work_type: str) -> bool:
    """작업 유형 유효성 검증"""
    try:
        WorkType(work_type)
        return True
    except ValueError:
        return False


def validate_quality_score(score: Optional[int]) -> bool:
    """품질 점수 유효성 검증"""
    if score is None:
        return True
    try:
        QualityScore(score)
        return True
    except ValueError:
        return False


def validate_rating(rating: Optional[int]) -> bool:
    """평가 점수 유효성 검증"""
    if rating is None:
        return True
    try:
        Rating(rating)
        return True
    except ValueError:
        return False


def get_person_type_choices() -> list[dict]:
    """작업자 유형 선택지 반환 (API용)"""
    return [
        {"value": pt.value, "label": pt.name, "display": 
         {PersonType.SCRIPTWRITER.value: "해설작가", 
          PersonType.VOICE_ARTIST.value: "성우", 
          PersonType.SL_INTERPRETER.value: "수어통역사", 
          PersonType.STAFF.value: "스태프"}.get(pt.value, pt.value)}
        for pt in PersonType
    ]


def get_work_type_choices() -> list[dict]:
    """작업 유형 선택지 반환 (API용)"""
    return [
        {"value": wt.value, "label": wt.name, "display": 
         {WorkType.MAIN.value: "메인 작업", 
          WorkType.REVIEW.value: "감수", 
          WorkType.MONITORING.value: "모니터링"}.get(wt.value, wt.value)}
        for wt in WorkType
    ]
