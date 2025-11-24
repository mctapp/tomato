# app/services/production_tracking_service.py
from sqlmodel import Session, select, func
from typing import List, Dict, Optional, Any, Tuple
from datetime import datetime, date, timedelta
from contextlib import contextmanager
from app.models.production_project import ProductionProject
from app.models.production_task import ProductionTask
from app.models.access_asset import AccessAsset
from app.models.access_asset_credit import AccessAssetCredit
from app.models.worker_performance_records import WorkerPerformanceRecord
from app.models.movies import Movie

class ProductionTrackingService:
    
    def __init__(self, db: Session):
        self.db = db
    
    @contextmanager
    def _safe_session(self):
        """안전한 세션 관리를 위한 컨텍스트 매니저"""
        try:
            yield self.db
        except Exception as e:
            self.db.rollback()
            raise e
        finally:
            # 세션은 의존성에서 관리되므로 여기서는 롤백만 처리
            pass
    
    def get_project_staff_info(self, project_id: int) -> Dict[str, Any]:
        """프로젝트 참여 스태프 정보 추출 - N+1 쿼리 해결"""
        
        with self._safe_session() as session:
            # 한 번의 쿼리로 필요한 모든 데이터 조회
            project_query = (
                select(ProductionProject, AccessAsset)
                .join(AccessAsset, ProductionProject.access_asset_id == AccessAsset.id)
                .where(ProductionProject.id == project_id)
            )
            
            project_result = session.exec(project_query).first()
            if not project_result:
                return {}
            
            project, access_asset = project_result
            
            # 크레디트 정보 한 번에 조회 (관련 테이블 join)
            credits_query = (
                select(AccessAssetCredit)
                .where(AccessAssetCredit.access_asset_id == access_asset.id)
            )
            credits = session.exec(credits_query).all()
            
            staff_info = {
                'main_writer': None,
                'producer': None,
                'reviewers': [],
                'monitors': [],
                'voice_artists': [],
                'other_staff': []
            }
            
            for credit in credits:
                person_name = self._get_person_name_from_credit(credit)
                
                # Unknown 이름 필터링
                if person_name == 'Unknown':
                    continue
                
                if credit.person_type == 'scriptwriter':
                    staff_info['main_writer'] = {
                        'name': person_name,
                        'role': credit.role,
                        'is_primary': credit.is_primary
                    }
                elif credit.person_type == 'voice_artist':
                    staff_info['voice_artists'].append({
                        'name': person_name,
                        'role': credit.role
                    })
                elif credit.person_type == 'staff':
                    role_lower = credit.role.lower() if credit.role else ''
                    if '감수' in credit.role or 'review' in role_lower:
                        staff_info['reviewers'].append({
                            'name': person_name,
                            'role': credit.role
                        })
                    elif '모니터링' in credit.role or 'monitor' in role_lower:
                        staff_info['monitors'].append({
                            'name': person_name,
                            'role': credit.role
                        })
                    elif '프로듀서' in credit.role or 'producer' in role_lower:
                        staff_info['producer'] = {
                            'name': person_name,
                            'role': credit.role
                        }
                    else:
                        staff_info['other_staff'].append({
                            'name': person_name,
                            'role': credit.role
                        })
            
            return staff_info
    
    def record_task_performance(self, task_id: int, performance_data: Dict[str, Any]) -> WorkerPerformanceRecord:
        """작업 완료 시 성과 기록 - 개선된 에러 처리"""
        
        with self._safe_session() as session:
            task = session.get(ProductionTask, task_id)
            if not task:
                raise ValueError(f"Task with id {task_id} not found")
            
            # 담당자 크레디트 정보 가져오기
            credit = None
            if task.assigned_credit_id:
                credit = session.get(AccessAssetCredit, task.assigned_credit_id)
            
            if not credit:
                raise ValueError(f"Assigned credit not found for task {task_id}")
            
            # 효율성 계산 - 0으로 나누기 방지
            efficiency_ratio = None
            if task.planned_hours is not None and task.actual_hours is not None and task.actual_hours > 0:
                efficiency_ratio = task.planned_hours / task.actual_hours
            
            # 일정 차이 계산 - 안전한 날짜 처리
            days_variance = None
            if task.planned_end_date is not None and task.actual_end_date is not None:
                try:
                    planned_date = task.planned_end_date.date() if isinstance(task.planned_end_date, datetime) else task.planned_end_date
                    actual_date = task.actual_end_date.date() if isinstance(task.actual_end_date, datetime) else task.actual_end_date
                    days_variance = (actual_date - planned_date).days
                except (AttributeError, TypeError):
                    days_variance = None
            
            # 성과 기록 생성
            performance_record = WorkerPerformanceRecord(
                production_task_id=task.id,
                credit_id=credit.id,
                person_type=credit.person_type,
                role_name=credit.role,
                work_type="main",
                planned_hours=task.planned_hours or 0.0,
                actual_hours=task.actual_hours or 0.0,
                efficiency_ratio=efficiency_ratio,
                quality_score=performance_data.get('quality_score'),
                rework_required=performance_data.get('rework_required', False),
                rework_hours=performance_data.get('rework_hours', 0.0),
                planned_completion=task.planned_end_date,
                actual_completion=task.actual_end_date,
                days_variance=days_variance,
                supervisor_rating=performance_data.get('supervisor_rating'),
                collaboration_rating=performance_data.get('collaboration_rating'),
                punctuality_rating=performance_data.get('punctuality_rating'),
                feedback_notes=performance_data.get('feedback_notes')
            )
            
            session.add(performance_record)
            session.commit()
            session.refresh(performance_record)
            
            return performance_record
    
    def record_review_performance(self, task_id: int, performance_data: Dict[str, Any]) -> WorkerPerformanceRecord:
        """감수 작업 성과 기록"""
        
        with self._safe_session() as session:
            task = session.get(ProductionTask, task_id)
            if not task or not task.reviewer_credit_id:
                raise ValueError(f"Task {task_id} or reviewer not found")
            
            credit = session.get(AccessAssetCredit, task.reviewer_credit_id)
            if not credit:
                raise ValueError(f"Reviewer credit {task.reviewer_credit_id} not found")
            
            # 감수 성과 기록
            performance_record = WorkerPerformanceRecord(
                production_task_id=task.id,
                credit_id=credit.id,
                person_type=credit.person_type,
                role_name=credit.role,
                work_type="review",
                planned_hours=task.review_hours or 0.0,
                actual_hours=performance_data.get('actual_hours', 0.0),
                efficiency_ratio=None,
                quality_score=performance_data.get('quality_score'),
                planned_completion=task.review_end_date,
                actual_completion=performance_data.get('actual_completion'),
                feedback_notes=performance_data.get('feedback_notes')
            )
            
            session.add(performance_record)
            session.commit()
            session.refresh(performance_record)
            
            return performance_record
    
    def record_monitoring_performance(self, task_id: int, performance_data: Dict[str, Any]) -> WorkerPerformanceRecord:
        """모니터링 작업 성과 기록"""
        
        with self._safe_session() as session:
            task = session.get(ProductionTask, task_id)
            if not task or not task.monitor_credit_id:
                raise ValueError(f"Task {task_id} or monitor not found")
            
            credit = session.get(AccessAssetCredit, task.monitor_credit_id)
            if not credit:
                raise ValueError(f"Monitor credit {task.monitor_credit_id} not found")
            
            # 모니터링 성과 기록
            performance_record = WorkerPerformanceRecord(
                production_task_id=task.id,
                credit_id=credit.id,
                person_type=credit.person_type,
                role_name=credit.role,
                work_type="monitoring",
                planned_hours=task.monitoring_hours or 0.0,
                actual_hours=performance_data.get('actual_hours', 0.0),
                efficiency_ratio=None,
                quality_score=performance_data.get('quality_score'),
                planned_completion=task.monitoring_end_date,
                actual_completion=performance_data.get('actual_completion'),
                feedback_notes=performance_data.get('feedback_notes')
            )
            
            session.add(performance_record)
            session.commit()
            session.refresh(performance_record)
            
            return performance_record
    
    def get_worker_performance_summary(self, credit_id: int, start_date: Optional[date] = None, end_date: Optional[date] = None) -> Dict[str, Any]:
        """특정 작업자의 성과 요약 - 개선된 통계 계산"""
        
        with self._safe_session() as session:
            query = select(WorkerPerformanceRecord).where(WorkerPerformanceRecord.credit_id == credit_id)
            
            # recorded_at 대신 created_at이나 actual_completion 사용 (모델에 따라 조정 필요)
            if start_date:
                query = query.where(WorkerPerformanceRecord.actual_completion >= start_date)
            if end_date:
                query = query.where(WorkerPerformanceRecord.actual_completion <= end_date)
            
            records = session.exec(query).all()
            
            if not records:
                return {"message": "No performance records found"}
            
            # 개선된 통계 계산 - None과 0 구분
            total_tasks = len(records)
            total_planned_hours = sum(r.planned_hours for r in records if r.planned_hours is not None)
            total_actual_hours = sum(r.actual_hours for r in records if r.actual_hours is not None)
            
            # 효율성 계산 - None 제외, 0 포함
            efficiency_values = [r.efficiency_ratio for r in records if r.efficiency_ratio is not None]
            average_efficiency = sum(efficiency_values) / len(efficiency_values) if efficiency_values else None
            
            # 품질 점수 계산 - None 제외, 0 포함
            quality_values = [r.quality_score for r in records if r.quality_score is not None]
            average_quality = sum(quality_values) / len(quality_values) if quality_values else None
            
            rework_count = len([r for r in records if r.rework_required is True])
            
            # 작업 유형별 분석
            work_type_analysis = {}
            for work_type in ['main', 'review', 'monitoring']:
                type_records = [r for r in records if r.work_type == work_type]
                if type_records:
                    type_quality_values = [r.quality_score for r in type_records if r.quality_score is not None]
                    work_type_analysis[work_type] = {
                        'count': len(type_records),
                        'total_hours': sum(r.actual_hours for r in type_records if r.actual_hours is not None),
                        'average_quality': sum(type_quality_values) / len(type_quality_values) if type_quality_values else None
                    }
            
            return {
                'total_tasks': total_tasks,
                'total_planned_hours': total_planned_hours,
                'total_actual_hours': total_actual_hours,
                'average_efficiency': average_efficiency,
                'average_quality': average_quality,
                'rework_count': rework_count,
                'rework_percentage': (rework_count / total_tasks * 100) if total_tasks > 0 else 0,
                'work_type_analysis': work_type_analysis,
                'period': {
                    'start_date': start_date,
                    'end_date': end_date
                }
            }
    
    def get_project_performance_summary(self, project_id: int) -> Dict[str, Any]:
        """특정 프로젝트의 전체 성과 요약 - N+1 쿼리 해결"""
        
        with self._safe_session() as session:
            project = session.get(ProductionProject, project_id)
            if not project:
                raise ValueError(f"Project {project_id} not found")
            
            # 프로젝트의 모든 작업과 성과 기록을 한 번에 조회
            task_records_query = (
                select(ProductionTask, WorkerPerformanceRecord)
                .outerjoin(WorkerPerformanceRecord, ProductionTask.id == WorkerPerformanceRecord.production_task_id)
                .where(ProductionTask.production_project_id == project_id)
            )
            
            task_records_results = session.exec(task_records_query).all()
            
            # 데이터 분리 및 정리
            tasks = []
            all_records = []
            tasks_dict = {}
            
            for task, record in task_records_results:
                if task.id not in tasks_dict:
                    tasks.append(task)
                    tasks_dict[task.id] = task
                if record is not None:
                    all_records.append(record)
            
            if not all_records:
                return {"message": "No performance records found for this project"}
            
            # 전체 통계 계산 - 개선된 None 처리
            total_planned_hours = sum(r.planned_hours for r in all_records if r.planned_hours is not None)
            total_actual_hours = sum(r.actual_hours for r in all_records if r.actual_hours is not None)
            
            overall_efficiency = None
            if total_actual_hours > 0:
                overall_efficiency = total_planned_hours / total_actual_hours
            
            quality_values = [r.quality_score for r in all_records if r.quality_score is not None]
            average_quality = sum(quality_values) / len(quality_values) if quality_values else None
            
            total_rework_hours = sum(r.rework_hours for r in all_records if r.rework_hours is not None)
            rework_percentage = (total_rework_hours / total_actual_hours * 100) if total_actual_hours > 0 else 0
            
            # 단계별 분석 - 메모리에서 처리
            stage_analysis = {}
            for stage in range(1, 5):
                stage_tasks = [t for t in tasks if t.stage_number == stage]
                if stage_tasks:
                    stage_records = [r for r in all_records if any(r.production_task_id == t.id for t in stage_tasks)]
                    stage_hours = sum(r.actual_hours for r in stage_records if r.actual_hours is not None)
                    completed_tasks = len([t for t in stage_tasks if t.task_status == 'completed'])
                    
                    stage_analysis[f'stage_{stage}'] = {
                        'tasks_count': len(stage_tasks),
                        'total_hours': stage_hours,
                        'completion_percentage': (completed_tasks / len(stage_tasks) * 100) if stage_tasks else 0
                    }
            
            # 참여자 수 계산 - None 제외
            unique_credits = set(r.credit_id for r in all_records if r.credit_id is not None)
            
            return {
                'project_id': project_id,
                'total_planned_hours': total_planned_hours,
                'total_actual_hours': total_actual_hours,
                'overall_efficiency': overall_efficiency,
                'average_quality': average_quality,
                'total_rework_hours': total_rework_hours,
                'rework_percentage': rework_percentage,
                'stage_analysis': stage_analysis,
                'participants_count': len(unique_credits),
                'progress_percentage': project.progress_percentage
            }
    
    def get_team_performance_analytics(self, start_date: Optional[date] = None, end_date: Optional[date] = None) -> Dict[str, Any]:
        """팀 전체 성과 분석 - 대폭 개선된 쿼리 최적화"""
        
        with self._safe_session() as session:
            # 1. 모든 성과 기록을 한 번에 조회 (날짜 필터링 포함)
            query = select(WorkerPerformanceRecord)
            
            if start_date:
                query = query.where(WorkerPerformanceRecord.actual_completion >= start_date)
            if end_date:
                query = query.where(WorkerPerformanceRecord.actual_completion <= end_date)
            
            all_records = session.exec(query).all()
            
            if not all_records:
                return {"message": "No performance data available"}
            
            # 2. 필요한 모든 관련 데이터를 벌크로 조회
            task_ids = list(set(r.production_task_id for r in all_records))
            project_ids_query = (
                select(ProductionTask.production_project_id)
                .where(ProductionTask.id.in_(task_ids))
            )
            project_ids = [row[0] for row in session.exec(project_ids_query).all()]
            
            # 프로젝트와 에셋 정보를 한 번에 조회
            project_assets_query = (
                select(ProductionProject, AccessAsset)
                .join(AccessAsset, ProductionProject.access_asset_id == AccessAsset.id)
                .where(ProductionProject.id.in_(project_ids))
            )
            project_assets = session.exec(project_assets_query).all()
            
            # 작업과 프로젝트 매핑을 메모리에서 생성
            tasks_query = select(ProductionTask).where(ProductionTask.id.in_(task_ids))
            tasks = session.exec(tasks_query).all()
            task_to_project = {task.id: task.production_project_id for task in tasks}
            project_to_asset = {project.id: asset for project, asset in project_assets}
            
            # 3. 전체 통계 - 개선된 계산
            total_hours = sum(r.actual_hours for r in all_records if r.actual_hours is not None)
            total_tasks = len(all_records)
            
            efficiency_values = [r.efficiency_ratio for r in all_records if r.efficiency_ratio is not None]
            average_efficiency = sum(efficiency_values) / len(efficiency_values) if efficiency_values else None
            
            # 4. 역할별 분석 - 메모리에서 처리
            role_analysis = {}
            for record in all_records:
                role = record.person_type
                if role not in role_analysis:
                    role_analysis[role] = {
                        'count': 0,
                        'total_hours': 0,
                        'quality_scores': []
                    }
                
                role_analysis[role]['count'] += 1
                if record.actual_hours is not None:
                    role_analysis[role]['total_hours'] += record.actual_hours
                if record.quality_score is not None:
                    role_analysis[role]['quality_scores'].append(record.quality_score)
            
            # 각 역할별 평균 품질 계산
            for role_data in role_analysis.values():
                if role_data['quality_scores']:
                    role_data['average_quality'] = sum(role_data['quality_scores']) / len(role_data['quality_scores'])
                else:
                    role_data['average_quality'] = None
                del role_data['quality_scores']
            
            # 5. 미디어 유형별 분석 - 메모리 매핑 활용
            media_type_analysis = {}
            projects_processed = set()
            
            for record in all_records:
                project_id = task_to_project.get(record.production_task_id)
                if project_id and project_id not in projects_processed:
                    asset = project_to_asset.get(project_id)
                    if asset:
                        media_type = asset.media_type
                        if media_type not in media_type_analysis:
                            media_type_analysis[media_type] = {
                                'projects_count': 0,
                                'total_hours': 0
                            }
                        projects_processed.add(project_id)
                        media_type_analysis[media_type]['projects_count'] += 1
            
            # 각 미디어 유형별 총 시간 계산
            for record in all_records:
                project_id = task_to_project.get(record.production_task_id)
                if project_id:
                    asset = project_to_asset.get(project_id)
                    if asset and asset.media_type in media_type_analysis and record.actual_hours is not None:
                        media_type_analysis[asset.media_type]['total_hours'] += record.actual_hours
            
            return {
                'total_hours': total_hours,
                'total_tasks': total_tasks,
                'average_efficiency': average_efficiency,
                'role_analysis': role_analysis,
                'media_type_analysis': media_type_analysis,
                'period': {
                    'start_date': start_date,
                    'end_date': end_date
                }
            }
    
    def _get_person_name_from_credit(self, credit: AccessAssetCredit) -> str:
        """크레디트에서 실제 인물 이름 추출 - 개선된 None 체크"""
        try:
            if credit.person_type == 'scriptwriter' and credit.scriptwriter and credit.scriptwriter.name:
                return credit.scriptwriter.name
            elif credit.person_type == 'voice_artist' and credit.voice_artist and credit.voice_artist.voiceartist_name:
                return credit.voice_artist.voiceartist_name
            elif credit.person_type == 'sl_interpreter' and credit.sl_interpreter and credit.sl_interpreter.name:
                return credit.sl_interpreter.name
            elif credit.person_type == 'staff' and credit.staff and credit.staff.name:
                return credit.staff.name
        except AttributeError:
            # 관련 객체가 None이거나 속성이 없는 경우 처리
            pass
        
        return 'Unknown'
