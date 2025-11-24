# app/schemas/production_management.py
from typing import List, Optional, Dict, Any
from datetime import date, datetime
from decimal import Decimal
from pydantic import Field, field_validator
from app.schemas.base import BaseSchema

# 중앙화된 Enum import
from app.models.enums import (
    MediaType, WorkSpeedType, ProjectStatus, TaskStatus,
    StageNumber, QualityScore, Rating, MemoType, PriorityLevel,
    PersonType, WorkType, CreationTrigger, ProjectSuccessRating
)

# ── 기본 스키마 ──────────────────────────────────────────────────────────

class StaffInfo(BaseSchema):
    """스태프 정보"""
    name: str
    role: str
    is_primary: bool = False

class ProjectStaffInfo(BaseSchema):
    """프로젝트 참여 스태프 정보"""
    main_writer: Optional[StaffInfo] = None
    producer: Optional[StaffInfo] = None
    reviewers: List[StaffInfo] = Field(default_factory=list)
    monitors: List[StaffInfo] = Field(default_factory=list)
    voice_artists: List[StaffInfo] = Field(default_factory=list)
    other_staff: List[StaffInfo] = Field(default_factory=list)

# ── Production Project 스키마 ─────────────────────────────────────────

class ProductionProjectBase(BaseSchema):
    """프로덕션 프로젝트 기본 스키마"""
    access_asset_id: int
    work_speed_type: str = WorkSpeedType.B.value
    project_status: str = ProjectStatus.ACTIVE.value
    priority_order: int = 0
    start_date: date
    estimated_completion_date: Optional[date] = None
    
    @field_validator('work_speed_type')
    def validate_work_speed_type(cls, v):
        try:
            WorkSpeedType(v)
            return v
        except ValueError:
            raise ValueError(f'Invalid work speed type: {v}')
    
    @field_validator('project_status')
    def validate_project_status(cls, v):
        try:
            ProjectStatus(v)
            return v
        except ValueError:
            raise ValueError(f'Invalid project status: {v}')

class ProductionProjectCreate(ProductionProjectBase):
    """프로덕션 프로젝트 생성 스키마"""
    pass

class ProductionProjectUpdate(BaseSchema):
    """프로덕션 프로젝트 수정 스키마"""
    work_speed_type: Optional[str] = None
    project_status: Optional[str] = None
    priority_order: Optional[int] = None
    estimated_completion_date: Optional[date] = None
    actual_completion_date: Optional[date] = None

class ProductionProjectResponse(ProductionProjectBase):
    """프로덕션 프로젝트 응답 스키마"""
    id: int
    current_stage: int
    progress_percentage: float
    actual_completion_date: Optional[date] = None
    auto_created: bool
    credits_count: int
    creation_trigger: Optional[str] = None
    created_at: datetime
    updated_at: datetime

# ── Production Task 스키마 ────────────────────────────────────────────

class ProductionTaskBase(BaseSchema):
    """프로덕션 작업 기본 스키마"""
    task_name: str
    task_order: int = 0
    task_status: str = TaskStatus.PENDING.value
    is_required: bool = True
    
    @field_validator('task_status')
    def validate_task_status(cls, v):
        try:
            TaskStatus(v)
            return v
        except ValueError:
            raise ValueError(f'Invalid task status: {v}')

class ProductionTaskCreate(ProductionTaskBase):
    """프로덕션 작업 생성 스키마"""
    production_project_id: int
    stage_number: int
    assigned_credit_id: Optional[int] = None
    planned_start_date: Optional[datetime] = None
    planned_end_date: Optional[datetime] = None
    planned_hours: Optional[float] = None
    
    @field_validator('stage_number')
    def validate_stage_number(cls, v):
        try:
            StageNumber(v)
            return v
        except ValueError:
            raise ValueError('Stage number must be between 1 and 4')

class ProductionTaskUpdate(BaseSchema):
    """프로덕션 작업 수정 스키마"""
    task_name: Optional[str] = None
    task_status: Optional[str] = None
    assigned_credit_id: Optional[int] = None
    actual_start_date: Optional[datetime] = None
    actual_end_date: Optional[datetime] = None
    actual_hours: Optional[float] = None
    quality_score: Optional[int] = Field(default=None, ge=1, le=5)
    completion_notes: Optional[str] = None

class ProductionTaskResponse(ProductionTaskBase):
    """프로덕션 작업 응답 스키마"""
    id: int
    production_project_id: int
    stage_number: int
    assigned_credit_id: Optional[int] = None
    planned_start_date: Optional[datetime] = None
    actual_start_date: Optional[datetime] = None
    planned_end_date: Optional[datetime] = None
    actual_end_date: Optional[datetime] = None
    planned_hours: Optional[float] = None
    actual_hours: Optional[float] = None
    review_required: bool = False
    reviewer_credit_id: Optional[int] = None
    review_hours: Optional[float] = None
    monitoring_required: bool = False
    monitor_credit_id: Optional[int] = None
    monitoring_hours: Optional[float] = None
    quality_score: Optional[int] = None
    rework_count: int = 0
    efficiency_score: Optional[float] = None
    completion_notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

# ── Production Template 스키마 ────────────────────────────────────────

class ProductionTemplateBase(BaseSchema):
    """프로덕션 템플릿 기본 스키마"""
    media_type: str
    stage_number: int
    task_name: str
    task_order: int
    speed_a_hours: float
    speed_b_hours: float
    speed_c_hours: float
    requires_review: bool = False
    review_hours_a: float = 0.0
    review_hours_b: float = 0.0
    review_hours_c: float = 0.0
    requires_monitoring: bool = False
    monitoring_hours_a: float = 0.0
    monitoring_hours_b: float = 0.0
    monitoring_hours_c: float = 0.0
    is_required: bool = True
    is_parallel: bool = False
    
    @field_validator('media_type')
    def validate_media_type(cls, v):
        try:
            MediaType(v)
            return v
        except ValueError:
            raise ValueError(f'Invalid media type: {v}')
    
    @field_validator('stage_number')
    def validate_stage_number(cls, v):
        try:
            StageNumber(v)
            return v
        except ValueError:
            raise ValueError('Stage number must be between 1 and 4')

class ProductionTemplateCreate(ProductionTemplateBase):
    """프로덕션 템플릿 생성 스키마"""
    quality_checklist: Optional[List[Dict[str, Any]]] = None
    acceptance_criteria: Optional[str] = None
    prerequisite_tasks: Optional[List[str]] = None

class ProductionTemplateUpdate(BaseSchema):
    """프로덕션 템플릿 수정 스키마"""
    task_name: Optional[str] = None
    task_order: Optional[int] = None
    speed_a_hours: Optional[float] = None
    speed_b_hours: Optional[float] = None
    speed_c_hours: Optional[float] = None
    requires_review: Optional[bool] = None
    review_hours_a: Optional[float] = None
    review_hours_b: Optional[float] = None
    review_hours_c: Optional[float] = None
    requires_monitoring: Optional[bool] = None
    monitoring_hours_a: Optional[float] = None
    monitoring_hours_b: Optional[float] = None
    monitoring_hours_c: Optional[float] = None
    is_required: Optional[bool] = None
    is_parallel: Optional[bool] = None
    quality_checklist: Optional[List[Dict[str, Any]]] = None
    acceptance_criteria: Optional[str] = None
    prerequisite_tasks: Optional[List[str]] = None

class ProductionTemplateResponse(ProductionTemplateBase):
    """프로덕션 템플릿 응답 스키마"""
    id: int
    is_active: bool
    quality_checklist: Optional[List[Dict[str, Any]]] = None
    acceptance_criteria: Optional[str] = None
    prerequisite_tasks: Optional[List[str]] = None
    created_at: datetime
    updated_at: datetime

# ── Production Memo 스키마 ────────────────────────────────────────────

class ProductionMemoBase(BaseSchema):
    """프로덕션 메모 기본 스키마"""
    memo_content: str
    memo_type: str = MemoType.GENERAL.value
    priority_level: int = Field(default=PriorityLevel.MEDIUM.value, ge=1, le=5)
    tags: Optional[str] = None
    is_pinned: bool = False

class ProductionMemoCreate(ProductionMemoBase):
    """프로덕션 메모 생성 스키마"""
    production_project_id: int
    production_task_id: Optional[int] = None

class ProductionMemoUpdate(BaseSchema):
    """프로덕션 메모 수정 스키마"""
    memo_content: Optional[str] = None
    memo_type: Optional[str] = None
    priority_level: Optional[int] = Field(default=None, ge=1, le=5)
    tags: Optional[str] = None
    is_pinned: Optional[bool] = None

class ProductionMemoResponse(ProductionMemoBase):
    """프로덕션 메모 응답 스키마"""
    id: int
    production_project_id: int
    production_task_id: Optional[int] = None
    created_by: int
    created_at: datetime
    updated_by: Optional[int] = None
    updated_at: datetime
    is_active: bool

# ── 칸반보드 전용 스키마 ──────────────────────────────────────────────

class ChecklistItem(BaseSchema):
    """체크리스트 항목"""
    id: int
    item: str
    required: bool
    checked: bool

class ProductionCardData(BaseSchema):
    """칸반보드 카드 데이터"""
    id: int
    movie_title: str
    movie_poster: Optional[str] = None
    media_type: str
    media_type_name: str
    asset_name: str
    work_speed_type: str
    current_stage: int
    progress_percentage: float
    staff_info: ProjectStaffInfo
    days_remaining: int
    is_overdue: bool
    memo_count: int
    start_date: date
    estimated_completion_date: Optional[date] = None
    project_status: str
    
    # 1단계 체크리스트 관련 필드
    task_id: Optional[int] = None
    checklist_items: Optional[List[ChecklistItem]] = None
    checklist_progress: Optional[Dict[str, bool]] = None
    
    # Pin 상태 필드
    is_pinned: bool = False

class KanbanStageData(BaseSchema):
    """칸반 단계 데이터"""
    stage_number: int
    stage_name: str
    cards: List[ProductionCardData]

class KanbanResponse(BaseSchema):
    """칸반보드 전체 응답"""
    stages: List[KanbanStageData]
    total_projects: int

class MoveCardRequest(BaseSchema):
    """카드 이동 요청"""
    project_id: int
    target_stage: int
    
    @field_validator('target_stage')
    def validate_target_stage(cls, v):
        try:
            StageNumber(v)
            return v
        except ValueError:
            raise ValueError('Target stage must be between 1 and 4')

class MoveCardResponse(BaseSchema):
    """카드 이동 응답"""
    message: str
    project_id: int
    old_stage: int
    new_stage: int
    progress_percentage: float
    project_status: str

# ── Pin 토글 요청 스키마 ──────────────────────────────────────────────

class PinToggleRequest(BaseSchema):
    """Pin 상태 토글 요청"""
    project_id: int
    is_pinned: bool

# ── 필터 및 통계 스키마 ───────────────────────────────────────────────

class FilterOption(BaseSchema):
    """필터 옵션"""
    value: str
    label: str

class FiltersResponse(BaseSchema):
    """필터 옵션 응답"""
    media_types: List[FilterOption]
    speed_types: List[FilterOption]
    project_statuses: List[FilterOption]

class MediaTypeStats(BaseSchema):
    """미디어 타입별 통계"""
    count: int
    name: str

class StatisticsResponse(BaseSchema):
    """칸반보드 통계 응답"""
    stage_counts: Dict[str, int]
    overdue_count: int
    total_active: int
    media_type_distribution: Dict[str, MediaTypeStats]

# ── 템플릿 관련 추가 스키마 ─────────────────────────────────────────

class MediaTypeInfo(BaseSchema):
    """미디어 타입 정보"""
    media_type: str
    media_type_name: str

class MediaTypeTemplatesResponse(BaseSchema):
    """미디어 타입별 템플릿 응답"""
    media_type: str
    media_type_name: str
    stages: Dict[int, List[ProductionTemplateResponse]]

class StageBreakdown(BaseSchema):
    """단계별 시간 분석"""
    stageName: str
    mainHours: float
    reviewHours: float
    monitoringHours: float
    totalHours: float

class HoursEstimationResponse(BaseSchema):
    """예상 소요 시간 응답"""
    media_type: str
    media_type_name: str
    work_speed_type: str
    total_main_hours: float
    total_review_hours: float
    total_monitoring_hours: float
    total_hours: float
    estimated_days: float
    stage_breakdown: Dict[str, StageBreakdown]

# ── 아카이브 스키마 ───────────────────────────────────────────────────

class ProductionArchiveResponse(BaseSchema):
    """완료된 프로젝트 아카이브 응답"""
    id: int
    original_project_id: int
    access_asset_id: int
    movie_title: str
    media_type: str
    asset_name: str
    work_speed_type: str
    start_date: date
    completion_date: date
    total_days: int
    total_hours: Optional[float] = None
    participants: Dict[str, Any]
    overall_efficiency: Optional[float] = None
    average_quality: Optional[float] = None
    total_cost: Optional[float] = None
    rework_percentage: Optional[float] = None
    stage_durations: Optional[Dict[str, int]] = None
    project_success_rating: Optional[int] = None
    lessons_learned: Optional[str] = None
    completion_notes: Optional[str] = None
    archived_at: datetime
    archived_by: int

# ── 성과 분석 스키마 ──────────────────────────────────────────────────

class WorkerPerformanceRecord(BaseSchema):
    """작업자 성과 기록"""
    id: int
    production_task_id: int
    credit_id: int
    person_type: str
    role_name: str
    work_type: str
    planned_hours: float
    actual_hours: float
    efficiency_ratio: float
    quality_score: Optional[int] = None
    rework_required: bool
    rework_hours: float
    planned_completion: datetime
    actual_completion: datetime
    days_variance: int
    supervisor_rating: Optional[int] = None
    collaboration_rating: Optional[int] = None
    punctuality_rating: Optional[int] = None
    feedback_notes: Optional[str] = None
    recorded_at: datetime

class WorkerPerformanceSummary(BaseSchema):
    """작업자 성과 요약"""
    credit_id: int
    person_name: str
    person_type: str
    total_projects: int
    total_hours: float
    average_efficiency: float
    average_quality: float
    on_time_delivery_rate: float
    rework_rate: float

# ── 업데이트 요청 스키마 ──────────────────────────────────────────────

class UpdateProgressRequest(BaseSchema):
    """진행률 업데이트 요청"""
    project_id: int = Field(alias="projectId")
    progress_percentage: float = Field(alias="progressPercentage", ge=0, le=100)
    
    class Config:
        populate_by_name = True
