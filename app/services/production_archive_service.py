# app/services/production_archive_service.py
from sqlmodel import Session, select, func
from typing import List, Dict, Optional, Any
from datetime import date, datetime
from decimal import Decimal
from sqlalchemy import or_
from app.models.production_project import ProductionProject
from app.models.production_task import ProductionTask
from app.models.production_archives import ProductionArchive
from app.models.access_asset import AccessAsset
from app.models.access_asset_credit import AccessAssetCredit
from app.models.worker_performance_records import WorkerPerformanceRecord
from app.models.movies import Movie


class ProjectArchiveError(Exception):
    """프로젝트 아카이브 관련 예외"""
    pass


class DataValidationError(Exception):
    """데이터 검증 관련 예외"""
    pass


class ProductionArchiveService:
    
    def __init__(self, db: Session):
        self.db = db
    
    def archive_completed_project(self, project_id: int, completion_data: Dict[str, Any], archived_by_user_id: int) -> ProductionArchive:
        """완료된 프로젝트를 아카이브"""
        
        project = self.db.get(ProductionProject, project_id)
        if not project:
            raise ProjectArchiveError(f"Project with ID {project_id} not found")
        
        if project.project_status != "completed":
            raise ProjectArchiveError(f"Only completed projects can be archived. Current status: {project.project_status}")
        
        # 필수 데이터 검증
        if not project.actual_completion_date:
            raise DataValidationError("Project must have an actual completion date to be archived")
        
        if not project.start_date:
            raise DataValidationError("Project must have a start date to be archived")
        
        # 관련 데이터 수집 (최적화된 쿼리)
        access_asset = self.db.get(AccessAsset, project.access_asset_id)
        if not access_asset:
            raise DataValidationError(f"Access asset with ID {project.access_asset_id} not found")
        
        movie = self.db.get(Movie, access_asset.movie_id)
        if not movie:
            raise DataValidationError(f"Movie with ID {access_asset.movie_id} not found")
        
        # 참여자 정보 수집 (N+1 쿼리 방지)
        participants = self._collect_participants_info_optimized(project_id)
        
        # 성과 데이터 수집 (N+1 쿼리 방지)
        performance_summary = self._collect_performance_summary_optimized(project_id)
        
        # 단계별 소요 시간 계산 (N+1 쿼리 방지)
        stage_durations = self._calculate_stage_durations_optimized(project_id)
        
        # 총 소요 시간 계산
        total_days = (project.actual_completion_date - project.start_date).days
        
        # 데이터 타입 변환 (Decimal 처리)
        total_cost = None
        if completion_data.get('total_cost') is not None:
            total_cost = Decimal(str(completion_data['total_cost']))
        
        # 아카이브 생성 (JSON 필드는 dict 직접 저장)
        archive = ProductionArchive(
            original_project_id=project.id,
            access_asset_id=access_asset.id,
            movie_title=movie.title,
            media_type=access_asset.media_type,
            asset_name=access_asset.name,
            work_speed_type=project.work_speed_type,
            start_date=project.start_date,
            completion_date=project.actual_completion_date,
            total_days=total_days,
            total_hours=performance_summary.get('total_hours'),
            participants=participants,  # dict 직접 저장
            overall_efficiency=performance_summary.get('overall_efficiency'),
            average_quality=performance_summary.get('average_quality'),
            total_cost=total_cost,
            rework_percentage=performance_summary.get('rework_percentage'),
            stage_durations=stage_durations,  # dict 직접 저장
            project_success_rating=completion_data.get('project_success_rating'),
            lessons_learned=completion_data.get('lessons_learned'),
            completion_notes=completion_data.get('completion_notes'),
            archived_by=archived_by_user_id
        )
        
        self.db.add(archive)
        
        # 프로젝트 상태를 archived로 변경
        project.project_status = "archived"
        
        self.db.commit()
        self.db.refresh(archive)
        
        return archive
    
    def get_archived_projects_count(
        self,
        media_type: Optional[str] = None,
        work_speed: Optional[str] = None,
        search: Optional[str] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None
    ) -> int:
        """아카이브된 프로젝트 총 개수 조회"""
        
        query = select(func.count(ProductionArchive.id))
        
        if media_type:
            query = query.where(ProductionArchive.media_type == media_type)
        
        if work_speed:
            query = query.where(ProductionArchive.work_speed_type == work_speed)
        
        if search:
            # 영화 제목 또는 에셋명으로 검색
            search_pattern = f"%{search}%"
            query = query.where(
                or_(
                    ProductionArchive.movie_title.ilike(search_pattern),
                    ProductionArchive.asset_name.ilike(search_pattern)
                )
            )
        
        if start_date:
            query = query.where(ProductionArchive.completion_date >= start_date)
        
        if end_date:
            query = query.where(ProductionArchive.completion_date <= end_date)
        
        return self.db.exec(query).one()
    
    def get_archived_projects(
        self, 
        media_type: Optional[str] = None,
        work_speed: Optional[str] = None,
        search: Optional[str] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        sort_by: str = "completion_date",
        sort_order: str = "desc",
        limit: int = 50,
        offset: int = 0
    ) -> List[ProductionArchive]:
        """아카이브된 프로젝트 목록 조회"""
        
        query = select(ProductionArchive)
        
        if media_type:
            query = query.where(ProductionArchive.media_type == media_type)
        
        if work_speed:
            query = query.where(ProductionArchive.work_speed_type == work_speed)
        
        if search:
            # 영화 제목 또는 에셋명으로 검색
            search_pattern = f"%{search}%"
            query = query.where(
                or_(
                    ProductionArchive.movie_title.ilike(search_pattern),
                    ProductionArchive.asset_name.ilike(search_pattern)
                )
            )
        
        if start_date:
            query = query.where(ProductionArchive.completion_date >= start_date)
        
        if end_date:
            query = query.where(ProductionArchive.completion_date <= end_date)
        
        # 정렬
        sort_column = getattr(ProductionArchive, sort_by, ProductionArchive.completion_date)
        if sort_order == "desc":
            query = query.order_by(sort_column.desc())
        else:
            query = query.order_by(sort_column.asc())
        
        query = query.offset(offset).limit(limit)
        
        return self.db.exec(query).all()
    
    def get_archive_analytics(
        self,
        media_type_filter: Optional[str] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None
    ) -> Dict[str, Any]:
        """아카이브 분석 데이터"""
        
        query = select(ProductionArchive)
        
        if media_type_filter:
            query = query.where(ProductionArchive.media_type == media_type_filter)
        
        if start_date:
            query = query.where(ProductionArchive.completion_date >= start_date)
        
        if end_date:
            query = query.where(ProductionArchive.completion_date <= end_date)
        
        archives = self.db.exec(query).all()
        
        if not archives:
            return {
                "success": False,
                "message": "No archived projects found for the specified criteria",
                "total_projects": 0
            }
        
        # 전체 통계 계산 (0 값 포함, None 값만 제외)
        total_projects = len(archives)
        
        # 시간 통계 (0 시간도 포함)
        hours_values = [float(a.total_hours) for a in archives if a.total_hours is not None]
        total_hours = sum(hours_values) if hours_values else 0
        average_hours = sum(hours_values) / len(hours_values) if hours_values else None
        
        # 기간 통계
        average_duration = sum(a.total_days for a in archives) / total_projects
        
        # 효율성 통계 (0 효율성도 포함)
        efficiency_values = [float(a.overall_efficiency) for a in archives if a.overall_efficiency is not None]
        average_efficiency = sum(efficiency_values) / len(efficiency_values) if efficiency_values else None
        
        # 품질 통계 (0 품질도 포함)
        quality_values = [float(a.average_quality) for a in archives if a.average_quality is not None]
        average_quality = sum(quality_values) / len(quality_values) if quality_values else None
        
        # 미디어 유형별 분석
        media_type_stats = self._calculate_media_type_statistics(archives)
        
        # 작업 속도별 분석
        speed_type_stats = self._calculate_speed_type_statistics(archives)
        
        # 월별 완료 트렌드
        monthly_completion = self._calculate_monthly_completion_trend(archives)
        
        # 성공률 통계
        success_stats = self._calculate_success_statistics(archives)
        
        return {
            'success': True,
            'total_projects': total_projects,
            'total_hours': total_hours,
            'average_hours': average_hours,
            'average_duration_days': round(average_duration, 1),
            'average_efficiency': round(average_efficiency, 2) if average_efficiency else None,
            'average_quality': round(average_quality, 1) if average_quality else None,
            'success_statistics': success_stats,
            'media_type_analysis': media_type_stats,
            'speed_type_analysis': speed_type_stats,
            'monthly_completion_trend': monthly_completion,
            'data_quality': {
                'projects_with_hours': len(hours_values),
                'projects_with_efficiency': len(efficiency_values),
                'projects_with_quality': len(quality_values)
            },
            'period': {
                'start_date': start_date.isoformat() if start_date else None,
                'end_date': end_date.isoformat() if end_date else None
            }
        }
    
    def get_archive_detail(self, archive_id: int) -> Dict[str, Any]:
        """특정 아카이브의 상세 정보"""
        
        archive = self.db.get(ProductionArchive, archive_id)
        if not archive:
            raise ProjectArchiveError(f"Archive with ID {archive_id} not found")
        
        # JSON 데이터는 이미 dict로 저장되어 있음 (파싱 불필요)
        participants = archive.participants or {}
        stage_durations = archive.stage_durations or {}
        
        # calculated_metrics 내부의 속성들도 올바르게 접근
        calculated_metrics = {
            'duration_days': archive.total_days,
            'duration_weeks': archive.project_duration_weeks,
            'efficiency_rating': archive.efficiency_grade,
            'quality_rating': archive.quality_grade,
            'success_level': archive.success_level,
            'cost_per_hour': archive.cost_per_hour,
            'average_daily_hours': archive.average_daily_hours
        }
        
        return {
            'success': True,
            'archive_info': archive.to_float_dict(),  # Decimal → float 변환
            'participants': participants,
            'stage_durations': stage_durations,
            'duration_days': archive.total_days,
            'efficiency_rating': archive.efficiency_grade,
            'quality_rating': archive.quality_grade,
            'calculated_metrics': calculated_metrics
        }
    
    def compare_archives(self, archive_ids: List[int]) -> Dict[str, Any]:
        """여러 아카이브 비교 분석"""
        
        if len(archive_ids) < 2:
            raise DataValidationError("At least 2 archive IDs required for comparison")
        
        archives = []
        missing_ids = []
        
        for archive_id in archive_ids:
            archive = self.db.get(ProductionArchive, archive_id)
            if archive:
                archives.append(archive)
            else:
                missing_ids.append(archive_id)
        
        if len(archives) < 2:
            raise ProjectArchiveError(f"At least 2 valid archives required for comparison. Missing IDs: {missing_ids}")
        
        # 비교 메트릭 계산 (0 값 포함, None 값만 제외)
        duration_values = [a.total_days for a in archives]
        efficiency_values = [float(a.overall_efficiency) for a in archives if a.overall_efficiency is not None]
        quality_values = [float(a.average_quality) for a in archives if a.average_quality is not None]
        cost_values = [float(a.total_cost) for a in archives if a.total_cost is not None]
        
        comparison_data = {
            'success': True,
            'archives_count': len(archives),
            'missing_archive_ids': missing_ids,
            'comparison_metrics': {
                'duration': {
                    'values': duration_values,
                    'average': sum(duration_values) / len(duration_values),
                    'min': min(duration_values),
                    'max': max(duration_values),
                    'range': max(duration_values) - min(duration_values)
                } if duration_values else None,
                'efficiency': {
                    'values': efficiency_values,
                    'average': sum(efficiency_values) / len(efficiency_values) if efficiency_values else None,
                    'min': min(efficiency_values) if efficiency_values else None,
                    'max': max(efficiency_values) if efficiency_values else None,
                    'data_points': len(efficiency_values)
                },
                'quality': {
                    'values': quality_values,
                    'average': sum(quality_values) / len(quality_values) if quality_values else None,
                    'min': min(quality_values) if quality_values else None,
                    'max': max(quality_values) if quality_values else None,
                    'data_points': len(quality_values)
                },
                'cost': {
                    'values': cost_values,
                    'average': sum(cost_values) / len(cost_values) if cost_values else None,
                    'min': min(cost_values) if cost_values else None,
                    'max': max(cost_values) if cost_values else None,
                    'data_points': len(cost_values)
                }
            },
            'archives_details': [
                {
                    'id': a.id,
                    'movie_title': a.movie_title,
                    'media_type': a.media_type.value if hasattr(a.media_type, 'value') else a.media_type,
                    'work_speed_type': a.work_speed_type.value if hasattr(a.work_speed_type, 'value') else a.work_speed_type,
                    'total_days': a.total_days,
                    'overall_efficiency': float(a.overall_efficiency) if a.overall_efficiency is not None else None,
                    'average_quality': float(a.average_quality) if a.average_quality is not None else None,
                    'total_cost': float(a.total_cost) if a.total_cost is not None else None,
                    'efficiency_grade': a.efficiency_grade,
                    'quality_grade': a.quality_grade
                }
                for a in archives
            ]
        }
        
        return comparison_data
    
    def _collect_participants_info_optimized(self, project_id: int) -> Dict[str, Any]:
        """프로젝트 참여자 정보 수집 (최적화된 쿼리)"""
        
        # 한 번의 쿼리로 필요한 모든 데이터 조회
        query = select(AccessAssetCredit, ProductionProject, AccessAsset).join(
            ProductionProject, AccessAssetCredit.access_asset_id == ProductionProject.access_asset_id
        ).join(
            AccessAsset, AccessAssetCredit.access_asset_id == AccessAsset.id
        ).where(ProductionProject.id == project_id)
        
        results = self.db.exec(query).all()
        
        participants = []
        for credit, project, asset in results:
            person_name = self._get_person_name_from_credit(credit)
            
            # 실제 person_id 추출
            actual_person_id = None
            if credit.person_type == 'scriptwriter' and credit.scriptwriter_id:
                actual_person_id = credit.scriptwriter_id
            elif credit.person_type == 'voice_artist' and credit.voice_artist_id:
                actual_person_id = credit.voice_artist_id
            elif credit.person_type == 'sl_interpreter' and credit.sl_interpreter_id:
                actual_person_id = credit.sl_interpreter_id
            elif credit.person_type == 'staff' and credit.staff_id:
                actual_person_id = credit.staff_id
            
            participants.append({
                'credit_id': credit.id,  # 크레디트 ID 추가
                'person_id': actual_person_id,  # 실제 person ID
                'person_type': credit.person_type,
                'name': person_name,  # 스냅샷 용도로 이름 유지
                'role': credit.role,
                'is_primary': credit.is_primary,
                'sequence_number': credit.sequence_number  # 순서 정보도 유용
            })
        
        return {
            'total_count': len(participants),
            'participants': participants
        }
    
    def _collect_performance_summary_optimized(self, project_id: int) -> Dict[str, Any]:
        """프로젝트 성과 요약 수집 (최적화된 쿼리)"""
        
        # 한 번의 쿼리로 모든 성과 기록 조회
        query = select(WorkerPerformanceRecord).join(
            ProductionTask, WorkerPerformanceRecord.production_task_id == ProductionTask.id
        ).where(ProductionTask.production_project_id == project_id)
        
        all_records = self.db.exec(query).all()
        
        if not all_records:
            return {
                'total_hours': Decimal('0'),
                'overall_efficiency': None,
                'average_quality': None,
                'rework_percentage': Decimal('0')
            }
        
        # 성과 계산 (0 값 포함, None 값만 제외)
        planned_hours_values = [r.planned_hours for r in all_records if r.planned_hours is not None]
        actual_hours_values = [r.actual_hours for r in all_records if r.actual_hours is not None]
        quality_values = [r.quality_score for r in all_records if r.quality_score is not None]
        rework_hours_values = [r.rework_hours for r in all_records if r.rework_hours is not None]
        
        total_planned_hours = sum(planned_hours_values) if planned_hours_values else Decimal('0')
        total_actual_hours = sum(actual_hours_values) if actual_hours_values else Decimal('0')
        total_rework_hours = sum(rework_hours_values) if rework_hours_values else Decimal('0')
        
        # 효율성 계산 (planned/actual)
        overall_efficiency = None
        if total_actual_hours > 0:
            overall_efficiency = total_planned_hours / total_actual_hours
        
        # 평균 품질 계산
        average_quality = None
        if quality_values:
            average_quality = Decimal(str(sum(quality_values) / len(quality_values)))
        
        # 재작업 비율 계산
        rework_percentage = Decimal('0')
        if total_actual_hours > 0:
            rework_percentage = (total_rework_hours / total_actual_hours) * 100
        
        return {
            'total_hours': total_actual_hours,
            'overall_efficiency': overall_efficiency,
            'average_quality': average_quality,
            'rework_percentage': rework_percentage
        }
    
    def _calculate_stage_durations_optimized(self, project_id: int) -> Dict[str, int]:
        """단계별 소요 기간 계산 (최적화된 쿼리)"""
        
        # 한 번의 쿼리로 모든 작업 조회
        tasks = self.db.exec(
            select(ProductionTask).where(ProductionTask.production_project_id == project_id)
        ).all()
        
        stage_durations = {}
        for stage in range(1, 5):
            stage_tasks = [t for t in tasks if t.stage_number == stage]
            
            if stage_tasks:
                # 유효한 날짜가 있는 작업들만 필터링
                valid_tasks = [
                    t for t in stage_tasks 
                    if t.actual_start_date and t.actual_end_date
                ]
                
                if valid_tasks:
                    stage_start_dates = [t.actual_start_date for t in valid_tasks]
                    stage_end_dates = [t.actual_end_date for t in valid_tasks]
                    
                    stage_start = min(stage_start_dates)
                    stage_end = max(stage_end_dates)
                    
                    # datetime 객체인 경우 date()로 변환
                    if isinstance(stage_start, datetime):
                        stage_start = stage_start.date()
                    if isinstance(stage_end, datetime):
                        stage_end = stage_end.date()
                    
                    duration_days = (stage_end - stage_start).days
                    stage_durations[f'{stage}'] = max(0, duration_days)  # 'stage_' 제거
                else:
                    stage_durations[f'{stage}'] = 0
            else:
                stage_durations[f'{stage}'] = 0
        
        return stage_durations
    
    def _calculate_media_type_statistics(self, archives: List[ProductionArchive]) -> Dict[str, Any]:
        """미디어 유형별 통계 계산"""
        
        media_type_stats = {}
        for archive in archives:
            media_type = archive.media_type.value if hasattr(archive.media_type, 'value') else archive.media_type
            
            if media_type not in media_type_stats:
                media_type_stats[media_type] = {
                    'count': 0,
                    'total_hours': 0,
                    'total_days': 0,
                    'efficiency_scores': [],
                    'quality_scores': [],
                    'cost_values': []
                }
            
            stats = media_type_stats[media_type]
            stats['count'] += 1
            stats['total_days'] += archive.total_days
            
            if archive.total_hours is not None:
                stats['total_hours'] += float(archive.total_hours)
            
            if archive.overall_efficiency is not None:
                stats['efficiency_scores'].append(float(archive.overall_efficiency))
            
            if archive.average_quality is not None:
                stats['quality_scores'].append(float(archive.average_quality))
            
            if archive.total_cost is not None:
                stats['cost_values'].append(float(archive.total_cost))
        
        # 각 미디어 유형별 평균 계산
        for media_type, stats in media_type_stats.items():
            stats['average_duration'] = stats['total_days'] / stats['count'] if stats['count'] > 0 else 0
            stats['average_hours'] = stats['total_hours'] / stats['count'] if stats['count'] > 0 else 0
            stats['average_efficiency'] = sum(stats['efficiency_scores']) / len(stats['efficiency_scores']) if stats['efficiency_scores'] else None
            stats['average_quality'] = sum(stats['quality_scores']) / len(stats['quality_scores']) if stats['quality_scores'] else None
            stats['average_cost'] = sum(stats['cost_values']) / len(stats['cost_values']) if stats['cost_values'] else None
            
            # 임시 배열 제거
            del stats['efficiency_scores']
            del stats['quality_scores']
            del stats['cost_values']
        
        return media_type_stats
    
    def _calculate_speed_type_statistics(self, archives: List[ProductionArchive]) -> Dict[str, Any]:
        """작업 속도별 통계 계산"""
        
        speed_type_stats = {}
        for archive in archives:
            speed_type = archive.work_speed_type.value if hasattr(archive.work_speed_type, 'value') else archive.work_speed_type
            
            if speed_type not in speed_type_stats:
                speed_type_stats[speed_type] = {
                    'count': 0,
                    'total_days': 0,
                    'efficiency_values': [],
                    'quality_values': []
                }
            
            stats = speed_type_stats[speed_type]
            stats['count'] += 1
            stats['total_days'] += archive.total_days
            
            if archive.overall_efficiency is not None:
                stats['efficiency_values'].append(float(archive.overall_efficiency))
            
            if archive.average_quality is not None:
                stats['quality_values'].append(float(archive.average_quality))
        
        # 속도별 평균 계산
        for speed_type, stats in speed_type_stats.items():
            stats['average_duration'] = stats['total_days'] / stats['count'] if stats['count'] > 0 else 0
            stats['average_efficiency'] = sum(stats['efficiency_values']) / len(stats['efficiency_values']) if stats['efficiency_values'] else None
            stats['average_quality'] = sum(stats['quality_values']) / len(stats['quality_values']) if stats['quality_values'] else None
            
            # 임시 배열 제거
            del stats['efficiency_values']
            del stats['quality_values']
        
        return speed_type_stats
    
    def _calculate_monthly_completion_trend(self, archives: List[ProductionArchive]) -> Dict[str, int]:
        """월별 완료 트렌드 계산"""
        
        monthly_completion = {}
        for archive in archives:
            month_key = archive.completion_date.strftime('%Y-%m')
            monthly_completion[month_key] = monthly_completion.get(month_key, 0) + 1
        
        # 날짜순 정렬
        return dict(sorted(monthly_completion.items()))
    
    def _calculate_success_statistics(self, archives: List[ProductionArchive]) -> Dict[str, Any]:
        """성공률 통계 계산"""
        
        success_ratings = [a.project_success_rating for a in archives if a.project_success_rating is not None]
        
        if not success_ratings:
            return {
                'total_rated_projects': 0,
                'average_success_rating': None,
                'success_distribution': {}
            }
        
        # 성공률 분포 계산
        success_distribution = {}
        for rating in range(1, 6):
            count = success_ratings.count(rating)
            success_distribution[f'rating_{rating}'] = {
                'count': count,
                'percentage': (count / len(success_ratings)) * 100
            }
        
        return {
            'total_rated_projects': len(success_ratings),
            'average_success_rating': sum(success_ratings) / len(success_ratings),
            'success_distribution': success_distribution,
            'high_success_rate': len([r for r in success_ratings if r >= 4]) / len(success_ratings) * 100
        }
    
    def _get_person_name_from_credit(self, credit: AccessAssetCredit) -> str:
        """크레디트에서 실제 인물 이름 추출"""
        if credit.person_type == 'scriptwriter' and credit.scriptwriter:
            return credit.scriptwriter.name
        elif credit.person_type == 'voice_artist' and credit.voice_artist:
            return credit.voice_artist.voiceartist_name
        elif credit.person_type == 'sl_interpreter' and credit.sl_interpreter:
            return credit.sl_interpreter.name
        elif credit.person_type == 'staff' and credit.staff:
            return credit.staff.name
        return 'Unknown'
