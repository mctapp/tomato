# app/schemas/production_analytics.py
from typing import Optional, List, Any, Dict
from app.schemas.base import BaseSchema

# ── 작업자 성과 관련 스키마 ──────────────────────────────────────────

class WorkTypeAnalysis(BaseSchema):
    """작업 유형별 분석"""
    task_count: int
    total_hours: float
    average_efficiency: Optional[float] = None

class WorkerPerformanceSummaryResponse(BaseSchema):
    total_tasks: int = 0
    total_planned_hours: float = 0.0
    total_actual_hours: float = 0.0
    average_efficiency: Optional[float] = None
    average_quality: Optional[float] = None
    rework_count: int = 0
    rework_percentage: float = 0.0
    work_type_analysis: Dict[str, WorkTypeAnalysis] = {}
    period: Dict[str, Any] = {}

# ── 프로젝트 성과 관련 스키마 ──────────────────────────────────────────

class StageAnalysis(BaseSchema):
    """단계별 분석"""
    planned_hours: float
    actual_hours: float
    efficiency: Optional[float] = None
    tasks_count: int

class ProjectPerformanceSummaryResponse(BaseSchema):
    project_id: int
    total_planned_hours: float = 0.0
    total_actual_hours: float = 0.0
    overall_efficiency: Optional[float] = None
    average_quality: Optional[float] = None
    total_rework_hours: float = 0.0
    rework_percentage: float = 0.0
    stage_analysis: Dict[str, StageAnalysis] = {}
    participants_count: int = 0
    progress_percentage: float = 0.0

# ── 팀 성과 관련 스키마 ──────────────────────────────────────────

class RoleAnalysis(BaseSchema):
    """역할별 분석"""
    person_count: int
    total_hours: float
    average_efficiency: Optional[float] = None

class MediaTypeAnalysis(BaseSchema):
    """미디어 타입별 분석"""
    project_count: int
    total_hours: float
    average_efficiency: Optional[float] = None

class TeamPerformanceAnalyticsResponse(BaseSchema):
    total_hours: float = 0.0
    total_tasks: int = 0
    average_efficiency: Optional[float] = None
    role_analysis: Dict[str, RoleAnalysis] = {}
    media_type_analysis: Dict[str, MediaTypeAnalysis] = {}
    period: Dict[str, Any] = {}

# ── 아카이브 프로젝트 관련 스키마 ──────────────────────────────────────

class ArchiveProjectResponse(BaseSchema):
    """아카이브 프로젝트 응답"""
    id: int
    movie_title: str
    media_type: str
    asset_name: str
    work_speed_type: str
    completion_date: Optional[str] = None  # ISO 포맷 문자열로 반환
    total_days: int
    total_hours: Optional[float] = None
    overall_efficiency: Optional[float] = None
    average_quality: Optional[float] = None
    project_success_rating: Optional[int] = None

class PaginationInfo(BaseSchema):
    """페이지네이션 정보"""
    limit: int
    offset: int
    total: int
    has_next: bool
    has_prev: bool
    current_page: int
    total_pages: int

class ArchivePaginationResponse(BaseSchema):
    """아카이브 목록 페이지네이션 응답"""
    archives: List[ArchiveProjectResponse]
    pagination: PaginationInfo

# ── 아카이브 상세 관련 스키마 ──────────────────────────────────────

class ArchiveInfo(BaseSchema):
    """아카이브 기본 정보"""
    movie_title: str
    media_type: str
    asset_name: str
    work_speed_type: str
    start_date: str
    completion_date: str
    total_days: int
    total_hours: float

class ParticipantInfo(BaseSchema):
    """참여자 정보"""
    name: str
    role: str
    is_primary: bool = False

class ParticipantsInfo(BaseSchema):
    """프로젝트 참여자 정보"""
    producer: Optional[ParticipantInfo] = None
    main_writer: Optional[ParticipantInfo] = None
    reviewers: List[ParticipantInfo] = []
    monitors: List[ParticipantInfo] = []
    voice_artists: List[ParticipantInfo] = []
    sl_interpreters: List[ParticipantInfo] = []
    other_staff: List[ParticipantInfo] = []

class ArchiveDetailResponse(BaseSchema):
    """아카이브 상세 응답"""
    archive_info: ArchiveInfo
    participants: ParticipantsInfo
    stage_durations: Dict[str, int]
    duration_days: int
    efficiency_rating: str = "N/A"
    quality_rating: str = "N/A"

# ── 아카이브 분석 관련 스키마 ──────────────────────────────────────

class MediaTypeStats(BaseSchema):
    """미디어 타입별 통계"""
    count: int
    total_hours: float
    average_efficiency: Optional[float] = None
    average_quality: Optional[float] = None

class SpeedTypeStats(BaseSchema):
    """작업 속도별 통계"""
    count: int
    average_days: float
    average_efficiency: Optional[float] = None

class MonthlyTrend(BaseSchema):
    """월별 완료 추이"""
    month: str
    count: int
    total_hours: float

class ArchiveAnalyticsResponse(BaseSchema):
    total_projects: int = 0
    total_hours: float = 0.0
    average_duration_days: float = 0.0
    average_efficiency: Optional[float] = None
    average_quality: Optional[float] = None
    media_type_analysis: Dict[str, MediaTypeStats] = {}
    speed_type_analysis: Dict[str, SpeedTypeStats] = {}
    monthly_completion_trend: List[MonthlyTrend] = []
    period: Dict[str, Any] = {}

# ── 기간별 종합 대시보드 관련 스키마 ──────────────────────────────────

class SummaryStats(BaseSchema):
    """요약 통계"""
    total_movies: int
    total_assets: int
    total_work_hours: float
    average_hours_per_asset: float
    average_days_per_asset: float
    completion_rate: float

class ProductivityTrend(BaseSchema):
    """생산성 트렌드"""
    trend: str  # 'increasing' | 'stable' | 'decreasing'
    change_percentage: float

class BottleneckItem(BaseSchema):
    """병목 구간 항목"""
    stage: str
    stage_name: str
    frequency: float
    average_delay: float

class DailyProductivity(BaseSchema):
    """일별 생산성"""
    date: str
    completed_assets: int
    work_hours: float

class MediaTypeDistribution(BaseSchema):
    """미디어 타입별 분포"""
    type: str
    name: str
    count: int
    percentage: float
    average_hours: float

class EfficiencyBySpeed(BaseSchema):
    """작업 속도별 효율성"""
    speed_type: str
    speed_name: str
    count: int
    average_efficiency: float
    average_quality: float

class PeriodOverviewResponse(BaseSchema):
    """기간별 종합 대시보드 응답"""
    summary: SummaryStats
    productivity_trend: ProductivityTrend
    bottleneck_analysis: List[BottleneckItem]
    daily_productivity: List[DailyProductivity]
    media_type_distribution: List[MediaTypeDistribution]
    efficiency_by_speed: List[EfficiencyBySpeed]

# ── 비교 분석 관련 스키마 ──────────────────────────────────────────

class ComparisonOption(BaseSchema):
    """비교 옵션"""
    id: str
    name: str

class ComparisonOptionsResponse(BaseSchema):
    """비교 분석 옵션 응답"""
    producers: List[ComparisonOption]
    media_types: List[ComparisonOption]
    projects: List[ComparisonOption]

class ComparisonItem(BaseSchema):
    """비교 항목"""
    id: str
    name: str
    total_assets: int
    total_hours: float
    average_hours: float
    efficiency: float
    quality: float
    completion_rate: float

class ComparisonMetrics(BaseSchema):
    """비교 메트릭"""
    best_performer: str
    worst_performer: str
    average_improvement: float
    key_insights: List[str]

class ComparisonDataResponse(BaseSchema):
    """비교 분석 데이터 응답"""
    type: str
    items: List[ComparisonItem]
    metrics: ComparisonMetrics

# ── 기타 요청/응답 스키마 ──────────────────────────────────────────

class PerformanceRecordCreate(BaseSchema):
    quality_score: Optional[int] = None
    rework_required: bool = False
    rework_hours: float = 0.0
    supervisor_rating: Optional[int] = None
    collaboration_rating: Optional[int] = None
    punctuality_rating: Optional[int] = None
    feedback_notes: Optional[str] = None
    actual_hours: Optional[float] = None
    actual_completion: Optional[str] = None

class ArchiveCreateRequest(BaseSchema):
    total_cost: Optional[float] = None
    project_success_rating: Optional[int] = None
    lessons_learned: Optional[str] = None
    completion_notes: Optional[str] = None

class CompareArchivesRequest(BaseSchema):
    archive_ids: List[int]

    def __init__(self, **data):
        super().__init__(**data)
        if len(self.archive_ids) < 2:
            raise ValueError("최소 2개의 아카이브 ID가 필요합니다.")
        if len(self.archive_ids) > 10:
            raise ValueError("한 번에 최대 10개의 아카이브만 비교할 수 있습니다.")
