# app/models/enums.py
"""중앙화된 Enum 정의 모듈"""
from enum import Enum


# ── 미디어 타입 ─────────────────────────────────────────────────────────
class MediaType(str, Enum):
    """접근성 미디어 타입"""
    AD = "AD"  # Audio Description (음성해설)
    CC = "CC"  # Closed Caption (자막해설)
    SL = "SL"  # Sign Language (수어해설)
    AI = "AI"  # Audio Introduction (음성소개)
    CI = "CI"  # Caption Introduction (자막소개)
    SI = "SI"  # Sign language Introduction (수어소개)
    AR = "AR"  # Audio Review (음성리뷰)
    CR = "CR"  # Caption Review (자막리뷰)
    SR = "SR"  # Sign language Review (수어리뷰)


# ── 작업 속도 타입 ──────────────────────────────────────────────────────
class WorkSpeedType(str, Enum):
    """작업 속도 타입"""
    A = "A"  # 빠름
    B = "B"  # 보통
    C = "C"  # 여유


# ── 프로젝트 상태 ───────────────────────────────────────────────────────
class ProjectStatus(str, Enum):
    """프로젝트 상태"""
    ACTIVE = "active"
    COMPLETED = "completed"
    PAUSED = "paused"
    CANCELLED = "cancelled"
    ARCHIVED = "archived"  # 아카이브된 상태 추가


# ── 제작 상태 ────────────────────────────────────────────────────────────
class ProductionStatus(str, Enum):
    """접근성 미디어 제작 상태"""
    PLANNING = "planning"
    IN_PROGRESS = "in_progress" 
    COMPLETED = "completed"
    ON_HOLD = "on_hold"
    CANCELLED = "cancelled"


# ── 프로젝트 생성 트리거 ──────────────────────────────────────────────────
class CreationTrigger(str, Enum):
    """프로젝트 생성 트리거"""
    STATUS_CHANGE = "status_change"
    CREDITS_SUFFICIENT = "credits_sufficient"
    MANUAL = "manual"


# ── 단계 번호 ────────────────────────────────────────────────────────────
class StageNumber(int, Enum):
    """작업 단계"""
    PREPARATION = 1      # 자료 준비 및 섭외
    SCRIPT_WRITING = 2   # 해설대본 작성
    PRODUCTION = 3       # 녹음/편집
    DISTRIBUTION = 4     # 선재 제작/배포


# ── 작업 상태 ────────────────────────────────────────────────────────────
class TaskStatus(str, Enum):
    """작업 상태"""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    BLOCKED = "blocked"


# ── 품질 점수 ────────────────────────────────────────────────────────────
class QualityScore(int, Enum):
    """품질 점수"""
    VERY_POOR = 1
    POOR = 2
    AVERAGE = 3
    GOOD = 4
    EXCELLENT = 5


# ── 평가 점수 ────────────────────────────────────────────────────────────
class Rating(int, Enum):
    """평가 점수"""
    VERY_POOR = 1
    POOR = 2
    AVERAGE = 3
    GOOD = 4
    EXCELLENT = 5


# ── 프로젝트 성공 평가 ──────────────────────────────────────────────────
class ProjectSuccessRating(int, Enum):
    """프로젝트 성공 평가"""
    POOR = 1
    FAIR = 2
    GOOD = 3
    VERY_GOOD = 4
    EXCELLENT = 5


# ── 메모 타입 ────────────────────────────────────────────────────────────
class MemoType(str, Enum):
    """메모 타입"""
    GENERAL = "general"
    ISSUE = "issue"
    DECISION = "decision"
    REVIEW = "review"


# ── 우선순위 레벨 ───────────────────────────────────────────────────────
class PriorityLevel(int, Enum):
    """우선순위 레벨"""
    CRITICAL = 1    # 긴급
    HIGH = 2        # 높음
    MEDIUM = 3      # 보통
    LOW = 4         # 낮음
    MINIMAL = 5     # 최소


# ── 작업자 유형 ──────────────────────────────────────────────────────────
class PersonType(str, Enum):
    """작업자 유형"""
    SCRIPTWRITER = "scriptwriter"
    VOICE_ARTIST = "voice_artist"
    SL_INTERPRETER = "sl_interpreter"
    STAFF = "staff"


# ── 작업 유형 ────────────────────────────────────────────────────────────
class WorkType(str, Enum):
    """작업 유형"""
    MAIN = "main"
    REVIEW = "review"
    MONITORING = "monitoring"


# ── 헬퍼 함수 ────────────────────────────────────────────────────────────

def get_enum_constraint_string(enum_class: Enum) -> str:
    """Enum 클래스에서 CHECK 제약조건용 문자열 생성"""
    if issubclass(enum_class, str):
        return ', '.join([f"'{e.value}'" for e in enum_class])
    else:
        return ', '.join([str(e.value) for e in enum_class])


def get_media_type_name(media_type: str) -> str:
    """미디어 타입 한글명 반환"""
    names = {
        MediaType.AD: "음성해설",
        MediaType.CC: "자막해설",
        MediaType.SL: "수어해설",
        MediaType.AI: "음성소개",
        MediaType.CI: "자막소개",
        MediaType.SI: "수어소개",
        MediaType.AR: "음성리뷰",
        MediaType.CR: "자막리뷰",
        MediaType.SR: "수어리뷰"
    }
    try:
        return names.get(MediaType(media_type), media_type)
    except ValueError:
        return media_type


def get_work_speed_type_name(speed_type: str) -> str:
    """작업 속도 타입 한글명 반환"""
    names = {
        WorkSpeedType.A: "빠름",
        WorkSpeedType.B: "보통",
        WorkSpeedType.C: "여유"
    }
    try:
        return names.get(WorkSpeedType(speed_type), speed_type)
    except ValueError:
        return speed_type


def get_project_status_name(status: str) -> str:
    """프로젝트 상태 한글명 반환"""
    names = {
        ProjectStatus.ACTIVE: "진행중",
        ProjectStatus.COMPLETED: "완료",
        ProjectStatus.PAUSED: "일시정지",
        ProjectStatus.CANCELLED: "취소",
        ProjectStatus.ARCHIVED: "아카이브됨"
    }
    try:
        return names.get(ProjectStatus(status), status)
    except ValueError:
        return status


def get_stage_name(stage_number: int) -> str:
    """작업 단계 한글명 반환"""
    stage_names = {
        1: "자료 준비 및 섭외",
        2: "해설대본 작성",
        3: "녹음/편집",
        4: "선재 제작/배포"
    }
    return stage_names.get(stage_number, f"단계 {stage_number}")

def get_production_status_name(status: str) -> str:
    """제작 상태 한글명 반환"""
    names = {
        ProductionStatus.PLANNING: "기획중",
        ProductionStatus.IN_PROGRESS: "제작중",
        ProductionStatus.COMPLETED: "완료",
        ProductionStatus.ON_HOLD: "보류",
        ProductionStatus.CANCELLED: "취소"
    }
    try:
        return names.get(ProductionStatus(status), status)
    except ValueError:
        return status
