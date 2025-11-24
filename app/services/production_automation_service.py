# app/services/production_automation_service.py
from sqlmodel import Session, select, and_
from typing import Optional, List, Dict, Any, Tuple
from datetime import date, timedelta
from dataclasses import dataclass
import logging
from contextlib import contextmanager

from app.models.access_asset import AccessAsset
from app.models.access_asset_credit import AccessAssetCredit
from app.models.production_project import ProductionProject
from app.models.production_task import ProductionTask

logger = logging.getLogger(__name__)

@dataclass
class AssetWithCredits:
    """크레디트 정보와 함께 제공되는 AccessAsset 데이터"""
    asset: AccessAsset
    credits: List[AccessAssetCredit]

@dataclass
class TaskAssignmentConfig:
    """작업 배정 설정"""
    scriptwriter_task_types: List[str]
    reviewer_task_types: List[str] 
    monitor_task_types: List[str]
    producer_task_types: List[str]
    voice_artist_task_types: List[str]

class ProductionAutomationService:
    
    def __init__(self, db: Session):
        self.db = db
        self.task_assignment_config = self._load_task_assignment_config()
    
    def _load_task_assignment_config(self) -> TaskAssignmentConfig:
        """작업 배정 설정 로드 (향후 DB나 환경변수에서 로드 가능)"""
        return TaskAssignmentConfig(
            scriptwriter_task_types=['script_writing', 'content_planning', 'script_review'],
            reviewer_task_types=['quality_review', 'content_review', 'final_review'],
            monitor_task_types=['quality_monitoring', 'compliance_check', 'final_monitoring'],
            producer_task_types=['project_planning', 'resource_management', 'coordination'],
            voice_artist_task_types=['voice_recording', 'narration', 'audio_production']
        )
    
    def check_and_create_project(self, access_asset_id: int) -> Optional[ProductionProject]:
        """접근성 자산 상태 변경 시 자동 프로젝트 생성 체크"""
        
        if not access_asset_id:
            logger.error("Invalid access_asset_id provided")
            return None
            
        try:
            # 1. 조건 확인
            asset_data = self._get_asset_with_credits(access_asset_id)
            if not asset_data:
                logger.warning(f"AccessAsset not found: id={access_asset_id}")
                return None
                
            if not self._should_create_project(asset_data):
                return None
                
            # 2. 트랜잭션으로 프로젝트 생성
            with self._transaction_context():
                # 2-1. 프로젝트 생성
                project = self._create_production_project(asset_data)
                if not project:
                    raise ValueError("Failed to create production project")
                
                # 2-2. 기본 작업 생성
                tasks = self._create_basic_tasks(
                    project.id, 
                    asset_data.asset.media_type, 
                    project.work_speed_type
                )
                
                # 2-3. 크레디트 기반 작업자 배정
                if asset_data.credits:
                    self._assign_workers_from_credits(project.id, tasks, asset_data.credits)
                
                self.db.commit()
                self.db.refresh(project)
                
                logger.info(f"프로젝트 자동 생성 완료: asset_id={access_asset_id}, project_id={project.id}")
                return project
                
        except Exception as e:
            self.db.rollback()
            logger.error(f"프로젝트 생성 실패: asset_id={access_asset_id}, error={str(e)}", exc_info=True)
            raise
    
    @contextmanager
    def _transaction_context(self):
        """트랜잭션 컨텍스트 매니저"""
        try:
            yield
        except Exception:
            self.db.rollback()
            raise
        else:
            # commit은 상위에서 처리
            pass
    
    def _get_asset_with_credits(self, access_asset_id: int) -> Optional[AssetWithCredits]:
        """크레디트 정보와 함께 AccessAsset 조회 (최적화된 쿼리)"""
        
        try:
            # JOIN을 사용한 단일 쿼리로 최적화
            statement = (
                select(AccessAsset, AccessAssetCredit)
                .outerjoin(AccessAssetCredit, AccessAsset.id == AccessAssetCredit.access_asset_id)
                .where(AccessAsset.id == access_asset_id)
            )
            
            results = self.db.exec(statement).all()
            
            if not results:
                return None
                
            # 첫 번째 결과에서 asset 추출
            asset = results[0][0]
            if not asset:
                return None
            
            # 모든 credits 수집 (None이 아닌 것만)
            credits = [result[1] for result in results if result[1] is not None]
            
            return AssetWithCredits(asset=asset, credits=credits)
            
        except Exception as e:
            logger.error(f"Error fetching asset with credits: {e}")
            return None
    
    def _should_create_project(self, asset_data: AssetWithCredits) -> bool:
        """자동 생성 조건 확인"""
        if not asset_data or not asset_data.asset:
            return False
            
        asset = asset_data.asset
        
        # 이미 프로젝트가 존재하는지 확인
        try:
            existing_project = self.db.exec(
                select(ProductionProject).where(ProductionProject.access_asset_id == asset.id)
            ).first()
            
            if existing_project:
                logger.debug(f"프로젝트가 이미 존재함: asset_id={asset.id}, project_id={existing_project.id}")
                return False
        except Exception as e:
            logger.error(f"Error checking existing project: {e}")
            return False
        
        # 생성 조건 확인
        is_eligible = (
            getattr(asset, 'production_status', None) == "in_progress" and
            len(asset_data.credits) >= 2
        )
        
        logger.debug(
            f"프로젝트 생성 조건 확인: asset_id={asset.id}, "
            f"status={getattr(asset, 'production_status', None)}, "
            f"credits_count={len(asset_data.credits)}, "
            f"eligible={is_eligible}"
        )
        return is_eligible
    
    def _create_production_project(self, asset_data: AssetWithCredits) -> Optional[ProductionProject]:
        """프로젝트 생성"""
        if not asset_data or not asset_data.asset:
            return None
            
        asset = asset_data.asset
        
        try:
            # 작업 속도 유형 결정
            work_speed_type = self._determine_work_speed_type(asset)
            
            # 예상 완료일 계산
            estimated_completion = self._calculate_estimated_completion(
                getattr(asset, 'media_type', 'AD'), 
                work_speed_type
            )
            
            project = ProductionProject(
                access_asset_id=asset.id,
                auto_created=True,
                credits_count=len(asset_data.credits),
                creation_trigger="status_change",
                current_stage=1,
                project_status="active",
                progress_percentage=0.0,
                start_date=date.today(),
                estimated_completion_date=estimated_completion,
                work_speed_type=work_speed_type,
                priority_order=0
            )
            
            self.db.add(project)
            self.db.flush()  # ID 생성을 위해 flush (commit은 상위에서)
            
            return project
            
        except Exception as e:
            logger.error(f"Error creating production project: {e}")
            return None
    
    def _determine_work_speed_type(self, asset: AccessAsset) -> str:
        """작업 속도 유형 결정 로직"""
        # 향후 비즈니스 로직에 따라 개선 가능
        # 예: 긴급도, 마감일, 복잡도 등을 고려
        
        # 기본값
        return "B"
    
    def _calculate_estimated_completion(self, media_type: str, work_speed_type: str) -> date:
        """미디어 유형과 작업 속도에 따른 예상 완료일 계산"""
        
        # 작업 속도별 기본 소요 일수
        speed_days = {
            "A": 10,  # 빠름
            "B": 14,  # 보통
            "C": 21   # 여유
        }
        
        # 미디어 유형별 가중치 (향후 확장 가능)
        media_weights = {
            "AD": 1.0,
            "CC": 0.8,
            "SL": 1.2,
            "AI": 0.6,
            "CI": 0.5,
            "SI": 0.7,
            "AR": 0.8,
            "CR": 0.6,
            "SR": 0.9
        }
        
        base_days = speed_days.get(work_speed_type, 14)
        weight = media_weights.get(media_type, 1.0)
        total_days = int(base_days * weight)
        
        return date.today() + timedelta(days=total_days)
    
    def _create_basic_tasks(self, project_id: int, media_type: str, work_speed_type: str) -> List[ProductionTask]:
        """템플릿 기반 작업 생성"""
        if not project_id:
            logger.error("Invalid project_id for task creation")
            return []
            
        try:
            from app.services.production_template_service import ProductionTemplateService
            
            template_service = ProductionTemplateService(self.db)
            tasks = template_service.create_tasks_from_templates(project_id, media_type, work_speed_type)
            
            return tasks or []
            
        except ImportError:
            # ProductionTemplateService가 아직 없는 경우 기본 작업 생성
            logger.warning("ProductionTemplateService를 찾을 수 없음. 기본 작업을 생성합니다.")
            return self._create_default_tasks(project_id, media_type, work_speed_type)
        except Exception as e:
            logger.error(f"Error creating tasks from templates: {e}")
            return self._create_default_tasks(project_id, media_type, work_speed_type)
    
    def _create_default_tasks(self, project_id: int, media_type: str, work_speed_type: str) -> List[ProductionTask]:
        """기본 작업 생성 (템플릿 서비스가 없는 경우)"""
        
        default_tasks = [
            # 1단계
            {"stage": 1, "name": "프로젝트 계획 수립", "task_type": "project_planning", "order": 1},
            {"stage": 1, "name": "대본 작성", "task_type": "script_writing", "order": 2},
            {"stage": 1, "name": "초기 검토", "task_type": "initial_review", "order": 3},
            
            # 2단계
            {"stage": 2, "name": "음성 녹음", "task_type": "voice_recording", "order": 1},
            {"stage": 2, "name": "품질 검토", "task_type": "quality_review", "order": 2},
            
            # 3단계
            {"stage": 3, "name": "최종 편집", "task_type": "final_editing", "order": 1},
            {"stage": 3, "name": "품질 모니터링", "task_type": "quality_monitoring", "order": 2},
            
            # 4단계
            {"stage": 4, "name": "최종 승인", "task_type": "final_approval", "order": 1},
            {"stage": 4, "name": "배포 준비", "task_type": "distribution_prep", "order": 2},
        ]
        
        created_tasks = []
        for task_data in default_tasks:
            try:
                task = ProductionTask(
                    production_project_id=project_id,
                    stage_number=task_data["stage"],
                    task_name=task_data["name"],
                    task_order=task_data["order"],
                    task_status="pending",
                    is_required=True,
                    # 감수/모니터링 여부 설정
                    review_required=("review" in task_data["task_type"]),
                    monitoring_required=("monitoring" in task_data["task_type"]),
                    # 기본 소요 시간 (향후 템플릿에서 가져올 예정)
                    planned_hours=8.0
                )
                self.db.add(task)
                created_tasks.append(task)
            except Exception as e:
                logger.error(f"Error creating default task: {e}")
                continue
        
        if created_tasks:
            self.db.flush()
        return created_tasks
    
    def _assign_workers_from_credits(self, project_id: int, tasks: List[ProductionTask], credits: List[AccessAssetCredit]):
        """크레디트 정보 기반 작업자 자동 배정 (개선된 로직)"""
        
        if not project_id or not tasks or not credits:
            logger.warning("Skipping worker assignment due to missing data")
            return
            
        # 역할별 크레디트 분류
        role_credits = self._classify_credits_by_role(credits)
        
        # 각 작업에 적절한 담당자 배정
        for task in tasks:
            if not task:
                continue
                
            task_type = getattr(task, 'task_type', None) or self._infer_task_type_from_name(
                getattr(task, 'task_name', '')
            )
            
            # 메인 담당자 배정
            if task_type in self.task_assignment_config.scriptwriter_task_types:
                self._assign_credit_to_task(task, role_credits.get('scriptwriter', []))
            elif task_type in self.task_assignment_config.producer_task_types:
                self._assign_credit_to_task(task, role_credits.get('producer', []))
            elif task_type in self.task_assignment_config.voice_artist_task_types:
                self._assign_credit_to_task(task, role_credits.get('voice_artist', []))
            
            # 감수자 배정
            if getattr(task, 'review_required', False):
                self._assign_reviewer_to_task(task, role_credits.get('reviewer', []))
            
            # 모니터링 담당자 배정
            if getattr(task, 'monitoring_required', False):
                self._assign_monitor_to_task(task, role_credits.get('monitor', []))
        
        try:
            self.db.flush()
        except Exception as e:
            logger.error(f"Error flushing worker assignments: {e}")
    
    def _classify_credits_by_role(self, credits: List[AccessAssetCredit]) -> Dict[str, List[AccessAssetCredit]]:
        """크레디트를 역할별로 분류"""
        
        role_credits = {
            'scriptwriter': [],
            'producer': [],
            'reviewer': [],
            'monitor': [],
            'voice_artist': [],
            'other': []
        }
        
        for credit in credits:
            if not credit:
                continue
                
            person_type = getattr(credit, 'person_type', None)
            role = getattr(credit, 'role', '')
            role_lower = role.lower() if role else ''
            
            if person_type == 'scriptwriter':
                role_credits['scriptwriter'].append(credit)
            elif person_type == 'voice_artist':
                role_credits['voice_artist'].append(credit)
            elif person_type == 'staff':
                if any(keyword in role_lower for keyword in ['감수', 'review', '검토']):
                    role_credits['reviewer'].append(credit)
                elif any(keyword in role_lower for keyword in ['모니터링', 'monitor', '품질관리']):
                    role_credits['monitor'].append(credit)
                elif any(keyword in role_lower for keyword in ['프로듀서', 'producer', '제작', '관리']):
                    role_credits['producer'].append(credit)
                else:
                    role_credits['other'].append(credit)
            else:
                role_credits['other'].append(credit)
        
        return role_credits
    
    def _infer_task_type_from_name(self, task_name: str) -> str:
        """작업명에서 작업 유형 추론 (fallback)"""
        if not task_name:
            return 'general'
            
        name_lower = task_name.lower()
        
        if any(keyword in name_lower for keyword in ['대본', 'script', '작성']):
            return 'script_writing'
        elif any(keyword in name_lower for keyword in ['녹음', 'record', '음성']):
            return 'voice_recording'
        elif any(keyword in name_lower for keyword in ['검토', 'review', '감수']):
            return 'quality_review'
        elif any(keyword in name_lower for keyword in ['모니터링', 'monitor', '품질관리']):
            return 'quality_monitoring'
        elif any(keyword in name_lower for keyword in ['계획', 'plan', '준비']):
            return 'project_planning'
        else:
            return 'general'
    
    def _assign_credit_to_task(self, task: ProductionTask, candidates: List[AccessAssetCredit]):
        """작업에 메인 담당자 배정"""
        if not task or not candidates or getattr(task, 'assigned_credit_id', None):
            return
            
        # 우선순위: primary 크레디트 우선, 그 다음 첫 번째
        primary_credit = next(
            (c for c in candidates if c and getattr(c, 'is_primary', False)), 
            None
        )
        selected_credit = primary_credit or (candidates[0] if candidates else None)
        
        if selected_credit and hasattr(selected_credit, 'id'):
            task.assigned_credit_id = selected_credit.id
    
    def _assign_reviewer_to_task(self, task: ProductionTask, reviewers: List[AccessAssetCredit]):
        """작업에 감수자 배정"""
        if not task or not reviewers or getattr(task, 'reviewer_credit_id', None):
            return
            
        if reviewers[0] and hasattr(reviewers[0], 'id'):
            task.reviewer_credit_id = reviewers[0].id
    
    def _assign_monitor_to_task(self, task: ProductionTask, monitors: List[AccessAssetCredit]):
        """작업에 모니터링 담당자 배정"""
        if not task or not monitors or getattr(task, 'monitor_credit_id', None):
            return
            
        if monitors[0] and hasattr(monitors[0], 'id'):
            task.monitor_credit_id = monitors[0].id
    
    def trigger_project_creation_for_asset(self, access_asset_id: int) -> Optional[ProductionProject]:
        """특정 AccessAsset에 대해 프로젝트 생성을 수동으로 트리거"""
        if not access_asset_id:
            logger.error("Invalid access_asset_id provided")
            return None
            
        return self.check_and_create_project(access_asset_id)
    
    def bulk_check_existing_assets(self) -> List[ProductionProject]:
        """기존의 모든 적격한 AccessAsset에 대해 프로젝트 생성 체크 (최적화)"""
        created_projects = []
        
        try:
            # 최적화된 쿼리: 이미 프로젝트가 있는 asset 제외
            existing_project_asset_ids = self.db.exec(
                select(ProductionProject.access_asset_id)
            ).all()
            
            # in_progress 상태이면서 프로젝트가 없는 asset들을 크레디트와 함께 조회
            assets_query = (
                select(AccessAsset, AccessAssetCredit)
                .outerjoin(AccessAssetCredit, AccessAsset.id == AccessAssetCredit.access_asset_id)
                .where(AccessAsset.production_status == "in_progress")
            )
            
            if existing_project_asset_ids:
                assets_query = assets_query.where(
                    AccessAsset.id.notin_(existing_project_asset_ids)
                )
            
            results = self.db.exec(assets_query).all()
            
            # asset별로 credits 그룹화
            asset_credits_map: Dict[int, AssetWithCredits] = {}
            for result in results:
                if not result or len(result) < 2:
                    continue
                    
                asset, credit = result[0], result[1]
                if not asset or not hasattr(asset, 'id'):
                    continue
                    
                if asset.id not in asset_credits_map:
                    asset_credits_map[asset.id] = AssetWithCredits(asset=asset, credits=[])
                if credit:
                    asset_credits_map[asset.id].credits.append(credit)
            
            # 각 asset에 대해 프로젝트 생성 시도
            for asset_data in asset_credits_map.values():
                if len(asset_data.credits) >= 2:  # 최소 크레디트 조건 확인
                    try:
                        project = self.check_and_create_project(asset_data.asset.id)
                        if project:
                            created_projects.append(project)
                    except Exception as e:
                        logger.error(
                            f"프로젝트 생성 실패: asset_id={asset_data.asset.id}, error={str(e)}"
                        )
                        continue
            
            logger.info(f"벌크 프로젝트 생성 완료: {len(created_projects)}개 생성")
            return created_projects
            
        except Exception as e:
            logger.error(f"벌크 프로젝트 생성 오류: {str(e)}", exc_info=True)
            raise
