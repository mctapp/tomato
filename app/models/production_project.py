# app/models/production_project.py
from sqlmodel import SQLModel, Field, Column, Relationship
from typing import Optional, List, TYPE_CHECKING
from datetime import date, datetime
from sqlalchemy import DateTime, CheckConstraint, DECIMAL
from sqlalchemy.sql import func

# 중앙화된 Enum import
from app.models.enums import (
    ProjectStatus, WorkSpeedType, CreationTrigger, StageNumber,
    get_enum_constraint_string, get_stage_name
)

if TYPE_CHECKING:
    from app.models.access_asset import AccessAsset
    from app.models.production_task import ProductionTask
    from app.models.production_memo import ProductionMemo


class ProductionProject(SQLModel, table=True):
    __tablename__ = "production_projects"
    __table_args__ = (
        # Enum 값을 사용한 체크 제약조건
        CheckConstraint(
            f"work_speed_type IN ({get_enum_constraint_string(WorkSpeedType)})", 
            name="check_work_speed_type"
        ),
        CheckConstraint(
            f"project_status IN ({get_enum_constraint_string(ProjectStatus)})", 
            name="check_project_status"
        ),
        CheckConstraint(
            f"current_stage IN ({get_enum_constraint_string(StageNumber)})", 
            name="check_current_stage"
        ),
        CheckConstraint(
            "progress_percentage BETWEEN 0.0 AND 100.0", 
            name="check_progress_percentage"
        ),
        CheckConstraint(
            "credits_count >= 0", 
            name="check_credits_count"
        ),
        CheckConstraint(
            "priority_order >= 0", 
            name="check_priority_order"
        ),
        {"extend_existing": True}
    )
    
    # ── 기본 키 ────────────────────────────────────────────────────────────
    id: Optional[int] = Field(default=None, primary_key=True)
    
    # ── FK (기존 AccessAsset과 1:1 관계) ────────────────────────────────────
    access_asset_id: int = Field(
        foreign_key="access_assets.id", 
        unique=True, 
        index=True,
        description="접근성 자산 ID (1:1 관계)"
    )
    
    # ── 자동 생성 조건 추적 ──────────────────────────────────────────────────
    auto_created: bool = Field(default=True, description="자동 생성 여부")
    credits_count: int = Field(default=0, ge=0, description="생성 시점 크레디트 수")
    creation_trigger: Optional[str] = Field(default=None, description="생성 트리거")
    
    # ── 프로젝트 상태 (Enum으로 통일) ─────────────────────────────────────────
    current_stage: int = Field(default=StageNumber.PREPARATION.value, description="현재 단계 (1-4)")
    project_status: str = Field(default=ProjectStatus.ACTIVE.value, description="프로젝트 상태")
    progress_percentage: float = Field(
        default=0.0, 
        ge=0.0, 
        le=100.0, 
        sa_column=Column(DECIMAL(5,2)),
        description="진행률 (%)"
    )
    
    # ── 일정 정보 ──────────────────────────────────────────────────────────
    start_date: Optional[date] = Field(default=None, description="시작일")
    estimated_completion_date: Optional[date] = Field(default=None, description="예상 완료일")
    actual_completion_date: Optional[date] = Field(default=None, description="실제 완료일")
    
    # ── 작업 속도 유형 (A/B/C) ─────────────────────────────────────────────
    work_speed_type: str = Field(default=WorkSpeedType.B.value, description="작업 속도 유형")
    
    # ── 우선순위 및 정렬 ────────────────────────────────────────────────────
    priority_order: int = Field(default=0, ge=0, description="우선순위 순서")
    
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
            nullable=False
        ),
        description="수정 시간"
    )

    # 콤팩트 
    is_pinned: bool = Field(default=False, description="Pin 상태")
    
    # ── 관계 설정 ──────────────────────────────────────────────────────────
    access_asset: Optional["AccessAsset"] = Relationship(
        sa_relationship_kwargs={
            "foreign_keys": "[ProductionProject.access_asset_id]",
            "lazy": "joined"
        }
    )
    
    tasks: List["ProductionTask"] = Relationship(
        back_populates="production_project",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )
    
    memos: List["ProductionMemo"] = Relationship(
        back_populates="production_project",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )
    
    # ── 계산된 속성 ────────────────────────────────────────────────────────
    @property
    def current_stage_display(self) -> str:
        """현재 단계를 한글로 표시"""
        return get_stage_name(self.current_stage)
    
    @property
    def project_status_display(self) -> str:
        """프로젝트 상태를 한글로 표시"""
        status_labels = {
            ProjectStatus.ACTIVE.value: "진행중",
            ProjectStatus.COMPLETED.value: "완료",
            ProjectStatus.PAUSED.value: "일시정지",
            ProjectStatus.CANCELLED.value: "취소"
        }
        return status_labels.get(self.project_status, self.project_status)
    
    @property
    def work_speed_type_display(self) -> str:
        """작업 속도 유형을 한글로 표시"""
        speed_labels = {
            WorkSpeedType.A.value: "빠름",
            WorkSpeedType.B.value: "보통", 
            WorkSpeedType.C.value: "여유"
        }
        return speed_labels.get(self.work_speed_type, self.work_speed_type)
    
    @property
    def creation_trigger_display(self) -> str:
        """생성 트리거를 한글로 표시"""
        trigger_labels = {
            CreationTrigger.STATUS_CHANGE.value: "상태 변경",
            CreationTrigger.CREDITS_SUFFICIENT.value: "크레디트 충족",
            CreationTrigger.MANUAL.value: "수동 생성"
        }
        return trigger_labels.get(self.creation_trigger, "알 수 없음") if self.creation_trigger else "알 수 없음"
    
    # ── 유틸리티 메서드 ────────────────────────────────────────────────────
    def update_timestamp(self) -> None:
        """updated_at을 현재 시간으로 수동 갱신"""
        self.updated_at = datetime.utcnow()
    
    def is_overdue(self) -> bool:
        """예상 완료일 기준 지연 여부 확인"""
        if not self.estimated_completion_date:
            return False
        return (
            date.today() > self.estimated_completion_date and 
            self.project_status == ProjectStatus.ACTIVE.value
        )
    
    def calculate_days_remaining(self) -> Optional[int]:
        """남은 일수 계산 (음수면 지연)"""
        if not self.estimated_completion_date:
            return None
        delta = self.estimated_completion_date - date.today()
        return delta.days
    
    def advance_to_next_stage(self) -> bool:
        """다음 단계로 진행 (가능한 경우)"""
        if self.current_stage == StageNumber.DISTRIBUTION.value:
            return False  # 이미 마지막 단계
        
        next_stage_value = self.current_stage + 1
        
        # StageNumber Enum에서 다음 단계 찾기
        for stage in StageNumber:
            if stage.value == next_stage_value:
                self.current_stage = stage.value
                self.update_timestamp()
                return True
        
        return False
    
    def can_complete(self) -> bool:
        """완료 가능 여부 확인"""
        return (
            self.current_stage == StageNumber.DISTRIBUTION.value and 
            self.project_status == ProjectStatus.ACTIVE.value
        )
    
    def mark_completed(self) -> bool:
        """프로젝트 완료 처리"""
        if not self.can_complete():
            return False
        
        self.project_status = ProjectStatus.COMPLETED.value
        self.actual_completion_date = date.today()
        self.progress_percentage = 100.0
        self.update_timestamp()
        return True
    
    def to_dict(self) -> dict:
        """딕셔너리로 변환 (API 응답용)"""
        return {
            "id": self.id,
            "access_asset_id": self.access_asset_id,
            "auto_created": self.auto_created,
            "credits_count": self.credits_count,
            "creation_trigger": self.creation_trigger,
            "current_stage": self.current_stage,
            "current_stage_display": self.current_stage_display,
            "project_status": self.project_status,
            "project_status_display": self.project_status_display,
            "progress_percentage": float(self.progress_percentage),
            "start_date": self.start_date.isoformat() if self.start_date else None,
            "estimated_completion_date": self.estimated_completion_date.isoformat() if self.estimated_completion_date else None,
            "actual_completion_date": self.actual_completion_date.isoformat() if self.actual_completion_date else None,
            "work_speed_type": self.work_speed_type,
            "work_speed_type_display": self.work_speed_type_display,
            "priority_order": self.priority_order,
            "is_overdue": self.is_overdue(),
            "days_remaining": self.calculate_days_remaining(),
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
    
    def __repr__(self) -> str:
        return (
            f"<ProductionProject(id={self.id}, "
            f"stage={self.current_stage}, "
            f"status={self.project_status}, "
            f"speed={self.work_speed_type})>"
        )


# ── 유틸리티 함수들 ──────────────────────────────────────────────────────────

def validate_project_status(status: str) -> bool:
    """프로젝트 상태 유효성 검증"""
    try:
        ProjectStatus(status)
        return True
    except ValueError:
        return False


def validate_work_speed_type(speed_type: str) -> bool:
    """작업 속도 유형 유효성 검증"""
    try:
        WorkSpeedType(speed_type)
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


def validate_creation_trigger(trigger: str) -> bool:
    """생성 트리거 유효성 검증"""
    try:
        CreationTrigger(trigger)
        return True
    except ValueError:
        return False


def get_project_status_choices() -> list[dict]:
    """프로젝트 상태 선택지 반환 (API용)"""
    return [
        {
            "value": ps.value, 
            "label": ps.name, 
            "display": {
                ProjectStatus.ACTIVE.value: "진행중",
                ProjectStatus.COMPLETED.value: "완료",
                ProjectStatus.PAUSED.value: "일시정지",
                ProjectStatus.CANCELLED.value: "취소"
            }.get(ps.value, ps.value)
        }
        for ps in ProjectStatus
    ]


def get_work_speed_type_choices() -> list[dict]:
    """작업 속도 유형 선택지 반환 (API용)"""
    return [
        {
            "value": wst.value, 
            "label": wst.name, 
            "display": {
                WorkSpeedType.A.value: "빠름",
                WorkSpeedType.B.value: "보통",
                WorkSpeedType.C.value: "여유"
            }.get(wst.value, wst.value)
        }
        for wst in WorkSpeedType
    ]


def get_stage_choices() -> list[dict]:
    """단계 선택지 반환 (API용)"""
    return [
        {
            "value": sn.value, 
            "label": sn.name, 
            "display": get_stage_name(sn.value)
        }
        for sn in StageNumber
    ]
