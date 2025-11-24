# app/routes/admin_production_analytics.py

from fastapi import APIRouter, Depends, HTTPException, status, Query, Path
from fastapi.responses import JSONResponse
from sqlmodel import Session, select, func, and_, or_
from sqlalchemy import text
from typing import Optional, List, Any, Dict
from datetime import date, datetime, timedelta
from collections import defaultdict
import calendar
import logging
import json

# 의존성 및 모델 임포트
from app.dependencies.auth import get_editor_user
from app.models.users import User
from app.models.movies import Movie
from app.models.staff import Staff
from app.models.scriptwriter import Scriptwriter
from app.models.access_asset import AccessAsset
from app.models.access_asset_credit import AccessAssetCredit
from app.models.production_archives import ProductionArchive
from app.services.production_tracking_service import ProductionTrackingService
from app.services.production_archive_service import ProductionArchiveService
from app.db import get_session

# 중앙화된 Enum import
from app.models.enums import (
    MediaType, WorkSpeedType, ProjectStatus, 
    QualityScore, Rating, ProjectSuccessRating,
    PersonType
)

# 스키마 임포트
from app.schemas.production_analytics import (
    # 작업자 성과
    WorkerPerformanceSummaryResponse,
    # 프로젝트 성과
    ProjectPerformanceSummaryResponse,
    # 팀 성과
    TeamPerformanceAnalyticsResponse,
    # 아카이브
    ArchiveProjectResponse, PaginationInfo, ArchivePaginationResponse,
    ArchiveInfo, ParticipantInfo, ParticipantsInfo, ArchiveDetailResponse,
    ArchiveAnalyticsResponse, MediaTypeStats, SpeedTypeStats, MonthlyTrend,
    # 종합 대시보드
    PeriodOverviewResponse, SummaryStats, ProductivityTrend, BottleneckItem,
    DailyProductivity, MediaTypeDistribution, EfficiencyBySpeed,
    # 비교 분석
    ComparisonOption, ComparisonOptionsResponse, ComparisonItem,
    ComparisonMetrics, ComparisonDataResponse,
    # 요청/응답
    PerformanceRecordCreate, ArchiveCreateRequest, CompareArchivesRequest
)

# 유틸리티 및 헬퍼 함수 임포트
from app.utils.production_analytics import (
    # 유틸리티
    safe_float_response, safe_int_response, validate_date_range,
    validate_pagination_params, validate_rating_score, validate_media_type,
    validate_work_speed, handle_service_error,
    # 헬퍼
    calculate_period_stats, calculate_producer_stats, calculate_media_type_stats,
    get_producer_ids_from_archive, calculate_average_improvement, generate_insights,
    get_media_type_name
)

# 로깅 설정
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin/api/production/analytics", tags=["Admin Production Analytics"])

# ── API 엔드포인트 ──────────────────────────────────────────────────────

@router.get("/health")
async def health_check(
    db: Session = Depends(get_session)
):
    """서비스 상태 확인"""
    try:
        # DB 연결 확인
        stmt = select(func.count()).select_from(ProductionArchive)
        archive_count = db.exec(stmt).first() or 0
        
        # 올해 데이터 확인
        year_start = date(date.today().year, 1, 1)
        stmt_year = select(func.count()).select_from(ProductionArchive).where(
            ProductionArchive.completion_date >= year_start
        )
        year_count = db.exec(stmt_year).first() or 0
        
        return {
            "status": "healthy",
            "service": "productionAnalytics",
            "totalArchives": archive_count,
            "currentYearArchives": year_count,
            "message": "성과 분석 서비스가 정상 작동 중입니다." if archive_count > 0 else "아직 분석할 데이터가 없습니다.",
            "hasData": archive_count > 0
        }
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return {
            "status": "error",
            "service": "productionAnalytics",
            "message": "서비스 상태 확인 중 오류가 발생했습니다.",
            "error": str(e)
        }

@router.get("/team", response_model=TeamPerformanceAnalyticsResponse)
async def get_team_performance_analytics(
    start_date: Optional[date] = Query(None, description="시작 날짜 (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="종료 날짜 (YYYY-MM-DD)"),
    db: Session = Depends(get_session),
    current_user: User = Depends(get_editor_user)
):
    """팀 전체 성과 분석"""
    
    # 기본값 설정: 올해 1월 1일부터 오늘까지
    if not start_date:
        start_date = date(date.today().year, 1, 1)
    if not end_date:
        end_date = date.today()
    
    # 입력 유효성 검증
    validate_date_range(start_date, end_date)
    
    try:
        tracking_service = ProductionTrackingService(db)
        analytics_data = tracking_service.get_team_performance_analytics(start_date, end_date)
        
        # 데이터가 없는 경우 기본 응답
        if isinstance(analytics_data, dict) and "message" in analytics_data:
            logger.info(f"No team performance data found for period {start_date} to {end_date}")
            return TeamPerformanceAnalyticsResponse(
                period={"start_date": start_date, "end_date": end_date}
            )
        
        # 안전한 숫자 변환
        safe_data = {
            "total_hours": safe_float_response(analytics_data.get("total_hours")),
            "total_tasks": safe_int_response(analytics_data.get("total_tasks")),
            "average_efficiency": analytics_data.get("average_efficiency"),
            "role_analysis": analytics_data.get("role_analysis", {}),
            "media_type_analysis": analytics_data.get("media_type_analysis", {}),
            "period": analytics_data.get("period", {"start_date": start_date, "end_date": end_date})
        }
        
        return TeamPerformanceAnalyticsResponse.model_validate(safe_data)
        
    except Exception as e:
        raise handle_service_error(e, "team performance analytics")

@router.get("/worker/{credit_id}", response_model=WorkerPerformanceSummaryResponse)
async def get_worker_performance_summary(
    credit_id: int = Path(..., gt=0, description="작업자 크레딧 ID"),
    start_date: Optional[date] = Query(None, description="시작 날짜 (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="종료 날짜 (YYYY-MM-DD)"),
    db: Session = Depends(get_session),
    current_user: User = Depends(get_editor_user)
):
    """특정 작업자의 성과 요약"""
    
    # 입력 유효성 검증
    validate_date_range(start_date, end_date)
    
    try:
        tracking_service = ProductionTrackingService(db)
        summary_data = tracking_service.get_worker_performance_summary(credit_id, start_date, end_date)
        
        if isinstance(summary_data, dict) and "message" in summary_data:
            logger.info(f"No performance data found for worker {credit_id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="해당 작업자의 성과 데이터를 찾을 수 없습니다."
            )
        
        # 안전한 데이터 변환
        safe_data = {
            "total_tasks": safe_int_response(summary_data.get("total_tasks")),
            "total_planned_hours": safe_float_response(summary_data.get("total_planned_hours")),
            "total_actual_hours": safe_float_response(summary_data.get("total_actual_hours")),
            "average_efficiency": summary_data.get("average_efficiency"),
            "average_quality": summary_data.get("average_quality"),
            "rework_count": safe_int_response(summary_data.get("rework_count")),
            "rework_percentage": safe_float_response(summary_data.get("rework_percentage")),
            "work_type_analysis": summary_data.get("work_type_analysis", {}),
            "period": summary_data.get("period", {"start_date": start_date, "end_date": end_date})
        }
        
        return WorkerPerformanceSummaryResponse.model_validate(safe_data)
        
    except Exception as e:
        raise handle_service_error(e, "worker performance summary")

@router.get("/project/{project_id}", response_model=ProjectPerformanceSummaryResponse)
async def get_project_performance_summary(
    project_id: int = Path(..., gt=0, description="프로젝트 ID"),
    db: Session = Depends(get_session),
    current_user: User = Depends(get_editor_user)
):
    """특정 프로젝트의 성과 요약"""
    
    try:
        tracking_service = ProductionTrackingService(db)
        summary_data = tracking_service.get_project_performance_summary(project_id)
        
        if isinstance(summary_data, dict) and "message" in summary_data:
            logger.info(f"No performance data found for project {project_id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="해당 프로젝트의 성과 데이터를 찾을 수 없습니다."
            )
        
        # 안전한 데이터 변환
        safe_data = {
            "project_id": project_id,
            "total_planned_hours": safe_float_response(summary_data.get("total_planned_hours")),
            "total_actual_hours": safe_float_response(summary_data.get("total_actual_hours")),
            "overall_efficiency": summary_data.get("overall_efficiency"),
            "average_quality": summary_data.get("average_quality"),
            "total_rework_hours": safe_float_response(summary_data.get("total_rework_hours")),
            "rework_percentage": safe_float_response(summary_data.get("rework_percentage")),
            "stage_analysis": summary_data.get("stage_analysis", {}),
            "participants_count": safe_int_response(summary_data.get("participants_count")),
            "progress_percentage": safe_float_response(summary_data.get("progress_percentage"))
        }
        
        return ProjectPerformanceSummaryResponse.model_validate(safe_data)
        
    except Exception as e:
        raise handle_service_error(e, "project performance summary")

@router.post("/record-performance/task/{task_id}")
async def record_task_performance(
    task_id: int = Path(..., gt=0, description="작업 ID"),
    performance_data: PerformanceRecordCreate = ...,
    db: Session = Depends(get_session),
    current_user: User = Depends(get_editor_user)
):
    """작업 완료 시 성과 기록"""
    
    # 입력 데이터 유효성 검증
    validate_rating_score(performance_data.quality_score, "품질 점수")
    validate_rating_score(performance_data.supervisor_rating, "관리자 평가")
    validate_rating_score(performance_data.collaboration_rating, "협업 평가")
    validate_rating_score(performance_data.punctuality_rating, "일정 준수 평가")
    
    if performance_data.rework_hours < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="재작업 시간은 0 이상이어야 합니다."
        )
    
    try:
        tracking_service = ProductionTrackingService(db)
        performance_record = tracking_service.record_task_performance(
            task_id, 
            performance_data.model_dump()
        )
        
        logger.info(f"Recorded task performance for task {task_id} by user {current_user.id}")
        
        return {
            "message": "작업 성과가 성공적으로 기록되었습니다.",
            "record_id": performance_record.id,
            "task_id": task_id
        }
        
    except Exception as e:
        raise handle_service_error(e, "task performance recording")

@router.post("/record-performance/review/{task_id}")
async def record_review_performance(
    task_id: int = Path(..., gt=0, description="작업 ID"),
    performance_data: PerformanceRecordCreate = ...,
    db: Session = Depends(get_session),
    current_user: User = Depends(get_editor_user)
):
    """감수 작업 성과 기록"""
    
    # 필수 필드 검증
    if performance_data.actual_hours is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="감수 작업 시간은 필수 입력 항목입니다."
        )
    
    if performance_data.actual_hours < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="작업 시간은 0 이상이어야 합니다."
        )
    
    try:
        tracking_service = ProductionTrackingService(db)
        performance_record = tracking_service.record_review_performance(
            task_id, 
            performance_data.model_dump()
        )
        
        logger.info(f"Recorded review performance for task {task_id} by user {current_user.id}")
        
        return {
            "message": "감수 작업 성과가 성공적으로 기록되었습니다.",
            "record_id": performance_record.id,
            "task_id": task_id
        }
        
    except Exception as e:
        raise handle_service_error(e, "review performance recording")

@router.post("/record-performance/monitoring/{task_id}")
async def record_monitoring_performance(
    task_id: int = Path(..., gt=0, description="작업 ID"),
    performance_data: PerformanceRecordCreate = ...,
    db: Session = Depends(get_session),
    current_user: User = Depends(get_editor_user)
):
    """모니터링 작업 성과 기록"""
    
    # 필수 필드 검증
    if performance_data.actual_hours is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="모니터링 작업 시간은 필수 입력 항목입니다."
        )
    
    if performance_data.actual_hours < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="작업 시간은 0 이상이어야 합니다."
        )
    
    try:
        tracking_service = ProductionTrackingService(db)
        performance_record = tracking_service.record_monitoring_performance(
            task_id, 
            performance_data.model_dump()
        )
        
        logger.info(f"Recorded monitoring performance for task {task_id} by user {current_user.id}")
        
        return {
            "message": "모니터링 작업 성과가 성공적으로 기록되었습니다.",
            "record_id": performance_record.id,
            "task_id": task_id
        }
        
    except Exception as e:
        raise handle_service_error(e, "monitoring performance recording")

@router.get("/archives", response_model=ArchiveAnalyticsResponse)
async def get_archive_analytics(
    media_type_filter: Optional[str] = Query(None, description="미디어 타입 필터"),
    start_date: Optional[date] = Query(None, description="시작 날짜 (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="종료 날짜 (YYYY-MM-DD)"),
    db: Session = Depends(get_session),
    current_user: User = Depends(get_editor_user)
):
    """아카이브 분석 데이터"""
    
    # 입력 유효성 검증
    validate_media_type(media_type_filter)
    validate_date_range(start_date, end_date)
    
    try:
        archive_service = ProductionArchiveService(db)
        analytics_data = archive_service.get_archive_analytics(
            media_type_filter, start_date, end_date
        )
        
        # 서비스가 성공/실패 상태를 포함한 응답을 반환
        if not analytics_data.get('success', True):
            logger.info("No archive data found for the given filters")
            return ArchiveAnalyticsResponse(
                period={"start_date": start_date, "end_date": end_date}
            )
        
        # 안전한 데이터 변환
        # monthly_completion_trend를 dict에서 list로 변환
        monthly_trend_raw = analytics_data.get("monthly_completion_trend", {})
        monthly_completion_trend = []
        
        if isinstance(monthly_trend_raw, dict):
            # dict 형태인 경우 (서비스가 반환하는 형태)
            for month, count in sorted(monthly_trend_raw.items()):
                # count가 숫자인 경우
                if isinstance(count, (int, float)):
                    monthly_completion_trend.append(MonthlyTrend(
                        month=month,
                        count=int(count),
                        total_hours=0.0  # 서비스가 시간 정보를 제공하지 않으면 0으로 설정
                    ))
                # count가 dict인 경우 (count와 total_hours 포함)
                elif isinstance(count, dict):
                    monthly_completion_trend.append(MonthlyTrend(
                        month=month,
                        count=count.get('count', 0),
                        total_hours=float(count.get('total_hours', 0))
                    ))
        elif isinstance(monthly_trend_raw, list):
            # 이미 list 형태인 경우
            monthly_completion_trend = monthly_trend_raw
        
        safe_data = {
            "total_projects": safe_int_response(analytics_data.get("total_projects")),
            "total_hours": safe_float_response(analytics_data.get("total_hours")),
            "average_duration_days": safe_float_response(analytics_data.get("average_duration_days")),
            "average_efficiency": analytics_data.get("average_efficiency"),
            "average_quality": analytics_data.get("average_quality"),
            "media_type_analysis": analytics_data.get("media_type_analysis", {}),
            "speed_type_analysis": analytics_data.get("speed_type_analysis", {}),
            "monthly_completion_trend": monthly_completion_trend,
            "period": analytics_data.get("period", {"start_date": start_date, "end_date": end_date})
        }
        
        return ArchiveAnalyticsResponse.model_validate(safe_data)
        
    except Exception as e:
        raise handle_service_error(e, "archive analytics")

@router.get("/archives/list", response_model=ArchivePaginationResponse)
async def get_archived_projects(
    media_type_filter: Optional[str] = Query(None, description="미디어 타입 필터"),
    work_speed_filter: Optional[str] = Query(None, description="작업 속도 필터"),
    search: Optional[str] = Query(None, max_length=100, description="검색어 (영화 제목, 에셋명)"),
    sort_by: str = Query("completion_date", description="정렬 기준"),
    sort_order: str = Query("desc", regex="^(asc|desc)$", description="정렬 순서"),
    start_date: Optional[date] = Query(None, description="시작 날짜 (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="종료 날짜 (YYYY-MM-DD)"),
    limit: int = Query(20, ge=1, le=100, description="페이지당 항목 수"),
    offset: int = Query(0, ge=0, description="시작 위치"),
    db: Session = Depends(get_session),
    current_user: User = Depends(get_editor_user)
):
    """아카이브된 프로젝트 목록 조회 (페이징 개선)"""
    
    # 입력 유효성 검증
    validate_media_type(media_type_filter)
    validate_work_speed(work_speed_filter)
    validate_date_range(start_date, end_date)
    validate_pagination_params(limit, offset)
    
    # 정렬 필드 검증
    valid_sort_fields = ['completion_date', 'total_days', 'total_hours', 'overall_efficiency', 'average_quality']
    if sort_by not in valid_sort_fields:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"유효하지 않은 정렬 필드: {sort_by}"
        )
    
    try:
        archive_service = ProductionArchiveService(db)
        
        # 검색어 추가 지원
        filters = {
            "media_type": media_type_filter,
            "work_speed": work_speed_filter,
            "search": search,
            "start_date": start_date,
            "end_date": end_date
        }
        
        # 총 개수와 데이터를 분리해서 조회
        total_count = archive_service.get_archived_projects_count(**filters)
        
        archives = archive_service.get_archived_projects(
            **filters,
            sort_by=sort_by,
            sort_order=sort_order,
            limit=limit,
            offset=offset
        )
        
        # 스키마 객체로 변환
        archives_data = []
        for archive in archives:
            archive_item = ArchiveProjectResponse(
                id=archive.id,
                movie_title=archive.movie_title,
                media_type=archive.media_type,
                asset_name=archive.asset_name,
                work_speed_type=archive.work_speed_type,
                completion_date=archive.completion_date.isoformat() if archive.completion_date else None,
                total_days=safe_int_response(archive.total_days),
                total_hours=safe_float_response(archive.total_hours),
                overall_efficiency=archive.overall_efficiency,
                average_quality=archive.average_quality,
                project_success_rating=archive.project_success_rating
            )
            archives_data.append(archive_item)
        
        logger.info(f"Retrieved {len(archives)} archived projects for user {current_user.id}")
        
        # 페이지네이션 정보 생성
        pagination_info = PaginationInfo(
            limit=limit,
            offset=offset,
            total=total_count,
            has_next=offset + limit < total_count,
            has_prev=offset > 0,
            current_page=(offset // limit) + 1,
            total_pages=(total_count + limit - 1) // limit if limit > 0 else 0
        )
        
        return ArchivePaginationResponse(
            archives=archives_data,
            pagination=pagination_info
        )
        
    except Exception as e:
        raise handle_service_error(e, "archived projects listing")

@router.get("/archives/{archive_id}", response_model=ArchiveDetailResponse)
async def get_archive_detail(
    archive_id: int = Path(..., gt=0, description="아카이브 ID"),
    db: Session = Depends(get_session),
    current_user: User = Depends(get_editor_user)
):
    """특정 아카이브의 상세 정보"""
    
    try:
        archive_service = ProductionArchiveService(db)
        detail_data = archive_service.get_archive_detail(archive_id)
        
        if not detail_data.get('success', True):
            logger.info(f"Archive {archive_id} not found")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="해당 아카이브를 찾을 수 없습니다."
            )
        
        # 서비스가 반환한 데이터 구조 사용
        archive_info_data = detail_data.get("archive_info", {})
        archive_info = ArchiveInfo(
            movie_title=archive_info_data.get("movie_title", ""),
            media_type=archive_info_data.get("media_type", ""),
            asset_name=archive_info_data.get("asset_name", ""),
            work_speed_type=archive_info_data.get("work_speed_type", ""),
            start_date=archive_info_data.get("start_date", ""),
            completion_date=archive_info_data.get("completion_date", ""),
            total_days=safe_int_response(archive_info_data.get("total_days")),
            total_hours=safe_float_response(archive_info_data.get("total_hours"))
        )
        
        # 참여자 정보 변환
        participants_data = detail_data.get("participants", {})
        participants_info = ParticipantsInfo()
        
        # participants 구조가 {"total_count": N, "participants": [...]}인 경우
        if isinstance(participants_data, dict) and 'participants' in participants_data:
            participants_list = participants_data.get('participants', [])
            
            # 역할별로 분류
            for participant in participants_list:
                if not isinstance(participant, dict):
                    continue
                
                name = participant.get('name', '')
                role = participant.get('role', '')
                person_type = participant.get('person_type', '')
                is_primary = participant.get('is_primary', False)
                
                participant_obj = ParticipantInfo(
                    name=name,
                    role=role,
                    is_primary=is_primary
                )
                
                # 역할에 따라 적절한 필드에 할당
                if person_type == 'staff' and '프로듀서' in role:
                    if not participants_info.producer:
                        participants_info.producer = participant_obj
                    else:
                        participants_info.other_staff.append(participant_obj)
                elif person_type == 'scriptwriter':
                    if not participants_info.main_writer and is_primary:
                        participants_info.main_writer = participant_obj
                    else:
                        participants_info.reviewers.append(participant_obj)
                elif person_type == 'voice_artist':
                    participants_info.voice_artists.append(participant_obj)
                elif person_type == 'sl_interpreter':
                    participants_info.sl_interpreters.append(participant_obj)
                elif '감수' in role or '리뷰' in role:
                    participants_info.reviewers.append(participant_obj)
                elif '모니터' in role:
                    participants_info.monitors.append(participant_obj)
                else:
                    participants_info.other_staff.append(participant_obj)
        
        # 기존 구조 지원 (하위 호환성)
        elif isinstance(participants_data, dict):
            if participants_data.get("producer"):
                producer_data = participants_data["producer"]
                if isinstance(producer_data, dict):
                    participants_info.producer = ParticipantInfo(
                        name=producer_data.get("name", ""),
                        role=producer_data.get("role", "프로듀서"),
                        is_primary=producer_data.get("is_primary", True)
                    )
            
            if participants_data.get("main_writer"):
                writer_data = participants_data["main_writer"]
                if isinstance(writer_data, dict):
                    participants_info.main_writer = ParticipantInfo(
                        name=writer_data.get("name", ""),
                        role=writer_data.get("role", "해설작가"),
                        is_primary=writer_data.get("is_primary", True)
                    )
            
            # 리스트 필드 처리
            for field_name in ["reviewers", "monitors", "voice_artists", "sl_interpreters", "other_staff"]:
                if participants_data.get(field_name):
                    participant_list = []
                    field_data = participants_data[field_name]
                    if isinstance(field_data, list):
                        for p in field_data:
                            if isinstance(p, dict):
                                participant_list.append(ParticipantInfo(
                                    name=p.get("name", ""),
                                    role=p.get("role", ""),
                                    is_primary=p.get("is_primary", False)
                                ))
                    setattr(participants_info, field_name, participant_list)
        
        # stage_durations 처리
        stage_durations = detail_data.get("stage_durations", {})
        
        # 최종 응답 생성
        return ArchiveDetailResponse(
            archive_info=archive_info,
            participants=participants_info,
            stage_durations=stage_durations,
            duration_days=safe_int_response(detail_data.get("duration_days")),
            efficiency_rating=detail_data.get("efficiency_rating", "N/A"),
            quality_rating=detail_data.get("quality_rating", "N/A")
        )
        
    except Exception as e:
        raise handle_service_error(e, "archive detail")

@router.post("/archives/create/{project_id}")
async def create_project_archive(
    project_id: int = Path(..., gt=0, description="프로젝트 ID"),
    archive_data: ArchiveCreateRequest = ...,
    db: Session = Depends(get_session),
    current_user: User = Depends(get_editor_user)
):
    """완료된 프로젝트를 아카이브"""
    
    # 성공 평가 점수 유효성 검증
    if archive_data.project_success_rating is not None:
        try:
            ProjectSuccessRating(archive_data.project_success_rating)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="프로젝트 성공 평가는 1-5 사이의 값이어야 합니다."
            )
    
    # 비용 검증
    if archive_data.total_cost is not None and archive_data.total_cost < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="총 비용은 0 이상이어야 합니다."
        )
    
    try:
        archive_service = ProductionArchiveService(db)
        archive = archive_service.archive_completed_project(
            project_id, 
            archive_data.model_dump(),
            current_user.id
        )
        
        logger.info(f"Archived project {project_id} to archive {archive.id} by user {current_user.id}")
        
        return {
            "message": "프로젝트가 성공적으로 아카이브되었습니다.",
            "archive_id": archive.id,
            "project_id": project_id
        }
        
    except Exception as e:
        raise handle_service_error(e, "project archiving")

@router.post("/archives/compare")
async def compare_archives(
    request: CompareArchivesRequest,
    db: Session = Depends(get_session),
    current_user: User = Depends(get_editor_user)
):
    """여러 아카이브 비교 분석"""
    
    # ID 중복 검사
    if len(set(request.archive_ids)) != len(request.archive_ids):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="중복된 아카이브 ID가 있습니다."
        )
    
    try:
        archive_service = ProductionArchiveService(db)
        comparison_data = archive_service.compare_archives(request.archive_ids)
        
        if not comparison_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="비교할 아카이브 데이터를 찾을 수 없습니다."
            )
        
        logger.info(f"Compared {len(request.archive_ids)} archives for user {current_user.id}")
        
        return comparison_data
        
    except Exception as e:
        raise handle_service_error(e, "archive comparison")

@router.get("/staff-info/{project_id}")
async def get_project_staff_info(
    project_id: int = Path(..., gt=0, description="프로젝트 ID"),
    db: Session = Depends(get_session),
    current_user: User = Depends(get_editor_user)
):
    """프로젝트 참여 스태프 정보 조회"""
    
    try:
        tracking_service = ProductionTrackingService(db)
        staff_info = tracking_service.get_project_staff_info(project_id)
        
        if not staff_info:
            logger.info(f"No staff info found for project {project_id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="해당 프로젝트의 스태프 정보를 찾을 수 없습니다."
            )
        
        return staff_info
        
    except Exception as e:
        raise handle_service_error(e, "project staff info")

# ── 기간별 종합 대시보드 엔드포인트 ──────────────────────────────────────────

@router.get("/period-overview/default", response_model=PeriodOverviewResponse)
async def get_default_period_overview(
    db: Session = Depends(get_session),
    current_user: User = Depends(get_editor_user)
):
    """기본 기간(올해 1월 1일 ~ 오늘) 종합 대시보드 데이터"""
    
    # 올해 1월 1일부터 오늘까지
    start_date = date(date.today().year, 1, 1)
    end_date = date.today()
    
    logger.info(f"Default period overview requested: {start_date} to {end_date}")
    
    # 기존 엔드포인트 재사용
    return await get_period_overview(start_date, end_date, db, current_user)

@router.get("/period-overview", response_model=PeriodOverviewResponse)
async def get_period_overview(
    start_date: Optional[date] = Query(None, description="시작 날짜"),
    end_date: Optional[date] = Query(None, description="종료 날짜"),
    db: Session = Depends(get_session),
    current_user: User = Depends(get_editor_user)
):
    """기간별 종합 대시보드 데이터"""
    
    # 기본값 설정: 올해 1월 1일부터 오늘까지
    if not start_date:
        start_date = date(date.today().year, 1, 1)
    if not end_date:
        end_date = date.today()
    
    logger.info(f"Period overview requested with dates: {start_date} to {end_date}")
    
    # 입력 유효성 검증
    validate_date_range(start_date, end_date)
    
    try:
        archive_service = ProductionArchiveService(db)
        
        # 기본 통계 수집
        archives = archive_service.get_archived_projects(
            start_date=start_date,
            end_date=end_date,
            limit=1000
        )
        
        logger.info(f"Found {len(archives)} archives for period {start_date} to {end_date}")
        
        # 데이터가 없는 경우 빈 응답 반환
        if not archives:
            logger.warning(f"No archives found for period {start_date} to {end_date}")
            return PeriodOverviewResponse(
                summary=SummaryStats(
                    total_movies=0,
                    total_assets=0,
                    total_work_hours=0.0,
                    average_hours_per_asset=0.0,
                    average_days_per_asset=0.0,
                    completion_rate=0.0
                ),
                productivity_trend=ProductivityTrend(
                    trend='stable',
                    change_percentage=0.0
                ),
                bottleneck_analysis=[],
                daily_productivity=[],
                media_type_distribution=[],
                efficiency_by_speed=[]
            )
        
        # 요약 통계
        total_movies = len(set(a.movie_title for a in archives))
        total_assets = len(archives)
        total_hours = sum(float(a.total_hours or 0) for a in archives)
        avg_hours_per_asset = total_hours / total_assets if total_assets > 0 else 0
        avg_days_per_asset = sum(a.total_days for a in archives) / total_assets if total_assets > 0 else 0
        
        # 완료율 계산 - project_success_rating 기준
        # 성공적으로 완료된 프로젝트(rating 4 이상) 비율
        rated_projects = [a for a in archives if a.project_success_rating is not None]
        if rated_projects:
            successful_projects = sum(1 for a in rated_projects if a.project_success_rating >= 4)
            completion_rate = (successful_projects / len(rated_projects)) * 100
        else:
            # rating이 없으면 단순히 완료된 것으로 간주
            completion_rate = 100.0
        
        # 생산성 트렌드 계산
        # 이전 기간과 비교
        days_diff = (end_date - start_date).days
        prev_start = start_date - timedelta(days=days_diff)
        prev_end = start_date - timedelta(days=1)
        
        prev_archives = archive_service.get_archived_projects(
            start_date=prev_start,
            end_date=prev_end,
            limit=1000
        )
        
        # 디버깅을 위한 로깅
        logger.info(f"Current period archives count: {len(archives)}")
        logger.info(f"Previous period archives count: {len(prev_archives)}")
        
        current_productivity = total_assets / days_diff if days_diff > 0 else 0
        prev_productivity = len(prev_archives) / days_diff if days_diff > 0 else 0
        
        if prev_productivity > 0:
            change_percentage = ((current_productivity - prev_productivity) / prev_productivity) * 100
        else:
            change_percentage = 0
            
        trend = 'increasing' if change_percentage > 5 else 'decreasing' if change_percentage < -5 else 'stable'
        
        # 병목 구간 분석
        stage_delays = defaultdict(lambda: {'count': 0, 'total_delay': 0})
        
        # 디버깅 로그
        logger.info(f"Processing bottleneck analysis for {len(archives)} archives")
        
        for archive in archives:
            # stage_durations가 dict 타입인지 확인
            if archive.stage_durations and isinstance(archive.stage_durations, dict):
                durations = archive.stage_durations
                # 빈 dict이 아닌지 확인
                if durations:
                    # 숫자 값들만 필터링 (서비스는 '1', '2' 형식으로 저장)
                    valid_durations = {}
                    for stage, duration in durations.items():
                        try:
                            # stage_1 형식이든 1 형식이든 처리
                            stage_num = stage.replace('stage_', '') if 'stage_' in stage else stage
                            valid_durations[stage_num] = int(duration)
                        except (ValueError, TypeError):
                            logger.debug(f"Invalid duration value for stage {stage}: {duration}")
                    
                    if valid_durations:
                        avg_duration = sum(valid_durations.values()) / len(valid_durations)
                        
                        for stage_num, duration in valid_durations.items():
                            if duration > avg_duration * 1.2:  # 평균보다 20% 이상 소요
                                stage_delays[stage_num]['count'] += 1
                                stage_delays[stage_num]['total_delay'] += duration - avg_duration
                else:
                    logger.debug(f"Archive {archive.id} has empty stage_durations")
            else:
                logger.debug(f"Archive {archive.id} has no stage_durations data")
        
        total_bottlenecks = sum(d['count'] for d in stage_delays.values())
        
        bottleneck_analysis = []
        stage_names = {
            '1': '자료 준비 및 섭외',
            '2': '해설대본 작성',
            '3': '녹음/편집',
            '4': '선재 제작 및 배포'
        }
        
        for stage, data in stage_delays.items():
            if data['count'] > 0:
                bottleneck_analysis.append(BottleneckItem(
                    stage=stage,
                    stage_name=stage_names.get(stage, f'{stage}단계'),
                    frequency=round((data['count'] / total_bottlenecks * 100) if total_bottlenecks > 0 else 0, 1),
                    average_delay=round(data['total_delay'] / data['count'], 1)
                ))
        
        bottleneck_analysis.sort(key=lambda x: x.frequency, reverse=True)
        
        # 일별 생산성 데이터
        daily_productivity = []
        current = start_date
        
        # 날짜별로 아카이브 그룹화
        daily_archives = defaultdict(list)
        for archive in archives:
            if archive.completion_date:
                daily_archives[archive.completion_date].append(archive)
        
        while current <= end_date:
            day_archives = daily_archives.get(current, [])
            daily_productivity.append(DailyProductivity(
                date=current.isoformat(),
                completed_assets=len(day_archives),
                work_hours=sum(float(a.total_hours or 0) for a in day_archives)
            ))
            current += timedelta(days=1)
        
        # 미디어 타입별 분포
        media_type_stats = defaultdict(lambda: {'count': 0, 'total_hours': 0})
        
        logger.info(f"Processing media type distribution for {len(archives)} archives")
        
        for archive in archives:
            if archive.media_type:
                media_type_stats[archive.media_type]['count'] += 1
                media_type_stats[archive.media_type]['total_hours'] += float(archive.total_hours or 0)
        
        logger.info(f"Media type stats: {dict(media_type_stats)}")
        
        media_type_distribution = []
        for media_type, stats in media_type_stats.items():
            media_type_distribution.append(MediaTypeDistribution(
                type=media_type,
                name=get_media_type_name(media_type),
                count=stats['count'],
                percentage=(stats['count'] / total_assets * 100) if total_assets > 0 else 0,
                average_hours=stats['total_hours'] / stats['count'] if stats['count'] > 0 else 0
            ))
        
        # 작업 속도별 효율성
        speed_stats = defaultdict(lambda: {
            'count': 0, 
            'total_efficiency': 0,
            'efficiency_count': 0,
            'total_quality': 0,
            'quality_count': 0
        })
        
        for archive in archives:
            speed = archive.work_speed_type
            speed_stats[speed]['count'] += 1
            
            if archive.overall_efficiency is not None:
                speed_stats[speed]['total_efficiency'] += float(archive.overall_efficiency)
                speed_stats[speed]['efficiency_count'] += 1
                
            if archive.average_quality is not None:
                speed_stats[speed]['total_quality'] += float(archive.average_quality)
                speed_stats[speed]['quality_count'] += 1
        
        efficiency_by_speed = []
        speed_names = {
            'A': '빠름',
            'B': '보통', 
            'C': '여유'
        }
        
        for speed, stats in speed_stats.items():
            if stats['count'] > 0:
                avg_efficiency = stats['total_efficiency'] / stats['efficiency_count'] if stats['efficiency_count'] > 0 else 0
                avg_quality = stats['total_quality'] / stats['quality_count'] if stats['quality_count'] > 0 else 0
                
                efficiency_by_speed.append(EfficiencyBySpeed(
                    speed_type=speed,
                    speed_name=speed_names.get(speed, speed),
                    count=stats['count'],
                    average_efficiency=avg_efficiency,
                    average_quality=avg_quality
                ))
        
        response = PeriodOverviewResponse(
            summary=SummaryStats(
                total_movies=total_movies,
                total_assets=total_assets,
                total_work_hours=total_hours,
                average_hours_per_asset=avg_hours_per_asset,
                average_days_per_asset=avg_days_per_asset,
                completion_rate=completion_rate
            ),
            productivity_trend=ProductivityTrend(
                trend=trend,
                change_percentage=change_percentage
            ),
            bottleneck_analysis=bottleneck_analysis,
            daily_productivity=daily_productivity,
            media_type_distribution=media_type_distribution,
            efficiency_by_speed=efficiency_by_speed
        )
        
        # BaseSchema가 자동으로 camelCase 변환을 처리하므로 그냥 반환
        return response
        
    except Exception as e:
        raise handle_service_error(e, "period overview")

# ── 비교 분석 옵션 엔드포인트 ──────────────────────────────────────────

@router.get("/comparison-options", response_model=ComparisonOptionsResponse)
async def get_comparison_options(
    db: Session = Depends(get_session),
    current_user: User = Depends(get_editor_user)
):
    """비교 분석을 위한 선택 가능한 옵션들"""
    
    try:
        # 프로듀서 목록 - staff 테이블에서 프로듀서 역할 찾기
        stmt = select(AccessAssetCredit).where(
            and_(
                AccessAssetCredit.person_type == 'staff',
                AccessAssetCredit.role.contains('프로듀서')
            )
        ).distinct(AccessAssetCredit.staff_id)
        
        producers = db.exec(stmt).all()
        
        producer_list = []
        for credit in producers:
            if credit.staff:
                producer_list.append(ComparisonOption(
                    id=str(credit.staff_id),
                    name=credit.staff.name
                ))
        
        # 미디어 타입 목록
        media_types = [
            ComparisonOption(id=mt.value, name=get_media_type_name(mt.value))
            for mt in MediaType
        ]
        
        # 최근 프로젝트 목록
        stmt = select(Movie).order_by(Movie.created_at.desc()).limit(20)
        recent_projects = db.exec(stmt).all()
        
        project_list = [
            ComparisonOption(id=str(movie.id), name=movie.title)
            for movie in recent_projects
        ]
        
        return ComparisonOptionsResponse(
            producers=producer_list,
            media_types=media_types,
            projects=project_list
        )
        
    except Exception as e:
        raise handle_service_error(e, "comparison options")

# ── 비교 분석 데이터 엔드포인트 ──────────────────────────────────────────

@router.get("/comparison", response_model=ComparisonDataResponse)
async def get_comparison_data(
    type: str = Query(..., description="비교 유형 (period/producer/mediaType/project)"),
    start_date: date = Query(..., description="시작 날짜"),
    end_date: date = Query(..., description="종료 날짜"),
    producer_ids: Optional[str] = Query(None, description="프로듀서 ID 목록 (쉼표 구분)"),
    media_types: Optional[str] = Query(None, description="미디어 타입 목록 (쉼표 구분)"),
    project_ids: Optional[str] = Query(None, description="프로젝트 ID 목록 (쉼표 구분)"),
    db: Session = Depends(get_session),
    current_user: User = Depends(get_editor_user)
):
    """비교 분석 데이터"""
    
    # 입력 유효성 검증
    validate_date_range(start_date, end_date)
    
    try:
        archive_service = ProductionArchiveService(db)
        items = []
        
        if type == 'period':
            # 현재 기간
            current_archives = archive_service.get_archived_projects(
                start_date=start_date,
                end_date=end_date
            )
            
            # 이전 기간
            days_diff = (end_date - start_date).days
            prev_start = start_date - timedelta(days=days_diff)
            prev_end = start_date - timedelta(days=1)
            
            prev_archives = archive_service.get_archived_projects(
                start_date=prev_start,
                end_date=prev_end
            )
            
            # 기간별 통계 계산
            current_stats = calculate_period_stats(current_archives, '현재 기간')
            prev_stats = calculate_period_stats(prev_archives, '이전 기간')
            
            items = [
                ComparisonItem(**current_stats),
                ComparisonItem(**prev_stats)
            ]
            
        elif type == 'producer' and producer_ids:
            producer_id_list = [int(id) for id in producer_ids.split(',')]
            
            for producer_id in producer_id_list:
                # 더 효율적인 방법: 직접 프로듀서가 참여한 프로젝트 찾기
                # 1. 먼저 해당 프로듀서가 참여한 access_asset_id들을 찾기
                stmt = select(AccessAssetCredit.access_asset_id).where(
                    and_(
                        AccessAssetCredit.staff_id == producer_id,
                        AccessAssetCredit.person_type == 'staff',
                        AccessAssetCredit.role.contains('프로듀서')
                    )
                ).distinct()
                
                asset_ids = db.exec(stmt).all()
                
                if not asset_ids:
                    logger.warning(f"No access assets found for producer {producer_id}")
                    continue
                
                # 2. 해당 access_asset_id를 가진 아카이브 찾기
                stmt = select(ProductionArchive).where(
                    and_(
                        ProductionArchive.access_asset_id.in_(asset_ids),
                        ProductionArchive.completion_date >= start_date if start_date else True,
                        ProductionArchive.completion_date <= end_date if end_date else True
                    )
                )
                
                producer_archives = db.exec(stmt).all()
                
                # 추가 검증: participants에 실제로 해당 프로듀서가 있는지 확인
                verified_archives = []
                for archive in producer_archives:
                    if archive.participants and isinstance(archive.participants, dict):
                        participants_list = archive.participants.get('participants', [])
                        for p in participants_list:
                            if (isinstance(p, dict) and 
                                p.get('person_id') == producer_id and
                                p.get('person_type') == 'staff' and
                                '프로듀서' in p.get('role', '')):
                                verified_archives.append(archive)
                                break
                
                if verified_archives:
                    stats = calculate_producer_stats(verified_archives, producer_id, db)
                    items.append(ComparisonItem(**stats))
                else:
                    logger.info(f"No verified archives found for producer {producer_id}")
                    
        elif type == 'mediaType' and media_types:
            media_type_list = media_types.split(',')
            
            for media_type in media_type_list:
                media_archives = archive_service.get_archived_projects(
                    start_date=start_date,
                    end_date=end_date,
                    media_type=media_type
                )
                
                if media_archives:
                    stats = calculate_media_type_stats(media_archives, media_type)
                    items.append(ComparisonItem(**stats))
                    
        elif type == 'project' and project_ids:
            # 프로젝트별 비교는 추가 구현 필요
            pass
        
        # 메트릭 계산
        best_performer = ''
        worst_performer = ''
        
        if items:
            best = max(items, key=lambda x: x.efficiency)
            worst = min(items, key=lambda x: x.efficiency)
            best_performer = best.name
            worst_performer = worst.name
        
        return ComparisonDataResponse(
            type=type,
            items=items,
            metrics=ComparisonMetrics(
                best_performer=best_performer,
                worst_performer=worst_performer,
                average_improvement=calculate_average_improvement([item.model_dump() for item in items]),
                key_insights=generate_insights(type, [item.model_dump() for item in items])
            )
        )
        
    except Exception as e:
        raise handle_service_error(e, "comparison data")
