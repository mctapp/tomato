# app/services/production_project_service.py
from sqlmodel import Session, select
from typing import Optional, List
from datetime import date, timedelta
import logging

from app.models.production_project import ProductionProject
from app.models.access_asset import AccessAsset
from app.models.access_asset_credit import AccessAssetCredit
from app.models.enums import (
    ProjectStatus, WorkSpeedType, CreationTrigger, StageNumber
)
from app.services.production_template_service import ProductionTemplateService

logger = logging.getLogger(__name__)


class ProductionProjectService:
    """프로덕션 프로젝트 관리 서비스"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def create_project_from_asset(
        self, 
        asset_id: int,
        work_speed_type: str = WorkSpeedType.B.value,
        creation_trigger: str = CreationTrigger.CREDITS_SUFFICIENT.value
    ) -> Optional[ProductionProject]:
        """접근성 자산으로부터 프로덕션 프로젝트 생성"""
        try:
            # 1. 접근성 자산 조회
            asset = self.db.get(AccessAsset, asset_id)
            if not asset:
                logger.error(f"AccessAsset not found: {asset_id}")
                return None
            
            # 2. 이미 프로젝트가 있는지 확인
            existing = self.db.exec(
                select(ProductionProject)
                .where(ProductionProject.access_asset_id == asset_id)
            ).first()
            
            if existing:
                logger.info(f"Production project already exists for asset {asset_id}")
                return existing
            
            # 3. 크레디트 수 확인
            credit_count = self.db.query(AccessAssetCredit)\
                .filter(AccessAssetCredit.access_asset_id == asset_id)\
                .count()
            
            # 4. 예상 완료일 계산 (작업 속도에 따라)
            days_estimate = self._calculate_estimated_days(asset.media_type, work_speed_type)
            estimated_completion = date.today() + timedelta(days=days_estimate)
            
            # 5. 프로젝트 생성
            project = ProductionProject(
                access_asset_id=asset_id,
                auto_created=True,
                credits_count=credit_count,
                creation_trigger=creation_trigger,
                current_stage=StageNumber.PREPARATION.value,
                project_status=ProjectStatus.ACTIVE.value,
                progress_percentage=0.0,
                start_date=date.today(),
                estimated_completion_date=estimated_completion,
                work_speed_type=work_speed_type,
                priority_order=0
            )
            
            self.db.add(project)
            self.db.flush()  # ID 할당을 위해
            
            # 6. 템플릿에서 작업 생성
            template_service = ProductionTemplateService(self.db)
            tasks = template_service.create_tasks_from_templates(
                production_project_id=project.id,
                media_type=asset.media_type,
                work_speed_type=work_speed_type
            )
            
            logger.info(
                f"Created production project {project.id} for asset {asset_id} "
                f"with {len(tasks)} tasks"
            )
            
            # 7. 첫 번째 작업 시작 처리
            if tasks:
                first_task = next((t for t in tasks if t.stage_number == 1), None)
                if first_task:
                    first_task.task_status = 'in_progress'
                    # 진행률 계산
                    total_tasks = len(tasks)
                    project.progress_percentage = (1 / total_tasks) * 100 if total_tasks > 0 else 0
            
            self.db.commit()
            self.db.refresh(project)
            
            return project
            
        except Exception as e:
            logger.error(f"Failed to create production project: {str(e)}")
            self.db.rollback()
            raise
    
    def _calculate_estimated_days(self, media_type: str, work_speed_type: str) -> int:
        """미디어 타입과 작업 속도에 따른 예상 소요 일수 계산"""
        # 템플릿 서비스에서 시간 정보 가져오기
        template_service = ProductionTemplateService(self.db)
        templates = template_service.get_templates_by_media_type(media_type)
        
        if not templates:
            # 기본값
            return 14  # 2주
        
        total_hours = 0.0
        for template in templates:
            hours_info = template_service.get_hours_by_speed_type(template, work_speed_type)
            total_hours += float(hours_info.get('main', 0))
            total_hours += float(hours_info.get('review', 0))
            total_hours += float(hours_info.get('monitoring', 0))
        
        # 하루 8시간 기준으로 일수 계산 (올림)
        estimated_days = int((total_hours + 7) / 8) if total_hours > 0 else 14
        
        # 최소 3일, 최대 60일로 제한
        return max(3, min(60, estimated_days))
    
    def check_and_create_for_asset(self, asset_id: int) -> Optional[ProductionProject]:
        """접근성 자산의 조건을 확인하고 프로젝트 생성"""
        try:
            # 접근성 자산 조회
            asset = self.db.get(AccessAsset, asset_id)
            if not asset:
                return None
            
            # 조건 확인: production_status가 'in_progress'
            if asset.production_status != 'in_progress':
                logger.debug(f"Asset {asset_id} production_status is not 'in_progress'")
                return None
            
            # 크레디트 수 확인
            credit_count = self.db.query(AccessAssetCredit)\
                .filter(AccessAssetCredit.access_asset_id == asset_id)\
                .count()
            
            if credit_count < 2:
                logger.debug(f"Asset {asset_id} has only {credit_count} credits (need at least 2)")
                return None
            
            # 이미 프로젝트가 있는지 확인
            existing = self.db.exec(
                select(ProductionProject)
                .where(ProductionProject.access_asset_id == asset_id)
            ).first()
            
            if existing:
                logger.debug(f"Production project already exists for asset {asset_id}")
                return existing
            
            # 조건을 모두 만족하면 프로젝트 생성
            logger.info(f"Creating production project for asset {asset_id} (credits: {credit_count})")
            return self.create_project_from_asset(
                asset_id=asset_id,
                creation_trigger=CreationTrigger.CREDITS_SUFFICIENT.value
            )
            
        except Exception as e:
            logger.error(f"Error checking/creating project for asset {asset_id}: {str(e)}")
            return None
    
    def update_project_stage(self, project_id: int, new_stage: int) -> Optional[ProductionProject]:
        """프로젝트 단계 업데이트"""
        project = self.db.get(ProductionProject, project_id)
        if not project:
            return None
        
        # 유효한 단계인지 확인
        if new_stage not in [1, 2, 3, 4]:
            raise ValueError(f"Invalid stage number: {new_stage}")
        
        project.current_stage = new_stage
        project.update_timestamp()
        
        # 4단계로 이동 시 프로젝트 완료 처리
        if new_stage == 4:
            project.mark_completed()
        
        self.db.commit()
        self.db.refresh(project)
        
        return project
    
    def get_projects_for_kanban(
        self,
        media_type_filter: Optional[str] = None,
        speed_type_filter: Optional[str] = None,
        status_filter: Optional[str] = None
    ) -> List[ProductionProject]:
        """칸반보드용 프로젝트 목록 조회"""
        query = select(ProductionProject).where(
            ProductionProject.project_status.in_([
                ProjectStatus.ACTIVE.value,
                ProjectStatus.PAUSED.value
            ])
        )
        
        # 필터 적용
        if media_type_filter:
            query = query.join(AccessAsset).where(
                AccessAsset.media_type == media_type_filter
            )
        
        if speed_type_filter:
            query = query.where(
                ProductionProject.work_speed_type == speed_type_filter
            )
        
        if status_filter:
            query = query.where(
                ProductionProject.project_status == status_filter
            )
        
        # 우선순위와 생성일 기준 정렬
        query = query.order_by(
            ProductionProject.priority_order.desc(),
            ProductionProject.created_at.asc()
        )
        
        return list(self.db.exec(query).all())
