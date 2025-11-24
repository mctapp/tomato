# app/models/production_task.py
from sqlmodel import SQLModel, Field, Column, Relationship
from typing import Optional, List, TYPE_CHECKING, Dict
from datetime import datetime
from decimal import Decimal
from sqlalchemy import DateTime, CheckConstraint, DECIMAL, JSON
from sqlalchemy.sql import func

# 중앙화된 Enum import
from app.models.enums import (
    TaskStatus, StageNumber, QualityScore,
    get_enum_constraint_string, get_stage_name
)

if TYPE_CHECKING:
    from app.models.production_project import ProductionProject
    from app.models.access_asset_credit import AccessAssetCredit
    from app.models.users import User
    from app.models.worker_performance_records import WorkerPerformanceRecord
    from app.models.production_memo import ProductionMemo


class ProductionTask(SQLModel, table=True):
    __tablename__ = "production_tasks"
    __table_args__ = (
        # Enum 값을 사용한 체크 제약조건
        CheckConstraint(
            f"stage_number IN ({get_enum_constraint_string(StageNumber)})", 
            name="check_stage_number"
        ),
        CheckConstraint(
            f"task_status IN ({get_enum_constraint_string(TaskStatus)})", 
            name="check_task_status"
        ),
        CheckConstraint(
            f"quality_score IN ({get_enum_constraint_string(QualityScore)}) OR quality_score IS NULL", 
            name="check_quality_score"
        ),
        CheckConstraint(
            "rework_count >= 0", 
            name="check_rework_count_non_negative"
        ),
        CheckConstraint(
            "planned_hours >= 0 OR planned_hours IS NULL", 
            name="check_planned_hours_non_negative"
        ),
        CheckConstraint(
            "actual_hours >= 0 OR actual_hours IS NULL", 
            name="check_actual_hours_non_negative"
        ),
        CheckConstraint(
            "review_hours >= 0 OR review_hours IS NULL", 
            name="check_review_hours_non_negative"
        ),
        CheckConstraint(
            "monitoring_hours >= 0 OR monitoring_hours IS NULL", 
            name="check_monitoring_hours_non_negative"
        ),
        CheckConstraint(
            "task_order >= 0", 
            name="check_task_order_non_negative"
        ),
        {"extend_existing": True}
    )
    
    # ── 기본 키 ────────────────────────────────────────────────────────────
    id: Optional[int] = Field(default=None, primary_key=True)
    
    # ── FK ────────────────────────────────────────────────────────────────
    production_project_id: int = Field(
        foreign_key="production_projects.id", 
        index=True,
        description="소속 프로젝트 ID"
    )
    
    # ── 작업 기본 정보 ──────────────────────────────────────────────────────
    stage_number: int = Field(description="작업 단계 (1-4)")
    task_name: str = Field(max_length=100, min_length=1, description="작업명")
    task_order: int = Field(default=0, ge=0, description="작업 순서")
    
    # ── 작업 상태 ──────────────────────────────────────────────────────────
    task_status: str = Field(default=TaskStatus.PENDING.value, description="작업 상태")
    is_required: bool = Field(default=True, description="필수 작업 여부")
    
    # ── 담당자 정보 (기존 AccessAssetCredit 활용) ──────────────────────────────
    assigned_credit_id: Optional[int] = Field(
        default=None, 
        foreign_key="access_asset_credits.id",
        description="담당자 크레디트 ID"
    )
    
    # ── 시간 추적 (핵심!) - Decimal 타입으로 정밀도 보장 ──────────────────────────
    planned_start_date: Optional[datetime] = Field(default=None, description="계획된 시작일")
    actual_start_date: Optional[datetime] = Field(default=None, description="실제 시작일")
    planned_end_date: Optional[datetime] = Field(default=None, description="계획된 완료일")
    actual_end_date: Optional[datetime] = Field(default=None, description="실제 완료일")
    planned_hours: Optional[Decimal] = Field(
        default=None, 
        sa_column=Column(DECIMAL(6,2)), 
        ge=0,
        description="계획된 작업 시간"
    )
    actual_hours: Optional[Decimal] = Field(
        default=None, 
        sa_column=Column(DECIMAL(6,2)), 
        ge=0,
        description="실제 작업 시간"
    )
    
    # ── 감수/모니터링 특별 추적 ───────────────────────────────────────────────
    review_required: bool = Field(default=False, description="감수 필요 여부")
    reviewer_credit_id: Optional[int] = Field(
        default=None, 
        foreign_key="access_asset_credits.id",
        description="감수자 크레디트 ID"
    )
    review_start_date: Optional[datetime] = Field(default=None, description="감수 시작일")
    review_end_date: Optional[datetime] = Field(default=None, description="감수 완료일")
    review_hours: Optional[Decimal] = Field(
        default=None, 
        sa_column=Column(DECIMAL(6,2)), 
        ge=0,
        description="감수 소요 시간"
    )
    
    monitoring_required: bool = Field(default=False, description="모니터링 필요 여부")
    monitor_credit_id: Optional[int] = Field(
        default=None, 
        foreign_key="access_asset_credits.id",
        description="모니터링 담당자 크레디트 ID"
    )
    monitoring_start_date: Optional[datetime] = Field(default=None, description="모니터링 시작일")
    monitoring_end_date: Optional[datetime] = Field(default=None, description="모니터링 완료일")
    monitoring_hours: Optional[Decimal] = Field(
        default=None, 
        sa_column=Column(DECIMAL(6,2)), 
        ge=0,
        description="모니터링 소요 시간"
    )
    
    # ── 품질 및 성과 ────────────────────────────────────────────────────────
    quality_score: Optional[int] = Field(default=None, description="품질 점수 (1-5)")
    rework_count: int = Field(default=0, ge=0, description="재작업 횟수")
    efficiency_score: Optional[Decimal] = Field(
        default=None, 
        sa_column=Column(DECIMAL(5,2)), 
        ge=0,
        description="효율성 점수"
    )
    
    # ── 완료 정보 ──────────────────────────────────────────────────────────
    completion_notes: Optional[str] = Field(
        default=None, 
        max_length=1000,
        description="완료 메모"
    )
    completed_by: Optional[int] = Field(
        default=None, 
        foreign_key="users.id",
        description="완료 처리자 ID"
    )
    
    # ── 체크리스트 진행 상태 (1단계 작업용) ────────────────────────────────────
    checklist_progress: Optional[Dict[str, bool]] = Field(
        default=None,
        sa_column=Column(JSON),
        description="체크리스트 항목별 완료 상태"
    )
    
    # ── 타임스탬프 ────────────────────────────────────────────────────────
    created_at: Optional[datetime] = Field(
        default=None,
        sa_column=Column(
            DateTime(timezone=True),
            server_default=func.now(),
            nullable=False
        ),
        description="생성 시간"
    )
    updated_at: Optional[datetime] = Field(
        default=None,
        sa_column=Column(
            DateTime(timezone=True),
            server_default=func.now(),
            onupdate=func.now(),
            nullable=False
        ),
        description="수정 시간"
    )
    
    # ── 관계 설정 ──────────────────────────────────────────────────────────
    production_project: Optional["ProductionProject"] = Relationship(back_populates="tasks")
    
    assigned_credit: Optional["AccessAssetCredit"] = Relationship(
        sa_relationship_kwargs={
            "foreign_keys": "[ProductionTask.assigned_credit_id]",
            "lazy": "select"
        }
    )
    
    reviewer_credit: Optional["AccessAssetCredit"] = Relationship(
        sa_relationship_kwargs={
            "foreign_keys": "[ProductionTask.reviewer_credit_id]",
            "lazy": "select"
        }
    )
    
    monitor_credit: Optional["AccessAssetCredit"] = Relationship(
        sa_relationship_kwargs={
            "foreign_keys": "[ProductionTask.monitor_credit_id]",
            "lazy": "select"
        }
    )
    
    completed_by_user: Optional["User"] = Relationship(
        sa_relationship_kwargs={
            "foreign_keys": "[ProductionTask.completed_by]",
            "lazy": "select"
        }
    )
    
    # 메모 관계 추가
    memos: List["ProductionMemo"] = Relationship(
        back_populates="production_task",
        sa_relationship_kwargs={
            "cascade": "all, delete-orphan",
            "foreign_keys": "[ProductionMemo.production_task_id]"
        }
    )
    
    # 성과 기록 관계 (WorkerPerformanceRecord가 back_populates 정의 필요)
    performance_records: List["WorkerPerformanceRecord"] = Relationship(
        back_populates="production_task",
        sa_relationship_kwargs={
            "cascade": "all, delete-orphan",
            "foreign_keys": "[WorkerPerformanceRecord.production_task_id]"
        }
    )
    
    # ── 계산된 속성 ────────────────────────────────────────────────────────
    @property
    def stage_name(self) -> str:
        """단계 번호를 이름으로 변환"""
        return get_stage_name(self.stage_number)
    
    @property
    def status_display(self) -> str:
        """상태를 한국어로 표시"""
        status_display = {
            TaskStatus.PENDING.value: "대기",
            TaskStatus.IN_PROGRESS.value: "진행중",
            TaskStatus.COMPLETED.value: "완료",
            TaskStatus.BLOCKED.value: "차단됨"
        }
        return status_display.get(self.task_status, self.task_status)
    
    @property
    def quality_score_display(self) -> Optional[str]:
        """품질 점수를 한국어로 표시"""
        if self.quality_score is None:
            return None
        
        quality_display = {
            QualityScore.VERY_POOR.value: "매우 나쁨",
            QualityScore.POOR.value: "나쁨",
            QualityScore.AVERAGE.value: "보통",
            QualityScore.GOOD.value: "좋음",
            QualityScore.EXCELLENT.value: "매우 좋음"
        }
        return quality_display.get(self.quality_score, str(self.quality_score))
    
    # ── 유틸리티 메서드 ──────────────────────────────────────────────────────
    def update_timestamp(self) -> None:
        """updated_at을 수동으로 갱신"""
        self.updated_at = datetime.utcnow()
    
    def is_overdue(self) -> bool:
        """작업이 지연되었는지 확인"""
        if not self.planned_end_date:
            return False
        
        comparison_date = self.actual_end_date if self.actual_end_date else datetime.utcnow()
        return comparison_date > self.planned_end_date
    
    def get_duration_days(self) -> Optional[int]:
        """실제 작업 기간(일수) 계산"""
        if not (self.actual_start_date and self.actual_end_date):
            return None
        return (self.actual_end_date - self.actual_start_date).days
    
    def calculate_efficiency(self) -> Optional[Decimal]:
        """효율성 점수 계산 (planned_hours / actual_hours)"""
        if not (self.planned_hours and self.actual_hours and self.actual_hours > 0):
            return None
        
        efficiency = self.planned_hours / self.actual_hours
        self.efficiency_score = round(efficiency, 2)
        return self.efficiency_score
    
    def get_total_hours(self) -> Optional[Decimal]:
        """총 작업 시간 계산 (본 작업 + 감수 + 모니터링)"""
        total = Decimal(0)
        hours_added = False
        
        if self.actual_hours:
            total += self.actual_hours
            hours_added = True
            
        if self.review_hours:
            total += self.review_hours
            hours_added = True
            
        if self.monitoring_hours:
            total += self.monitoring_hours
            hours_added = True
            
        return total if hours_added else None
    
    def can_start(self) -> bool:
        """작업 시작 가능 여부 확인"""
        return self.task_status == TaskStatus.PENDING.value
    
    def can_complete(self) -> bool:
        """작업 완료 가능 여부 확인"""
        return self.task_status == TaskStatus.IN_PROGRESS.value
    
    def start_task(self, user_id: Optional[int] = None) -> bool:
        """작업 시작"""
        if not self.can_start():
            return False
        
        self.task_status = TaskStatus.IN_PROGRESS.value
        self.actual_start_date = datetime.utcnow()
        self.update_timestamp()
        return True
    
    def complete_task(self, user_id: Optional[int] = None, notes: Optional[str] = None) -> bool:
        """작업 완료"""
        if not self.can_complete():
            return False
        
        self.task_status = TaskStatus.COMPLETED.value
        self.actual_end_date = datetime.utcnow()
        if user_id:
            self.completed_by = user_id
        if notes:
            self.completion_notes = notes
        
        # 효율성 계산
        self.calculate_efficiency()
        self.update_timestamp()
        return True
    
    def block_task(self, reason: Optional[str] = None) -> bool:
        """작업 차단"""
        if self.task_status == TaskStatus.COMPLETED.value:
            return False
        
        self.task_status = TaskStatus.BLOCKED.value
        if reason:
            self.completion_notes = f"차단 사유: {reason}"
        self.update_timestamp()
        return True
    
    def unblock_task(self) -> bool:
        """작업 차단 해제"""
        if self.task_status != TaskStatus.BLOCKED.value:
            return False
        
        # 이전에 시작된 적이 있으면 IN_PROGRESS, 없으면 PENDING
        if self.actual_start_date:
            self.task_status = TaskStatus.IN_PROGRESS.value
        else:
            self.task_status = TaskStatus.PENDING.value
        
        self.update_timestamp()
        return True
    
    def to_dict(self) -> dict:
        """딕셔너리로 변환 (API 응답용)"""
        return {
            "id": self.id,
            "production_project_id": self.production_project_id,
            "stage_number": self.stage_number,
            "stage_name": self.stage_name,
            "task_name": self.task_name,
            "task_order": self.task_order,
            "task_status": self.task_status,
            "status_display": self.status_display,
            "is_required": self.is_required,
            "assigned_credit_id": self.assigned_credit_id,
            "planned_start_date": self.planned_start_date.isoformat() if self.planned_start_date else None,
            "actual_start_date": self.actual_start_date.isoformat() if self.actual_start_date else None,
            "planned_end_date": self.planned_end_date.isoformat() if self.planned_end_date else None,
            "actual_end_date": self.actual_end_date.isoformat() if self.actual_end_date else None,
            "planned_hours": float(self.planned_hours) if self.planned_hours else None,
            "actual_hours": float(self.actual_hours) if self.actual_hours else None,
            "review_required": self.review_required,
            "reviewer_credit_id": self.reviewer_credit_id,
            "review_start_date": self.review_start_date.isoformat() if self.review_start_date else None,
            "review_end_date": self.review_end_date.isoformat() if self.review_end_date else None,
            "review_hours": float(self.review_hours) if self.review_hours else None,
            "monitoring_required": self.monitoring_required,
            "monitor_credit_id": self.monitor_credit_id,
            "monitoring_start_date": self.monitoring_start_date.isoformat() if self.monitoring_start_date else None,
            "monitoring_end_date": self.monitoring_end_date.isoformat() if self.monitoring_end_date else None,
            "monitoring_hours": float(self.monitoring_hours) if self.monitoring_hours else None,
            "quality_score": self.quality_score,
            "quality_score_display": self.quality_score_display,
            "rework_count": self.rework_count,
            "efficiency_score": float(self.efficiency_score) if self.efficiency_score else None,
            "completion_notes": self.completion_notes,
            "completed_by": self.completed_by,
            "checklist_progress": self.checklist_progress,
            "total_hours": float(self.get_total_hours()) if self.get_total_hours() else None,
            "duration_days": self.get_duration_days(),
            "is_overdue": self.is_overdue(),
            "can_start": self.can_start(),
            "can_complete": self.can_complete(),
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
    
    def __repr__(self) -> str:
        return (
            f"<ProductionTask(id={self.id}, "
            f"stage={self.stage_number}, "
            f"task='{self.task_name}', "
            f"status='{self.task_status}')>"
        )


# ── 유틸리티 함수들 ──────────────────────────────────────────────────────────

def validate_task_status(status: str) -> bool:
    """작업 상태 유효성 검증"""
    try:
        TaskStatus(status)
        return True
    except ValueError:
        return False


def validate_stage_number(stage: int) -> bool:
    """단계 번호 유효성 검증"""
    try:
        StageNumber(stage)
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


def get_task_status_choices() -> list[dict]:
    """작업 상태 선택지 반환 (API용)"""
    return [
        {
            "value": ts.value,
            "label": ts.name,
            "display": {
                TaskStatus.PENDING.value: "대기",
                TaskStatus.IN_PROGRESS.value: "진행중",
                TaskStatus.COMPLETED.value: "완료",
                TaskStatus.BLOCKED.value: "차단됨"
            }.get(ts.value, ts.value)
        }
        for ts in TaskStatus
    ]


def get_quality_score_choices() -> list[dict]:
    """품질 점수 선택지 반환 (API용)"""
    return [
        {
            "value": qs.value,
            "label": qs.name,
            "display": {
                QualityScore.VERY_POOR.value: "매우 나쁨",
                QualityScore.POOR.value: "나쁨", 
                QualityScore.AVERAGE.value: "보통",
                QualityScore.GOOD.value: "좋음",
                QualityScore.EXCELLENT.value: "매우 좋음"
            }.get(qs.value, str(qs.value))
        }
        for qs in QualityScore
    ]
