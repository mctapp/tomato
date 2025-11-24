# app/routes/admin_production_kanban.py
from fastapi import APIRouter, Depends, HTTPException, status, Path
from sqlmodel import Session, select, func, and_, or_
from sqlalchemy.orm import selectinload, joinedload
from typing import List, Dict, Optional, Tuple, Any
from datetime import date, datetime, timedelta
import logging
from decimal import Decimal

from app.dependencies.auth import get_editor_user
from app.models.users import User
from app.models.production_project import ProductionProject
from app.models.production_task import ProductionTask
from app.models.production_memo import ProductionMemo
from app.models.production_template import ProductionTemplate
from app.models.access_asset import AccessAsset
from app.models.access_asset_credit import AccessAssetCredit
from app.models.movies import Movie
from app.models.file_assets import FileAsset
from app.models.production_archives import ProductionArchive
from app.services.production_automation_service import ProductionAutomationService
from app.db import get_session

# 중앙화된 Enum import
from app.models.enums import (
    MediaType, WorkSpeedType, ProjectStatus, StageNumber, TaskStatus,
    get_media_type_name, get_work_speed_type_name, get_project_status_name,
    ProductionStatus
)

# Import centralized schemas
from app.schemas.production_management import (
    ProjectStaffInfo,
    StaffInfo,
    ProductionCardData,
    KanbanStageData,
    KanbanResponse,
    MoveCardRequest,
    MoveCardResponse,
    FilterOption,
    FiltersResponse,
    MediaTypeStats,
    StatisticsResponse
)

# 추가 스키마 정의
from pydantic import BaseModel, Field
from typing import Any

# 로깅 설정
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin/api/production/kanban", tags=["Admin Production Kanban"])

# ── 상수 매핑 (중앙화된 함수 사용으로 대체) ────────────────────────────────

STAGE_NAMES = {
    1: "자료 준비 및 섭외",
    2: "해설대본 작성", 
    3: "녹음/편집",
    4: "선재 제작/배포"
}

STAGE_WEIGHTS = {
    1: 10,
    2: 50,
    3: 25,
    4: 15
}

# 각 단계별 진행률 범위 정의
STAGE_PROGRESS_RANGES = {
    1: {"min": 0, "max": 10, "weight": 10},
    2: {"min": 10, "max": 60, "weight": 50},
    3: {"min": 60, "max": 85, "weight": 25},
    4: {"min": 85, "max": 100, "weight": 15}
}

# ── 프로젝트 상세보기 관련 스키마 추가 ──────────────────────────────────────

class TaskDetailResponse(BaseModel):
    """태스크 상세 정보 응답"""
    id: int
    stage_number: int = Field(alias="stageNumber")
    task_name: str = Field(alias="taskName")
    task_order: int = Field(alias="taskOrder")
    task_status: str = Field(alias="taskStatus")
    planned_hours: float = Field(alias="plannedHours")
    actual_hours: Optional[float] = Field(alias="actualHours", default=None)
    review_required: bool = Field(alias="reviewRequired")
    monitoring_required: bool = Field(alias="monitoringRequired")
    
    # 완료 상태
    is_main_completed: bool = Field(alias="isMainCompleted")
    is_review_completed: bool = Field(alias="isReviewCompleted")
    is_monitoring_completed: bool = Field(alias="isMonitoringCompleted")
    
    # 담당자
    assigned_person: Optional[str] = Field(alias="assignedPerson", default=None)
    reviewer_person: Optional[str] = Field(alias="reviewerPerson", default=None)
    monitor_person: Optional[str] = Field(alias="monitorPerson", default=None)
    
    # 날짜
    actual_start_date: Optional[str] = Field(alias="actualStartDate", default=None)
    actual_end_date: Optional[str] = Field(alias="actualEndDate", default=None)
    
    # 완료 일시 추가
    main_completed_at: Optional[str] = Field(alias="mainCompletedAt", default=None)
    review_completed_at: Optional[str] = Field(alias="reviewCompletedAt", default=None)
    monitoring_completed_at: Optional[str] = Field(alias="monitoringCompletedAt", default=None)

    class Config:
        populate_by_name = True

class ProjectDetailResponse(BaseModel):
    """프로젝트 상세 정보 응답"""
    id: int
    movie_title: str = Field(alias="movieTitle")
    movie_poster: Optional[str] = Field(alias="moviePoster", default=None)
    media_type: str = Field(alias="mediaType")
    media_type_name: str = Field(alias="mediaTypeName")
    asset_name: str = Field(alias="assetName")
    work_speed_type: str = Field(alias="workSpeedType")
    current_stage: int = Field(alias="currentStage")
    progress_percentage: float = Field(alias="progressPercentage")
    start_date: str = Field(alias="startDate")
    estimated_completion_date: Optional[str] = Field(alias="estimatedCompletionDate", default=None)
    actual_completion_date: Optional[str] = Field(alias="actualCompletionDate", default=None)
    project_status: str = Field(alias="projectStatus")
    staff_info: ProjectStaffInfo = Field(alias="staffInfo")
    
    class Config:
        populate_by_name = True

class ChangeSpeedRequest(BaseModel):
    """제작 속도 변경 요청"""
    work_speed_type: str = Field(alias="workSpeedType")
    
    class Config:
        populate_by_name = True

class TaskCompletionRequest(BaseModel):
    """태스크 완료 상태 업데이트 요청"""
    is_main_completed: Optional[bool] = Field(alias="isMainCompleted", default=None)
    is_review_completed: Optional[bool] = Field(alias="isReviewCompleted", default=None)
    is_monitoring_completed: Optional[bool] = Field(alias="isMonitoringCompleted", default=None)
    
    class Config:
        populate_by_name = True

class UpdateProgressRequest(BaseModel):
    """진행률 업데이트 요청"""
    project_id: int = Field(alias="projectId")
    progress_percentage: float = Field(alias="progressPercentage", ge=0, le=100)
    
    class Config:
        populate_by_name = True

# ── Pin 토글 요청 스키마 추가 ──────────────────────────────────────────
class PinToggleRequest(BaseModel):
    """Pin 상태 토글 요청"""
    project_id: int = Field(alias="projectId")
    is_pinned: bool = Field(alias="isPinned")
    
    class Config:
        populate_by_name = True

# ── 헬퍼 함수 ──────────────────────────────────────────────────────────

def get_stage_name(stage_number: int) -> str:
    """단계 번호를 이름으로 변환 (안전한 버전)"""
    return STAGE_NAMES.get(stage_number, f"단계 {stage_number}")

def get_stage_by_progress(progress: float) -> int:
    """진행률에 따른 적절한 단계 반환"""
    for stage, range_info in STAGE_PROGRESS_RANGES.items():
        if range_info["min"] <= progress < range_info["max"]:
            return stage
    # 100%인 경우 4단계
    if progress >= 100:
        return 4
    return 1

def get_person_name_from_credit(credit: AccessAssetCredit) -> str:
    """크레디트에서 실제 인물 이름 추출 (None 안전)"""
    try:
        if credit.person_type == 'scriptwriter' and credit.scriptwriter:
            return credit.scriptwriter.name or "이름 없음"
        elif credit.person_type == 'voice_artist' and credit.voice_artist:
            return credit.voice_artist.voiceartist_name or "이름 없음"
        elif credit.person_type == 'sl_interpreter' and credit.sl_interpreter:
            return credit.sl_interpreter.name or "이름 없음"
        elif credit.person_type == 'staff' and credit.staff:
            return credit.staff.name or "이름 없음"
        return "Unknown"
    except Exception as e:
        logger.error(f"Error extracting name from credit {credit.id}: {e}")
        return "오류"

def extract_staff_info(credits: List[AccessAssetCredit]) -> ProjectStaffInfo:
    """크레디트 목록에서 스태프 정보 추출 (안전한 버전)"""
    staff_info = ProjectStaffInfo(
        reviewers=[],
        monitors=[],
        voice_artists=[],
        other_staff=[]
    )
    
    if not credits:
        return staff_info
    
    try:
        for credit in credits:
            person_name = get_person_name_from_credit(credit)
            staff_item = StaffInfo(
                name=person_name,
                role=credit.role or "역할 없음",
                is_primary=credit.is_primary or False
            )
            
            if credit.person_type == 'scriptwriter':
                staff_info.main_writer = staff_item
            elif credit.person_type == 'voice_artist':
                staff_info.voice_artists.append(staff_item)
            elif credit.person_type == 'staff':
                role_lower = (credit.role or "").lower()
                if '감수' in (credit.role or "") or 'review' in role_lower:
                    staff_info.reviewers.append(staff_item)
                elif '모니터링' in (credit.role or "") or 'monitor' in role_lower:
                    staff_info.monitors.append(staff_item)
                elif '프로듀서' in (credit.role or "") or 'producer' in role_lower:
                    staff_info.producer = staff_item
                else:
                    staff_info.other_staff.append(staff_item)
            else:
                staff_info.other_staff.append(staff_item)
                
    except Exception as e:
        logger.error(f"Error extracting staff info: {e}")
    
    return staff_info

def calculate_days_remaining(project: ProductionProject) -> Tuple[int, bool]:
    """남은 일수 계산 및 지연 여부 반환 (안전한 버전)"""
    if not project.estimated_completion_date:
        return 999, False
    
    try:
        today = date.today()
        remaining = (project.estimated_completion_date - today).days
        is_overdue = remaining < 0
        return abs(remaining), is_overdue
    except Exception as e:
        logger.error(f"Error calculating days remaining for project {project.id}: {e}")
        return 999, False

def get_movie_poster_url(movie: Movie) -> Optional[str]:
    """영화 포스터 URL 생성 - 파일 서버 API 사용"""
    try:
        # 1. 파일 에셋 ID 사용 (우선순위)
        if movie.poster_file_id:
            return f"/api/files/by-id/{movie.poster_file_id}"
        
        # 2. 파일 에셋 관계로 접근
        if movie.poster_file and movie.poster_file.id:
            return f"/api/files/by-id/{movie.poster_file.id}"
        
        # 3. 레거시 - 이미지 렌디션 ID 사용
        if movie.poster_original_rendition_id:
            # 렌디션에서 file_asset_id를 가져와야 하는 경우 추가 조회 필요
            # 현재는 None 반환
            return None
        
        return None
    except Exception as e:
        logger.error(f"Error getting poster URL for movie {movie.id}: {e}")
        return None

# ── 태스크 완료 상태 계산 함수 추가 ──────────────────────────────────────────

def calculate_task_completion_status(task: ProductionTask) -> Dict[str, bool]:
    """태스크의 완료 상태를 계산"""
    # 메인 작업 완료 여부
    is_main_completed = task.task_status == TaskStatus.COMPLETED.value
    
    # 감수 완료 여부 (감수가 필요한 경우)
    is_review_completed = False
    if task.review_required:
        is_review_completed = task.review_end_date is not None
    
    # 모니터링 완료 여부 (모니터링이 필요한 경우)
    is_monitoring_completed = False
    if task.monitoring_required:
        is_monitoring_completed = task.monitoring_end_date is not None
    
    return {
        "is_main_completed": is_main_completed,
        "is_review_completed": is_review_completed,
        "is_monitoring_completed": is_monitoring_completed
    }

def calculate_task_progress(task: ProductionTask) -> float:
    """태스크의 진행률 계산"""
    total_parts = 1  # 메인 작업은 항상 있음
    completed_parts = 0
    
    # 메인 작업 완료 체크
    if task.task_status == TaskStatus.COMPLETED.value:
        completed_parts += 1
    
    # 감수 필요 시
    if task.review_required:
        total_parts += 1
        if task.review_end_date:
            completed_parts += 1
    
    # 모니터링 필요 시
    if task.monitoring_required:
        total_parts += 1
        if task.monitoring_end_date:
            completed_parts += 1
    
    return (completed_parts / total_parts) * 100 if total_parts > 0 else 0

def calculate_total_progress_with_weights(tasks: List[ProductionTask]) -> float:
    """가중치를 적용한 전체 진행률 계산"""
    total_progress = 0.0
    
    # 단계별로 태스크 그룹화
    stage_tasks = {1: [], 2: [], 3: [], 4: []}
    for task in tasks:
        if task.stage_number in stage_tasks:
            stage_tasks[task.stage_number].append(task)
    
    # 각 단계별 진행률 계산 및 가중치 적용
    for stage_num, weight in STAGE_WEIGHTS.items():
        if stage_tasks[stage_num]:
            # 해당 단계의 모든 태스크 진행률 평균
            stage_progress = sum(calculate_task_progress(task) for task in stage_tasks[stage_num]) / len(stage_tasks[stage_num])
            # 가중치 적용
            total_progress += (stage_progress / 100) * weight
    
    return min(100.0, total_progress)  # 100%를 넘지 않도록

def calculate_efficiency_score(project: ProductionProject, tasks: List[ProductionTask]) -> float:
    """프로젝트 효율성 점수 계산"""
    try:
        # 총 계획 시간
        total_planned_hours = sum(float(task.planned_hours or 0) for task in tasks)
        
        # 총 실제 시간
        total_actual_hours = sum(float(task.actual_hours or task.planned_hours or 0) for task in tasks)
        
        if total_actual_hours == 0:
            return 1.0
        
        # 효율성 = 계획 시간 / 실제 시간
        efficiency = total_planned_hours / total_actual_hours
        return round(efficiency, 2)
    except Exception as e:
        logger.error(f"Error calculating efficiency score: {e}")
        return 1.0

# ── 최적화된 쿼리 함수 ────────────────────────────────────────────────────

def get_optimized_projects_query(
    db: Session,
    media_type_filter: Optional[str] = None,
    speed_type_filter: Optional[str] = None,
    status_filter: Optional[str] = None
):
    """최적화된 프로젝트 쿼리 (N+1 문제 해결)"""
    
    # 메모 카운트를 서브쿼리로 처리
    memo_count_subquery = (
        select(func.count(ProductionMemo.id))
        .where(
            and_(
                ProductionMemo.production_project_id == ProductionProject.id,
                ProductionMemo.is_active == True
            )
        )
        .scalar_subquery()
    )
    
    # 메인 쿼리 - eager loading으로 관련 데이터 한 번에 로드
    query = (
        select(
            ProductionProject,
            AccessAsset,
            Movie,
            memo_count_subquery.label('memo_count')
        )
        .join(AccessAsset, ProductionProject.access_asset_id == AccessAsset.id)
        .join(Movie, AccessAsset.movie_id == Movie.id)
        .options(
            # Credits를 eager loading
            selectinload(ProductionProject.access_asset).selectinload(AccessAsset.credits),
            # 포스터 관련 데이터도 eager loading
            joinedload(Movie.poster_file),
            joinedload(Movie.poster_original_rendition)
        )
        .where(ProductionProject.project_status == (status_filter or ProjectStatus.ACTIVE.value))
    )
    
    # 필터 적용
    if media_type_filter:
        query = query.where(AccessAsset.media_type == media_type_filter)
    
    if speed_type_filter:
        query = query.where(ProductionProject.work_speed_type == speed_type_filter)
    
    # 정렬: 우선순위, 생성일 순
    query = query.order_by(
        ProductionProject.priority_order.desc(),
        ProductionProject.created_at.asc()
    )
    
    return query

def get_filter_data(db: Session) -> Dict:
    """필터 옵션을 위한 최적화된 데이터 조회"""
    try:
        # 사용 중인 미디어 유형 조회 (scalars로 리스트 반환)
        media_types = db.exec(
            select(AccessAsset.media_type)
            .join(ProductionProject, AccessAsset.id == ProductionProject.access_asset_id)
            .where(ProductionProject.project_status == ProjectStatus.ACTIVE.value)
            .distinct()
        ).all()
        
        # 사용 중인 속도 유형 조회
        speed_types = db.exec(
            select(ProductionProject.work_speed_type)
            .where(ProductionProject.project_status == ProjectStatus.ACTIVE.value)
            .distinct()
        ).all()
        
        return {
            "media_types": [
                FilterOption(value=mt, label=get_media_type_name(mt))
                for mt in media_types if mt
            ],
            "speed_types": [
                FilterOption(value=st, label=get_work_speed_type_name(st))
                for st in speed_types if st
            ],
            "project_statuses": [
                FilterOption(value=status.value, label=get_project_status_name(status.value))
                for status in [ProjectStatus.ACTIVE, ProjectStatus.COMPLETED, 
                              ProjectStatus.PAUSED, ProjectStatus.CANCELLED]
            ]
        }
    except Exception as e:
        logger.error(f"Error getting filter data: {e}")
        return {
            "media_types": [],
            "speed_types": [],
            "project_statuses": []
        }

# ── API 엔드포인트 ──────────────────────────────────────────────────────

@router.get("/", response_model=KanbanResponse)
async def get_kanban_data(
    status_filter: Optional[str] = None,
    media_type_filter: Optional[str] = None,
    speed_type_filter: Optional[str] = None,
    db: Session = Depends(get_session),
    current_user: User = Depends(get_editor_user)
):
    """칸반보드 데이터 조회 (최적화된 버전)"""
    
    try:
        # 최적화된 쿼리 실행
        query = get_optimized_projects_query(
            db, media_type_filter, speed_type_filter, status_filter
        )
        results = db.exec(query).all()
        
        # 단계별 그룹화
        stages_data = {i: [] for i in range(1, 5)}
        
        for project, access_asset, movie, memo_count in results:
            try:
                # None 체크
                if not project or not access_asset or not movie:
                    logger.warning(f"Missing data for project {project.id if project else 'unknown'}")
                    continue
                
                # 크레디트 정보 (이미 eager loading됨)
                credits = access_asset.credits or []
                
                # 남은 일수 계산
                days_remaining, is_overdue = calculate_days_remaining(project)
                
                # 스태프 정보 추출
                staff_info = extract_staff_info(credits)
                
                # 포스터 URL 생성
                poster_url = get_movie_poster_url(movie)
                
                card_data = ProductionCardData(
                    id=project.id,
                    movie_title=movie.title or "제목 없음",
                    movie_poster=poster_url,  # 파일 서버 API URL
                    media_type=access_asset.media_type or "",
                    media_type_name=get_media_type_name(access_asset.media_type or ""),
                    asset_name=access_asset.name or "자산명 없음",
                    work_speed_type=project.work_speed_type or WorkSpeedType.B.value,
                    current_stage=project.current_stage or 1,
                    progress_percentage=project.progress_percentage or 0.0,
                    staff_info=staff_info,
                    days_remaining=days_remaining,
                    is_overdue=is_overdue,
                    memo_count=memo_count or 0,
                    start_date=project.start_date or date.today(),
                    estimated_completion_date=project.estimated_completion_date,
                    project_status=project.project_status or ProjectStatus.ACTIVE.value,
                    # is_pinned 필드 직접 사용
                    is_pinned=getattr(project, 'is_pinned', False)
                )
                
                # 현재 단계가 유효한 범위인지 확인
                current_stage = project.current_stage or 1
                if 1 <= current_stage <= 4:
                    stages_data[current_stage].append(card_data)
                else:
                    logger.warning(f"Invalid stage {current_stage} for project {project.id}")
                    stages_data[1].append(card_data)  # 기본값으로 1단계에 배치
                    
            except Exception as e:
                logger.error(f"Error processing project {project.id if project else 'unknown'}: {e}")
                continue
        
        # 응답 데이터 구성
        stages = []
        for stage_num in range(1, 5):
            stages.append(KanbanStageData(
                stage_number=stage_num,
                stage_name=get_stage_name(stage_num),
                cards=stages_data[stage_num]
            ))
        
        return KanbanResponse(
            stages=stages,
            total_projects=len(results)
        )
        
    except Exception as e:
        logger.error(f"Error in get_kanban_data: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="칸반 데이터 조회 중 오류가 발생했습니다"
        )

@router.post("/move-card", response_model=MoveCardResponse)
async def move_card(
    move_request: MoveCardRequest,
    db: Session = Depends(get_session),
    current_user: User = Depends(get_editor_user)
):
    """카드를 다른 단계로 이동 (진행률 범위 적용)"""
    
    try:
        # 프로젝트 조회
        project = db.get(ProductionProject, move_request.project_id)
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="프로젝트를 찾을 수 없습니다"
            )
        
        # 타겟 단계 유효성 검사 (이미 스키마에서 검증되지만 이중 체크)
        if not (1 <= move_request.target_stage <= 4):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="대상 단계는 1~4 사이여야 합니다"
            )
        
        # 이미 같은 단계인 경우
        if project.current_stage == move_request.target_stage:
            return MoveCardResponse(
                message="이미 해당 단계에 있습니다",
                project_id=project.id,
                old_stage=project.current_stage,
                new_stage=project.current_stage,
                progress_percentage=project.progress_percentage,
                project_status=project.project_status
            )
        
        # 단계 업데이트
        old_stage = project.current_stage
        project.current_stage = move_request.target_stage
        
        # 단계별 시작 진행률 설정
        project.progress_percentage = STAGE_PROGRESS_RANGES[move_request.target_stage]["min"]
        
        # 4단계로 이동 시 완료 처리 고려
        if move_request.target_stage == 4:
            project.progress_percentage = 85.0  # 4단계 시작점
            # 100% 이상이면 완료 처리
            if project.progress_percentage >= 100:
                project.project_status = ProjectStatus.COMPLETED.value
                if not project.actual_completion_date:
                    project.actual_completion_date = date.today()
        elif project.project_status == ProjectStatus.COMPLETED.value:
            # 완료에서 다른 단계로 이동 시 상태 복원
            project.project_status = ProjectStatus.ACTIVE.value
            project.actual_completion_date = None
        
        # 업데이트 시간 설정
        project.updated_at = datetime.now()
        
        db.commit()
        db.refresh(project)
        
        logger.info(f"Project {project.id} moved from stage {old_stage} to {move_request.target_stage}")
        
        return MoveCardResponse(
            message="카드가 성공적으로 이동되었습니다",
            project_id=project.id,
            old_stage=old_stage,
            new_stage=project.current_stage,
            progress_percentage=project.progress_percentage,
            project_status=project.project_status
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error moving card: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="카드 이동 중 오류가 발생했습니다"
        )

@router.post("/update-progress", response_model=Dict[str, Any])
async def update_progress(
    request: UpdateProgressRequest,
    db: Session = Depends(get_session),
    current_user: User = Depends(get_editor_user)
):
    """진행률 업데이트 및 자동 단계 이동"""
    
    try:
        project = db.get(ProductionProject, request.project_id)
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="프로젝트를 찾을 수 없습니다"
            )
        
        old_stage = project.current_stage
        old_progress = project.progress_percentage
        
        # 진행률 업데이트
        new_progress = max(0, min(100, request.progress_percentage))
        project.progress_percentage = new_progress
        
        # 진행률에 따른 자동 단계 변경
        appropriate_stage = get_stage_by_progress(new_progress)
        if appropriate_stage != project.current_stage:
            project.current_stage = appropriate_stage
            logger.info(f"Project {project.id} auto-moved to stage {appropriate_stage} due to progress {new_progress}%")
        
        # 100% 도달 시 완료 처리
        if new_progress >= 100:
            project.project_status = ProjectStatus.COMPLETED.value
            if not project.actual_completion_date:
                project.actual_completion_date = date.today()
        
        project.updated_at = datetime.now()
        
        db.commit()
        db.refresh(project)
        
        return {
            "project_id": project.id,
            "old_stage": old_stage,
            "new_stage": project.current_stage,
            "old_progress": old_progress,
            "new_progress": project.progress_percentage,
            "stage_changed": old_stage != project.current_stage,
            "project_status": project.project_status
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating progress: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="진행률 업데이트 중 오류가 발생했습니다"
        )

@router.get("/filters", response_model=FiltersResponse)
async def get_filter_options(
    db: Session = Depends(get_session),
    current_user: User = Depends(get_editor_user)
):
    """필터 옵션 데이터 조회 (최적화된 버전)"""
    
    try:
        filter_data = get_filter_data(db)
        return FiltersResponse(**filter_data)
        
    except Exception as e:
        logger.error(f"Error getting filter options: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="필터 옵션 조회 중 오류가 발생했습니다"
        )

@router.get("/statistics", response_model=StatisticsResponse)
async def get_kanban_statistics(
    db: Session = Depends(get_session),
    current_user: User = Depends(get_editor_user)
):
    """칸반보드 통계 정보 (최적화된 버전)"""
    
    try:
        # 단계별 프로젝트 수 (한 번의 쿼리로 처리)
        stage_counts_query = (
            select(
                ProductionProject.current_stage,
                func.count(ProductionProject.id)
            )
            .where(ProductionProject.project_status == ProjectStatus.ACTIVE.value)
            .group_by(ProductionProject.current_stage)
        )
        stage_results = db.exec(stage_counts_query).all()
        
        # 결과를 딕셔너리로 변환
        stage_counts = {f"stage_{i}": 0 for i in range(1, 5)}
        for stage, count in stage_results:
            if 1 <= stage <= 4:
                stage_counts[f"stage_{stage}"] = count
        
        # 지연된 프로젝트 수
        today = date.today()
        overdue_count = db.exec(
            select(func.count(ProductionProject.id))
            .where(
                and_(
                    ProductionProject.estimated_completion_date < today,
                    ProductionProject.project_status == ProjectStatus.ACTIVE.value
                )
            )
        ).one()

        # 미디어 유형별 분포 (한 번의 쿼리로 처리)
        media_type_query = (
            select(
                AccessAsset.media_type,
                func.count(ProductionProject.id)
            )
            .join(ProductionProject, AccessAsset.id == ProductionProject.access_asset_id)
            .where(ProductionProject.project_status == ProjectStatus.ACTIVE.value)
            .group_by(AccessAsset.media_type)
        )
        media_type_results = db.exec(media_type_query).all()
        
        # 미디어 타입 분포 구성
        media_type_distribution = {}
        for media_type, count in media_type_results:
            if media_type and count > 0:
                media_type_distribution[media_type] = MediaTypeStats(
                    count=count,
                    name=get_media_type_name(media_type)
                )
        
        return StatisticsResponse(
            stage_counts=stage_counts,
            overdue_count=overdue_count or 0,
            total_active=sum(stage_counts.values()),
            media_type_distribution=media_type_distribution
        )
        
    except Exception as e:
        logger.error(f"Error getting statistics: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="통계 조회 중 오류가 발생했습니다"
        )

@router.patch("/task/{task_id}/checklist", response_model=Dict[str, Any])
async def update_task_checklist(
    task_id: int,
    checklist_data: Dict[str, bool],
    db: Session = Depends(get_session),
    current_user: User = Depends(get_editor_user)
):
    """작업 체크리스트 진행 상태 업데이트"""
    
    try:
        task = db.get(ProductionTask, task_id)
        if not task:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="작업을 찾을 수 없습니다"
            )
        
        # 체크리스트 진행 상태 업데이트
        task.checklist_progress = checklist_data
        
        # 전체 완료율 계산
        total_items = len(checklist_data)
        completed_items = sum(1 for checked in checklist_data.values() if checked)
        completion_rate = (completed_items / total_items * 100) if total_items > 0 else 0
        
        # 모든 필수 항목이 완료되면 작업 상태 업데이트 고려
        if completion_rate == 100 and task.task_status == TaskStatus.PENDING.value:
            task.task_status = TaskStatus.COMPLETED.value
            task.actual_end_date = datetime.utcnow()
        
        task.updated_at = datetime.utcnow()
        
        db.commit()
        db.refresh(task)
        
        return {
            "task_id": task.id,
            "checklist_progress": task.checklist_progress,
            "completion_rate": completion_rate,
            "task_status": task.task_status
        }
        
    except Exception as e:
        logger.error(f"Error updating task checklist: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="체크리스트 업데이트 중 오류가 발생했습니다"
        )

# ── 프로젝트 상세보기 관련 새로운 엔드포인트 ──────────────────────────────────────

@router.get("/projects/{project_id}/details", response_model=ProjectDetailResponse)
async def get_project_details(
    project_id: int,
    db: Session = Depends(get_session),
    current_user: User = Depends(get_editor_user)
):
    """프로젝트 상세 정보 조회"""
    
    try:
        # 프로젝트 정보 조회 (관련 데이터 포함)
        project = db.exec(
            select(ProductionProject)
            .options(
                selectinload(ProductionProject.access_asset)
                .selectinload(AccessAsset.credits),
                selectinload(ProductionProject.access_asset)
                .selectinload(AccessAsset.movie)
            )
            .where(ProductionProject.id == project_id)
        ).first()
        
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="프로젝트를 찾을 수 없습니다"
            )
        
        # 스태프 정보 추출
        credits = project.access_asset.credits if project.access_asset else []
        staff_info = extract_staff_info(credits)
        
        # 영화 정보
        movie = project.access_asset.movie if project.access_asset else None
        movie_title = movie.title if movie else "제목 없음"
        movie_poster = get_movie_poster_url(movie) if movie else None
        
        # 응답 생성
        return ProjectDetailResponse(
            id=project.id,
            movie_title=movie_title,
            movie_poster=movie_poster,
            media_type=project.access_asset.media_type if project.access_asset else "",
            media_type_name=get_media_type_name(project.access_asset.media_type) if project.access_asset else "",
            asset_name=project.access_asset.name if project.access_asset else "",
            work_speed_type=project.work_speed_type,
            current_stage=project.current_stage,
            progress_percentage=float(project.progress_percentage),
            start_date=project.start_date.isoformat() if project.start_date else date.today().isoformat(),
            estimated_completion_date=project.estimated_completion_date.isoformat() if project.estimated_completion_date else None,
            actual_completion_date=project.actual_completion_date.isoformat() if project.actual_completion_date else None,
            project_status=project.project_status,
            staff_info=staff_info
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting project details: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="프로젝트 상세 정보 조회 중 오류가 발생했습니다"
        )

@router.get("/projects/{project_id}/tasks", response_model=List[TaskDetailResponse])
async def get_project_tasks(
    project_id: int,
    db: Session = Depends(get_session),
    current_user: User = Depends(get_editor_user)
):
    """프로젝트의 모든 태스크 목록 조회"""
    
    try:
        # 프로젝트 존재 확인
        project = db.get(ProductionProject, project_id)
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="프로젝트를 찾을 수 없습니다"
            )
        
        # 태스크 목록 조회
        tasks = db.exec(
            select(ProductionTask)
            .options(
                selectinload(ProductionTask.assigned_credit),
                selectinload(ProductionTask.reviewer_credit),
                selectinload(ProductionTask.monitor_credit)
            )
            .where(ProductionTask.production_project_id == project_id)
            .order_by(ProductionTask.stage_number, ProductionTask.task_order)
        ).all()
        
        # 응답 생성
        task_responses = []
        for task in tasks:
            # 완료 상태 계산
            completion_status = calculate_task_completion_status(task)
            
            # 담당자 이름 추출
            assigned_person = None
            if task.assigned_credit:
                assigned_person = get_person_name_from_credit(task.assigned_credit)
            
            reviewer_person = None
            if task.reviewer_credit:
                reviewer_person = get_person_name_from_credit(task.reviewer_credit)
            
            monitor_person = None
            if task.monitor_credit:
                monitor_person = get_person_name_from_credit(task.monitor_credit)
            
            task_response = TaskDetailResponse(
                id=task.id,
                stage_number=task.stage_number,
                task_name=task.task_name,
                task_order=task.task_order,
                task_status=task.task_status,
                planned_hours=float(task.planned_hours) if task.planned_hours else 0.0,
                actual_hours=float(task.actual_hours) if task.actual_hours else None,
                review_required=task.review_required,
                monitoring_required=task.monitoring_required,
                is_main_completed=completion_status["is_main_completed"],
                is_review_completed=completion_status["is_review_completed"],
                is_monitoring_completed=completion_status["is_monitoring_completed"],
                assigned_person=assigned_person,
                reviewer_person=reviewer_person,
                monitor_person=monitor_person,
                actual_start_date=task.actual_start_date.isoformat() if task.actual_start_date else None,
                actual_end_date=task.actual_end_date.isoformat() if task.actual_end_date else None,
                main_completed_at=task.actual_end_date.isoformat() if task.actual_end_date and completion_status["is_main_completed"] else None,
                review_completed_at=task.review_end_date.isoformat() if task.review_end_date else None,
                monitoring_completed_at=task.monitoring_end_date.isoformat() if task.monitoring_end_date else None
            )
            
            task_responses.append(task_response)
        
        return task_responses
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting project tasks: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="태스크 목록 조회 중 오류가 발생했습니다"
        )

@router.patch("/projects/{project_id}/speed")
async def change_project_speed(
    project_id: int,
    request: ChangeSpeedRequest,
    db: Session = Depends(get_session),
    current_user: User = Depends(get_editor_user)
):
    """프로젝트 제작 속도 변경"""
    
    try:
        # 프로젝트 조회
        project = db.get(ProductionProject, project_id)
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="프로젝트를 찾을 수 없습니다"
            )
        
        # 1단계에서만 변경 가능
        if project.current_stage != 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="제작 속도는 1단계에서만 변경할 수 있습니다"
            )
        
        # 속도 타입 유효성 검사
        try:
            WorkSpeedType(request.work_speed_type)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="유효하지 않은 속도 타입입니다"
            )
        
        # 이미 같은 속도인 경우
        if project.work_speed_type == request.work_speed_type:
            return {"message": "이미 같은 속도입니다", "work_speed_type": project.work_speed_type}
        
        # 속도 변경
        old_speed = project.work_speed_type
        project.work_speed_type = request.work_speed_type
        
        # 예상 완료일 재계산 (템플릿 기반)
        # 미디어 타입과 속도에 따른 템플릿 조회
        templates = db.exec(
            select(ProductionTemplate)
            .where(
                and_(
                    ProductionTemplate.media_type == project.access_asset.media_type,
                    ProductionTemplate.is_active == True
                )
            )
        ).all()
        
        # 총 예상 시간 계산
        total_hours = 0.0
        for template in templates:
            if request.work_speed_type == 'A':
                total_hours += float(template.speed_a_hours)
                if template.requires_review:
                    total_hours += float(template.review_hours_a)
                if template.requires_monitoring:
                    total_hours += float(template.monitoring_hours_a)
            elif request.work_speed_type == 'B':
                total_hours += float(template.speed_b_hours)
                if template.requires_review:
                    total_hours += float(template.review_hours_b)
                if template.requires_monitoring:
                    total_hours += float(template.monitoring_hours_b)
            else:  # 'C'
                total_hours += float(template.speed_c_hours)
                if template.requires_review:
                    total_hours += float(template.review_hours_c)
                if template.requires_monitoring:
                    total_hours += float(template.monitoring_hours_c)
        
        # 하루 8시간 기준으로 일수 계산
        estimated_days = int(total_hours / 8) + (1 if total_hours % 8 > 0 else 0)
        
        # 예상 완료일 업데이트
        if project.start_date:
            project.estimated_completion_date = project.start_date + timedelta(days=estimated_days)
        
        project.updated_at = datetime.now()
        
        db.commit()
        db.refresh(project)
        
        logger.info(f"Project {project.id} speed changed from {old_speed} to {request.work_speed_type}")
        
        return {
            "message": "제작 속도가 변경되었습니다",
            "project_id": project.id,
            "old_speed": old_speed,
            "new_speed": project.work_speed_type,
            "estimated_completion_date": project.estimated_completion_date.isoformat() if project.estimated_completion_date else None
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error changing project speed: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="제작 속도 변경 중 오류가 발생했습니다"
        )

@router.patch("/tasks/{task_id}/completion")
async def update_task_completion(
    task_id: int,
    request: TaskCompletionRequest,
    db: Session = Depends(get_session),
    current_user: User = Depends(get_editor_user)
):
    """태스크 완료 상태 업데이트"""
    
    try:
        # 태스크 조회
        task = db.get(ProductionTask, task_id)
        if not task:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="태스크를 찾을 수 없습니다"
            )
        
        # 프로젝트 조회
        project = db.get(ProductionProject, task.production_project_id)
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="프로젝트를 찾을 수 없습니다"
            )
        
        # 상태 업데이트
        updated = False
        
        # 메인 작업 완료 상태 업데이트
        if request.is_main_completed is not None:
            if request.is_main_completed:
                if task.task_status != TaskStatus.COMPLETED.value:
                    task.task_status = TaskStatus.COMPLETED.value
                    task.actual_end_date = datetime.utcnow()
                    task.completed_by = current_user.id
                    updated = True
            else:
                if task.task_status == TaskStatus.COMPLETED.value:
                    task.task_status = TaskStatus.IN_PROGRESS.value
                    task.actual_end_date = None
                    updated = True
        
        # 감수 완료 상태 업데이트
        if request.is_review_completed is not None and task.review_required:
            if request.is_review_completed:
                if not task.review_end_date:
                    task.review_end_date = datetime.utcnow()
                    if not task.review_start_date:
                        task.review_start_date = datetime.utcnow()
                    updated = True
            else:
                if task.review_end_date:
                    task.review_end_date = None
                    updated = True
        
        # 모니터링 완료 상태 업데이트
        if request.is_monitoring_completed is not None and task.monitoring_required:
            if request.is_monitoring_completed:
                if not task.monitoring_end_date:
                    task.monitoring_end_date = datetime.utcnow()
                    if not task.monitoring_start_date:
                        task.monitoring_start_date = datetime.utcnow()
                    updated = True
            else:
                if task.monitoring_end_date:
                    task.monitoring_end_date = None
                    updated = True
        
        if updated:
            task.updated_at = datetime.utcnow()
            
            # 전체 진행률 재계산
            all_tasks = db.exec(
                select(ProductionTask)
                .where(ProductionTask.production_project_id == project.id)
            ).all()
            
            new_progress = calculate_total_progress_with_weights(all_tasks)
            project.progress_percentage = new_progress
            
            # 진행률에 따른 자동 단계 변경
            appropriate_stage = get_stage_by_progress(new_progress)
            if appropriate_stage != project.current_stage:
                project.current_stage = appropriate_stage
                logger.info(f"Project {project.id} automatically moved to stage {project.current_stage} due to progress {new_progress}%")
            
            db.commit()
            db.refresh(task)
            db.refresh(project)

        # 현재 완료 상태 반환
        completion_status = calculate_task_completion_status(task)
        
        return {
            "task_id": task.id,
            "is_main_completed": completion_status["is_main_completed"],
            "is_review_completed": completion_status["is_review_completed"],
            "is_monitoring_completed": completion_status["is_monitoring_completed"],
            "task_progress": calculate_task_progress(task),
            "project_progress": project.progress_percentage,
            "current_stage": project.current_stage
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating task completion: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="태스크 완료 상태 업데이트 중 오류가 발생했습니다"
        )

# ── Pin 토글 엔드포인트 추가 ──────────────────────────────────────────
@router.post("/toggle-pin", response_model=Dict[str, Any])
async def toggle_pin_status(
    request: PinToggleRequest,
    db: Session = Depends(get_session),
    current_user: User = Depends(get_editor_user)
):
    """프로젝트의 Pin 상태 토글"""
    
    try:
        # 프로젝트 조회
        project = db.get(ProductionProject, request.project_id)
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="프로젝트를 찾을 수 없습니다"
            )
        
        # Pin 상태 업데이트 (is_pinned 필드 직접 사용)
        project.is_pinned = request.is_pinned
        project.updated_at = datetime.now()
        
        db.commit()
        db.refresh(project)
        
        logger.info(f"Project {project.id} pin status changed to {request.is_pinned}")
        
        return {
            "success": True,
            "projectId": project.id,
            "isPinned": request.is_pinned,
            "message": "Pin 상태가 업데이트되었습니다"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error toggling pin status: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Pin 상태 업데이트 중 오류가 발생했습니다"
        )

# ── 프로젝트 완료 엔드포인트 추가 ──────────────────────────────────────────
@router.post("/projects/{project_id}/complete")
async def complete_production_project(
    project_id: int = Path(..., description="프로젝트 ID"),
    db: Session = Depends(get_session),
    current_user: User = Depends(get_editor_user)
):
    """프로덕션 프로젝트를 완료 처리합니다."""
    
    try:
        # 프로젝트 조회 (관련 데이터 포함)
        project = db.exec(
            select(ProductionProject)
            .options(
                selectinload(ProductionProject.access_asset),
                selectinload(ProductionProject.tasks)
            )
            .where(ProductionProject.id == project_id)
        ).first()
        
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="프로젝트를 찾을 수 없습니다"
            )
        
        # 이미 완료된 프로젝트인지 확인
        if project.project_status == ProjectStatus.COMPLETED.value:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="이미 완료된 프로젝트입니다"
            )
        
        # 프로젝트 완료 처리
        project.project_status = ProjectStatus.COMPLETED.value
        project.actual_completion_date = date.today()
        project.progress_percentage = 100.0
        project.updated_at = datetime.now()
        
        # 연결된 access_asset의 production_status도 completed로 변경
        if project.access_asset:
            project.access_asset.production_status = ProductionStatus.COMPLETED.value
            project.access_asset.updated_at = datetime.now()
        
        # 영화 정보 가져오기
        movie = project.access_asset.movie if project.access_asset else None
        
        # 크레디트 정보 가져오기
        credits = project.access_asset.credits if project.access_asset else []
        
        # 참여자 정보 구성
        participants = {
            "main_writer": None,
            "producer": None,
            "reviewers": [],
            "monitors": [],
            "voice_artists": [],
            "sl_interpreters": [],
            "other_staff": []
        }
        
        for credit in credits:
            person_info = {
                "name": get_person_name_from_credit(credit),
                "role": credit.role or "역할 없음",
                "is_primary": credit.is_primary or False
            }
            
            if credit.person_type == 'scriptwriter' and credit.is_primary:
                participants["main_writer"] = person_info
            elif credit.person_type == 'voice_artist':
                participants["voice_artists"].append(person_info)
            elif credit.person_type == 'sl_interpreter':
                participants["sl_interpreters"].append(person_info)
            elif credit.person_type == 'staff':
                role_lower = (credit.role or "").lower()
                if '감수' in (credit.role or "") or 'review' in role_lower:
                    participants["reviewers"].append(person_info)
                elif '모니터링' in (credit.role or "") or 'monitor' in role_lower:
                    participants["monitors"].append(person_info)
                elif '프로듀서' in (credit.role or "") or 'producer' in role_lower:
                    participants["producer"] = person_info
                else:
                    participants["other_staff"].append(person_info)
        
        # 단계별 소요 시간 계산
        stage_durations = {}
        for i in range(1, 5):
            stage_tasks = [t for t in project.tasks if t.stage_number == i]
            if stage_tasks:
                stage_duration = sum(float(t.actual_hours or t.planned_hours or 0) for t in stage_tasks)
                stage_durations[f"stage_{i}"] = int(stage_duration)
        
        # 총 작업 시간 계산
        total_hours = sum(float(task.actual_hours or task.planned_hours or 0) for task in project.tasks)
        
        # 효율성 점수 계산
        efficiency_score = calculate_efficiency_score(project, project.tasks)
        
        # 평균 품질 점수 계산 (임시로 4.0 설정 - 실제로는 performance 테이블에서 계산해야 함)
        average_quality = 4.0
        
        # 재작업 비율 계산 (임시로 0 설정 - 실제로는 performance 테이블에서 계산해야 함)
        rework_percentage = 0.0
        
        # 아카이브 테이블에 기록
        archive = ProductionArchive(
            original_project_id=project.id,
            access_asset_id=project.access_asset_id,
            movie_title=movie.title if movie else "제목 없음",
            media_type=project.access_asset.media_type if project.access_asset else "",
            asset_name=project.access_asset.name if project.access_asset else "",
            work_speed_type=project.work_speed_type,
            start_date=project.start_date or date.today(),
            completion_date=date.today(),
            total_days=(date.today() - (project.start_date or date.today())).days,
            total_hours=Decimal(str(total_hours)),
            participants=participants,
            overall_efficiency=Decimal(str(efficiency_score)),
            average_quality=Decimal(str(average_quality)),
            rework_percentage=Decimal(str(rework_percentage)),
            stage_durations=stage_durations,
            archived_by=current_user.id
        )
        
        db.add(archive)
        db.commit()
        
        logger.info(f"Project {project_id} completed and archived by user {current_user.id}")
        
        return {
            "message": "프로젝트가 완료되었습니다",
            "project_id": project_id,
            "archive_id": archive.id,
            "completion_date": date.today().isoformat(),
            "total_hours": float(total_hours),
            "efficiency_score": efficiency_score
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error completing project: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="프로젝트 완료 처리 중 오류가 발생했습니다"
        )
