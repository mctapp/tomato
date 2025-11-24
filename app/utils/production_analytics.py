# app/utils/production_analytics.py
from typing import Any, Optional, List, Dict
from datetime import date
from fastapi import HTTPException, status
from sqlmodel import Session
import logging
from app.models.staff import Staff
from app.models.enums import Rating, MediaType, WorkSpeedType, ProjectSuccessRating

# 로깅 설정
logger = logging.getLogger(__name__)

# ── 유틸리티 함수 ────────────────────────────────────────────────────────

def safe_float_response(value: Any) -> float:
    """안전한 float 응답값 처리"""
    if value is None or value == "":
        return 0.0
    try:
        return float(value)
    except (ValueError, TypeError):
        logger.warning(f"Cannot convert {value} to float, returning 0.0")
        return 0.0

def safe_int_response(value: Any) -> int:
    """안전한 int 응답값 처리"""
    if value is None or value == "":
        return 0
    try:
        return int(value)
    except (ValueError, TypeError):
        logger.warning(f"Cannot convert {value} to int, returning 0")
        return 0

def validate_date_range(start_date: Optional[date], end_date: Optional[date]) -> None:
    """날짜 범위 유효성 검증"""
    if start_date and end_date and start_date > end_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="시작 날짜는 종료 날짜보다 이전이어야 합니다."
        )
    
    # 미래 날짜 체크
    today = date.today()
    if end_date and end_date > today:
        logger.warning(f"End date {end_date} is in the future")

def validate_pagination_params(limit: int, offset: int) -> None:
    """페이징 파라미터 유효성 검증"""
    if limit <= 0 or limit > 100:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="limit은 1-100 사이의 값이어야 합니다."
        )
    if offset < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="offset은 0 이상의 값이어야 합니다."
        )
    if offset > 10000:  # 너무 큰 offset 방지
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="offset이 너무 큽니다. 다른 검색 조건을 사용해주세요."
        )

def validate_rating_score(score: Optional[int], field_name: str) -> None:
    """평점 유효성 검증 (Enum 사용)"""
    if score is not None:
        try:
            Rating(score)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"{field_name}는 1-5 사이의 값이어야 합니다."
            )

def validate_media_type(media_type: Optional[str]) -> None:
    """미디어 타입 유효성 검증 (Enum 사용)"""
    if media_type:
        try:
            MediaType(media_type)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"유효하지 않은 미디어 타입: {media_type}"
            )

def validate_work_speed(work_speed: Optional[str]) -> None:
    """작업 속도 유효성 검증 (Enum 사용)"""
    if work_speed:
        try:
            WorkSpeedType(work_speed)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"유효하지 않은 작업 속도: {work_speed}"
            )

def handle_service_error(error: Exception, operation: str) -> HTTPException:
    """서비스 에러를 안전하게 처리"""
    logger.error(f"Error in {operation}: {str(error)}", exc_info=True)
    
    if isinstance(error, HTTPException):
        raise error
    elif isinstance(error, ValueError):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error)
        )
    elif isinstance(error, KeyError):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="요청한 데이터를 찾을 수 없습니다."
        )
    else:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="서버에서 오류가 발생했습니다. 잠시 후 다시 시도해주세요."
        )

# ── 헬퍼 함수들 ──────────────────────────────────────────────────────

def calculate_period_stats(archives: List[Any], period_name: str) -> Dict[str, Any]:
    """기간별 통계 계산"""
    total_assets = len(archives)
    total_hours = sum(float(a.total_hours or 0) for a in archives)
    
    # 효율성이 있는 항목들만 계산
    efficiency_values = [float(a.overall_efficiency) for a in archives if a.overall_efficiency is not None]
    avg_efficiency = sum(efficiency_values) / len(efficiency_values) if efficiency_values else 0
    
    # 품질이 있는 항목들만 계산
    quality_values = [float(a.average_quality) for a in archives if a.average_quality is not None]
    avg_quality = sum(quality_values) / len(quality_values) if quality_values else 0
    
    # 성공률 계산 (success_rating 4이상인 비율)
    success_ratings = [a.project_success_rating for a in archives if a.project_success_rating is not None]
    if success_ratings:
        high_success_count = sum(1 for rating in success_ratings if rating >= 4)
        completion_rate = (high_success_count / len(success_ratings)) * 100
    else:
        completion_rate = 0.0
    
    return {
        'id': period_name.lower().replace(' ', '_'),
        'name': period_name,
        'total_assets': total_assets,
        'total_hours': total_hours,
        'average_hours': total_hours / total_assets if total_assets > 0 else 0,
        'efficiency': avg_efficiency,
        'quality': avg_quality,
        'completion_rate': completion_rate
    }

def calculate_producer_stats(archives: List[Any], producer_id: int, db: Session) -> Dict[str, Any]:
    """프로듀서별 통계 계산"""
    # 프로듀서 이름 조회
    producer = db.get(Staff, producer_id)
    producer_name = producer.name if producer else f"Producer {producer_id}"
    
    total_assets = len(archives)
    total_hours = sum(float(a.total_hours or 0) for a in archives)
    
    # 효율성이 있는 항목들만 계산
    efficiency_values = [float(a.overall_efficiency) for a in archives if a.overall_efficiency is not None]
    avg_efficiency = sum(efficiency_values) / len(efficiency_values) if efficiency_values else 0
    
    # 품질이 있는 항목들만 계산
    quality_values = [float(a.average_quality) for a in archives if a.average_quality is not None]
    avg_quality = sum(quality_values) / len(quality_values) if quality_values else 0
    
    # 성공률 계산 (success_rating 4이상인 비율)
    success_ratings = [a.project_success_rating for a in archives if a.project_success_rating is not None]
    if success_ratings:
        high_success_count = sum(1 for rating in success_ratings if rating >= 4)
        completion_rate = (high_success_count / len(success_ratings)) * 100
    else:
        completion_rate = 0.0
    
    return {
        'id': str(producer_id),
        'name': producer_name,
        'total_assets': total_assets,
        'total_hours': total_hours,
        'average_hours': total_hours / total_assets if total_assets > 0 else 0,
        'efficiency': avg_efficiency,
        'quality': avg_quality,
        'completion_rate': completion_rate
    }

def calculate_media_type_stats(archives: List[Any], media_type: str) -> Dict[str, Any]:
    """미디어 타입별 통계 계산"""
    total_assets = len(archives)
    total_hours = sum(float(a.total_hours or 0) for a in archives)
    
    # 효율성이 있는 항목들만 계산
    efficiency_values = [float(a.overall_efficiency) for a in archives if a.overall_efficiency is not None]
    avg_efficiency = sum(efficiency_values) / len(efficiency_values) if efficiency_values else 0
    
    # 품질이 있는 항목들만 계산
    quality_values = [float(a.average_quality) for a in archives if a.average_quality is not None]
    avg_quality = sum(quality_values) / len(quality_values) if quality_values else 0
    
    # 성공률 계산 (success_rating 4이상인 비율)
    success_ratings = [a.project_success_rating for a in archives if a.project_success_rating is not None]
    if success_ratings:
        high_success_count = sum(1 for rating in success_ratings if rating >= 4)
        completion_rate = (high_success_count / len(success_ratings)) * 100
    else:
        completion_rate = 0.0
    
    return {
        'id': media_type,
        'name': get_media_type_name(media_type),
        'total_assets': total_assets,
        'total_hours': total_hours,
        'average_hours': total_hours / total_assets if total_assets > 0 else 0,
        'efficiency': avg_efficiency,
        'quality': avg_quality,
        'completion_rate': completion_rate
    }

def get_producer_ids_from_archive(archive: Any) -> List[int]:
    """아카이브에서 프로듀서 ID 목록 추출"""
    producer_ids = []
    
    if hasattr(archive, 'participants') and isinstance(archive.participants, dict):
        # participants 구조: {"participants": [{"person_type": "staff", "role": "프로듀서", ...}]}
        participants_list = archive.participants.get('participants', [])
        if isinstance(participants_list, list):
            for participant in participants_list:
                if (isinstance(participant, dict) and 
                    participant.get('person_type') == 'staff' and 
                    '프로듀서' in participant.get('role', '')):
                    # 참여자 정보에서 staff_id 추출 시도
                    # 실제 구조에 따라 조정 필요
                    producer_ids.append(participant.get('person_id', 0))
    
    return producer_ids

def calculate_average_improvement(items: List[Dict[str, Any]]) -> float:
    """평균 개선율 계산"""
    if len(items) < 2:
        return 0.0
    
    # 시간순으로 정렬 (ID에 기간 정보가 있다고 가정)
    sorted_items = sorted(items, key=lambda x: x.get('id', ''))
    
    improvements = []
    for i in range(1, len(sorted_items)):
        prev = sorted_items[i-1]
        curr = sorted_items[i]
        
        # 효율성 개선율
        if prev.get('efficiency', 0) > 0:
            efficiency_improvement = ((curr.get('efficiency', 0) - prev.get('efficiency', 0)) / prev.get('efficiency', 0)) * 100
            improvements.append(efficiency_improvement)
        
        # 품질 개선율
        if prev.get('quality', 0) > 0:
            quality_improvement = ((curr.get('quality', 0) - prev.get('quality', 0)) / prev.get('quality', 0)) * 100
            improvements.append(quality_improvement)
        
        # 생산성 개선율 (시간당 처리량)
        if prev.get('average_hours', 0) > 0 and curr.get('average_hours', 0) > 0:
            productivity_improvement = ((prev.get('average_hours', 0) - curr.get('average_hours', 0)) / prev.get('average_hours', 0)) * 100
            improvements.append(productivity_improvement)
    
    return sum(improvements) / len(improvements) if improvements else 0.0

def generate_insights(comparison_type: str, items: List[Dict[str, Any]]) -> List[str]:
    """비교 분석 인사이트 생성"""
    insights = []
    
    if not items:
        return insights
    
    # 효율성 분석
    efficiencies = [(item.get('name', ''), item.get('efficiency', 0)) for item in items]
    if efficiencies:
        best = max(efficiencies, key=lambda x: x[1])
        worst = min(efficiencies, key=lambda x: x[1])
        if best[1] > 0:
            insights.append(f"{best[0]}의 효율성이 {best[1]:.1f}로 가장 높습니다")
        if worst[1] < best[1] * 0.8:  # 20% 이상 차이날 때
            insights.append(f"{worst[0]}의 효율성은 {worst[1]:.1f}로 개선이 필요합니다")
    
    # 품질 분석
    qualities = [(item.get('name', ''), item.get('quality', 0)) for item in items if item.get('quality', 0) > 0]
    if qualities:
        avg_quality = sum(q[1] for q in qualities) / len(qualities)
        if avg_quality > 4.0:
            insights.append(f"전반적으로 높은 품질 수준(평균 {avg_quality:.1f})을 유지하고 있습니다")
        elif avg_quality < 3.0:
            insights.append(f"전체 평균 품질({avg_quality:.1f})이 낮아 품질 관리가 필요합니다")
    
    # 생산성 분석
    if comparison_type == 'period' and len(items) >= 2:
        sorted_items = sorted(items, key=lambda x: x.get('id', ''))
        if len(sorted_items) >= 2:
            prev = sorted_items[-2]
            curr = sorted_items[-1]
            
            # 제작 수 변화
            if prev['total_assets'] > 0:
                asset_change = ((curr['total_assets'] - prev['total_assets']) / prev['total_assets']) * 100
                if abs(asset_change) > 10:
                    if asset_change > 0:
                        insights.append(f"제작 미디어 수가 {asset_change:.1f}% 증가했습니다")
                    else:
                        insights.append(f"제작 미디어 수가 {abs(asset_change):.1f}% 감소했습니다")
            
            # 효율성 변화
            if prev.get('efficiency', 0) > 0 and curr.get('efficiency', 0) > 0:
                eff_change = ((curr['efficiency'] - prev['efficiency']) / prev['efficiency']) * 100
                if abs(eff_change) > 5:
                    if eff_change > 0:
                        insights.append(f"작업 효율성이 {eff_change:.1f}% 향상되었습니다")
                    else:
                        insights.append(f"작업 효율성이 {abs(eff_change):.1f}% 하락했습니다")
    
    # 미디어 타입별 분석
    elif comparison_type == 'mediaType':
        # 작업 시간 분석
        avg_hours = [(item.get('name', ''), item.get('average_hours', 0)) for item in items if item.get('average_hours', 0) > 0]
        if avg_hours:
            fastest = min(avg_hours, key=lambda x: x[1])
            slowest = max(avg_hours, key=lambda x: x[1])
            if slowest[1] > fastest[1] * 1.5:  # 50% 이상 차이
                insights.append(f"{fastest[0]}가 평균 {fastest[1]:.1f}시간으로 가장 빠르게 제작됩니다")
                insights.append(f"{slowest[0]}는 평균 {slowest[1]:.1f}시간이 소요되어 개선 여지가 있습니다")
    
    # 성공률 분석
    completion_rates = [(item.get('name', ''), item.get('completion_rate', 0)) for item in items if item.get('completion_rate', 0) > 0]
    if completion_rates:
        avg_completion = sum(c[1] for c in completion_rates) / len(completion_rates)
        if avg_completion > 80:
            insights.append(f"평균 성공률이 {avg_completion:.1f}%로 우수합니다")
        elif avg_completion < 60:
            insights.append(f"평균 성공률이 {avg_completion:.1f}%로 개선이 필요합니다")
    
    return insights if insights else ["비교 분석을 위한 충분한 데이터가 없습니다"]

def get_media_type_name(media_type: str) -> str:
    """미디어 타입 표시명 반환"""
    type_names = {
        'AD': '음성해설',
        'CC': '자막해설',
        'SL': '수어해설',
        'AI': '음성소개',
        'CI': '자막소개',
        'SI': '수어소개',
        'AR': '음성리뷰',
        'CR': '자막리뷰',
        'SR': '수어리뷰'
    }
    return type_names.get(media_type, media_type)
