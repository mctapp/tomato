# app/services/production_template_service.py
from sqlmodel import Session, select
from typing import List, Dict, Optional, Any, Union
from decimal import Decimal
import json
import logging
from contextlib import contextmanager

from app.models.production_template import ProductionTemplate
from app.models.production_task import ProductionTask, TaskStatus

# 로깅 설정
logger = logging.getLogger(__name__)


class TemplateServiceError(Exception):
    """템플릿 서비스 관련 예외"""
    pass


class TemplateDuplicateError(TemplateServiceError):
    """템플릿 중복 관련 예외"""
    pass


class TemplateValidationError(TemplateServiceError):
    """템플릿 유효성 검증 관련 예외"""
    pass


class ProductionTemplateService:
    """제작 템플릿 관리 서비스"""
    
    def __init__(self, db: Session):
        self.db = db
    
    @contextmanager
    def transaction(self):
        """트랜잭션 컨텍스트 매니저"""
        try:
            yield
            self.db.commit()
        except Exception as e:
            self.db.rollback()
            logger.error(f"Template service transaction failed: {str(e)}")
            raise
    
    def get_templates_by_media_type(self, media_type: str) -> List[ProductionTemplate]:
        """미디어 유형별 템플릿 조회"""
        try:
            statement = (
                select(ProductionTemplate)
                .where(ProductionTemplate.media_type == media_type)
                .where(ProductionTemplate.is_active == True)
                .order_by(ProductionTemplate.stage_number, ProductionTemplate.task_order)
            )
            templates = self.db.exec(statement).all()
            logger.debug(f"Retrieved {len(templates)} templates for media type: {media_type}")
            return list(templates)
            
        except Exception as e:
            logger.error(f"Failed to get templates for media type {media_type}: {str(e)}")
            raise TemplateServiceError(f"템플릿 조회 실패: {str(e)}")
    
    def get_templates_by_stage(self, media_type: str, stage_number: int) -> List[ProductionTemplate]:
        """특정 단계의 템플릿 조회"""
        try:
            if not (1 <= stage_number <= 4):
                raise TemplateValidationError("단계 번호는 1-4 사이여야 합니다")
            
            statement = (
                select(ProductionTemplate)
                .where(ProductionTemplate.media_type == media_type)
                .where(ProductionTemplate.stage_number == stage_number)
                .where(ProductionTemplate.is_active == True)
                .order_by(ProductionTemplate.task_order)
            )
            templates = self.db.exec(statement).all()
            logger.debug(f"Retrieved {len(templates)} templates for {media_type} stage {stage_number}")
            return list(templates)
            
        except Exception as e:
            logger.error(f"Failed to get stage templates: {str(e)}")
            raise TemplateServiceError(f"단계별 템플릿 조회 실패: {str(e)}")
    
    def create_template(self, template_data: Dict[str, Any]) -> ProductionTemplate:
        """새 템플릿 생성"""
        try:
            with self.transaction():
                # 데이터 유효성 검증
                validated_data = self._validate_template_data(template_data)
                
                # 중복 체크
                if self._check_template_duplicate(
                    validated_data['media_type'], 
                    validated_data['stage_number'], 
                    validated_data['task_order']
                ):
                    raise TemplateDuplicateError(
                        f"이미 존재하는 템플릿입니다: {validated_data['media_type']}-{validated_data['stage_number']}-{validated_data['task_order']}"
                    )
                
                # JSON 필드 직렬화
                validated_data = self._serialize_json_fields(validated_data)
                
                template = ProductionTemplate(**validated_data)
                self.db.add(template)
                self.db.flush()  # ID 할당을 위해 flush
                self.db.refresh(template)
                
                logger.info(f"Created template {template.id} for {template.media_type}")
                return template
                
        except (TemplateDuplicateError, TemplateValidationError):
            raise
        except Exception as e:
            logger.error(f"Failed to create template: {str(e)}")
            raise TemplateServiceError(f"템플릿 생성 실패: {str(e)}")
    
    def update_template(self, template_id: int, update_data: Dict[str, Any]) -> Optional[ProductionTemplate]:
        """템플릿 수정"""
        try:
            with self.transaction():
                template = self.db.get(ProductionTemplate, template_id)
                if not template:
                    logger.warning(f"Template not found: {template_id}")
                    return None
                
                # 데이터 유효성 검증 (부분 업데이트)
                validated_data = self._validate_template_data(update_data, partial=True)
                
                # 중복 체크 (media_type, stage_number, task_order가 변경되는 경우)
                if any(key in validated_data for key in ['media_type', 'stage_number', 'task_order']):
                    media_type = validated_data.get('media_type', template.media_type)
                    stage_number = validated_data.get('stage_number', template.stage_number)
                    task_order = validated_data.get('task_order', template.task_order)
                    
                    if self._check_template_duplicate(media_type, stage_number, task_order, exclude_id=template_id):
                        raise TemplateDuplicateError(f"중복되는 템플릿이 존재합니다: {media_type}-{stage_number}-{task_order}")
                
                # JSON 필드 직렬화
                validated_data = self._serialize_json_fields(validated_data)
                
                # 필드 업데이트
                for field, value in validated_data.items():
                    if hasattr(template, field):
                        setattr(template, field, value)
                
                self.db.refresh(template)
                logger.info(f"Updated template {template_id}")
                return template
                
        except (TemplateDuplicateError, TemplateValidationError):
            raise
        except Exception as e:
            logger.error(f"Failed to update template {template_id}: {str(e)}")
            raise TemplateServiceError(f"템플릿 수정 실패: {str(e)}")
    
    def delete_template(self, template_id: int) -> bool:
        """템플릿 삭제 (소프트 삭제)"""
        try:
            with self.transaction():
                template = self.db.get(ProductionTemplate, template_id)
                if not template:
                    logger.warning(f"Template not found for deletion: {template_id}")
                    return False
                
                template.is_active = False
                logger.info(f"Soft deleted template {template_id}")
                return True
                
        except Exception as e:
            logger.error(f"Failed to delete template {template_id}: {str(e)}")
            raise TemplateServiceError(f"템플릿 삭제 실패: {str(e)}")
    
    def get_hours_by_speed_type(self, template: ProductionTemplate, speed_type: str) -> Dict[str, Decimal]:
        """속도 유형별 소요 시간 반환 (Decimal 타입으로 일관화)"""
        try:
            if speed_type not in ['A', 'B', 'C']:
                raise TemplateValidationError(f"잘못된 속도 유형: {speed_type}")
            
            hours_map = {
                'A': {
                    'main': template.speed_a_hours or Decimal('0'),
                    'review': template.review_hours_a or Decimal('0'),
                    'monitoring': template.monitoring_hours_a or Decimal('0')
                },
                'B': {
                    'main': template.speed_b_hours or Decimal('0'),
                    'review': template.review_hours_b or Decimal('0'),
                    'monitoring': template.monitoring_hours_b or Decimal('0')
                },
                'C': {
                    'main': template.speed_c_hours or Decimal('0'),
                    'review': template.review_hours_c or Decimal('0'),
                    'monitoring': template.monitoring_hours_c or Decimal('0')
                }
            }
            
            return hours_map[speed_type]
            
        except Exception as e:
            logger.error(f"Failed to get hours for speed type {speed_type}: {str(e)}")
            # 기본값 반환
            return {
                'main': Decimal('8'),
                'review': Decimal('2'),
                'monitoring': Decimal('1')
            }
    
    def create_tasks_from_templates(self, production_project_id: int, media_type: str, work_speed_type: str) -> List[ProductionTask]:
        """템플릿 기반 작업 생성"""
        try:
            with self.transaction():
                templates = self.get_templates_by_media_type(media_type)
                if not templates:
                    logger.warning(f"No templates found for media type: {media_type}")
                    return []
                
                tasks = []
                for template in templates:
                    hours_info = self.get_hours_by_speed_type(template, work_speed_type)
                    
                    task = ProductionTask(
                        production_project_id=production_project_id,
                        stage_number=template.stage_number,
                        task_name=template.task_name,
                        task_order=template.task_order,
                        task_status=TaskStatus.PENDING.value,
                        is_required=template.is_required,
                        planned_hours=hours_info['main'],
                        review_required=template.requires_review,
                        monitoring_required=template.requires_monitoring
                    )
                    
                    tasks.append(task)
                
                # Bulk insert
                self.db.add_all(tasks)
                self.db.flush()
                
                logger.info(f"Created {len(tasks)} tasks from templates for project {production_project_id}")
                return tasks
                
        except Exception as e:
            logger.error(f"Failed to create tasks from templates: {str(e)}")
            raise TemplateServiceError(f"템플릿 기반 작업 생성 실패: {str(e)}")
    
    def get_all_media_types(self) -> List[str]:
        """사용 가능한 모든 미디어 유형 반환"""
        return ['AD', 'CC', 'SL', 'AI', 'CI', 'SI', 'AR', 'CR', 'SR']
    
    def get_media_type_name(self, media_type: str) -> str:
        """미디어 유형 한글명 반환"""
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
    
    def bulk_update_templates(self, media_type: str, templates_data: List[Dict[str, Any]]) -> List[ProductionTemplate]:
        """미디어 유형별 템플릿 일괄 업데이트"""
        try:
            with self.transaction():
                # 데이터 유효성 검증
                validated_templates = []
                for template_data in templates_data:
                    template_data['media_type'] = media_type
                    validated_data = self._validate_template_data(template_data)
                    validated_data = self._serialize_json_fields(validated_data)
                    validated_templates.append(validated_data)
                
                # 중복 체크 (task_order 기준)
                stage_orders = [(t['stage_number'], t['task_order']) for t in validated_templates]
                
                if len(set(stage_orders)) != len(stage_orders):
                    raise TemplateDuplicateError("동일한 단계-순서 조합이 중복됩니다")
                
                # 기존 템플릿 조회
                existing_templates = self.db.exec(
                    select(ProductionTemplate)
                    .where(ProductionTemplate.media_type == media_type)
                ).all()
                
                # 기존 템플릿을 (stage_number, task_order) 키로 매핑
                existing_map = {
                    (t.stage_number, t.task_order): t 
                    for t in existing_templates
                }
                
                # 처리된 키 추적
                processed_keys = set()
                result_templates = []
                
                # 템플릿 업데이트 또는 생성
                for template_data in validated_templates:
                    key = (template_data['stage_number'], template_data['task_order'])
                    processed_keys.add(key)
                    
                    if key in existing_map:
                        # 기존 템플릿 업데이트
                        existing_template = existing_map[key]
                        for field, value in template_data.items():
                            setattr(existing_template, field, value)
                        existing_template.is_active = True
                        result_templates.append(existing_template)
                    else:
                        # 새 템플릿 생성
                        template = ProductionTemplate(**template_data)
                        self.db.add(template)
                        result_templates.append(template)
                
                # 처리되지 않은 기존 템플릿 비활성화
                for key, template in existing_map.items():
                    if key not in processed_keys:
                        template.is_active = False
                
                self.db.flush()
                
                logger.info(f"Bulk updated {len(result_templates)} templates for {media_type}")
                return result_templates
                
        except (TemplateDuplicateError, TemplateValidationError):
            raise
        except Exception as e:
            logger.error(f"Failed to bulk update templates for {media_type}: {str(e)}")
            raise TemplateServiceError(f"템플릿 일괄 업데이트 실패: {str(e)}")
    
    def initialize_default_templates(self) -> None:
        """기본 템플릿 초기화"""
        try:
            with self.transaction():
                default_templates = self._get_default_templates()
                
                for media_type, stages in default_templates.items():
                    # 이미 템플릿이 존재하는지 확인
                    existing = self.get_templates_by_media_type(media_type)
                    if existing:
                        logger.info(f"Templates already exist for {media_type}, skipping initialization")
                        continue
                    
                    templates_created = 0
                    for stage_num, tasks in stages.items():
                        for task_order, task_data in enumerate(tasks, 1):
                            try:
                                # 안전한 기본값 계산
                                speed_b_hours = Decimal(str(task_data.get("speed_b_hours", 8.0)))
                                speed_a_hours = Decimal(str(task_data.get("speed_a_hours", speed_b_hours * Decimal('0.8'))))
                                speed_c_hours = Decimal(str(task_data.get("speed_c_hours", speed_b_hours * Decimal('1.3'))))
                                
                                template = ProductionTemplate(
                                    media_type=media_type,
                                    stage_number=stage_num,
                                    task_name=task_data.get("name", f"작업 {task_order}"),
                                    task_order=task_order,
                                    speed_a_hours=speed_a_hours,
                                    speed_b_hours=speed_b_hours,
                                    speed_c_hours=speed_c_hours,
                                    requires_review=task_data.get("requires_review", False),
                                    review_hours_a=Decimal(str(task_data.get("review_hours_a", 0.0))),
                                    review_hours_b=Decimal(str(task_data.get("review_hours_b", 0.0))),
                                    review_hours_c=Decimal(str(task_data.get("review_hours_c", 0.0))),
                                    requires_monitoring=task_data.get("requires_monitoring", False),
                                    monitoring_hours_a=Decimal(str(task_data.get("monitoring_hours_a", 0.0))),
                                    monitoring_hours_b=Decimal(str(task_data.get("monitoring_hours_b", 0.0))),
                                    monitoring_hours_c=Decimal(str(task_data.get("monitoring_hours_c", 0.0))),
                                    is_required=task_data.get("is_required", True),
                                    is_parallel=task_data.get("is_parallel", False),
                                    prerequisite_tasks=json.dumps(task_data.get("prerequisite_tasks", [])),
                                    quality_checklist=json.dumps(task_data.get("quality_checklist", [])),
                                    acceptance_criteria=self._sanitize_text(task_data.get("acceptance_criteria", ""))
                                )
                                
                                self.db.add(template)
                                templates_created += 1
                                
                            except Exception as e:
                                logger.error(f"Failed to create template for {media_type} stage {stage_num} task {task_order}: {str(e)}")
                                continue
                    
                    logger.info(f"Initialized {templates_created} default templates for {media_type}")
                
        except Exception as e:
            logger.error(f"Failed to initialize default templates: {str(e)}")
            raise TemplateServiceError(f"기본 템플릿 초기화 실패: {str(e)}")
    
    def _validate_template_data(self, data: Dict[str, Any], partial: bool = False) -> Dict[str, Any]:
        """템플릿 데이터 유효성 검증"""
        validated = {}
        
        # 필수 필드 (생성 시에만)
        if not partial:
            required_fields = ['media_type', 'stage_number', 'task_name', 'task_order', 'speed_b_hours']
            for field in required_fields:
                if field not in data:
                    raise TemplateValidationError(f"필수 필드 누락: {field}")
        
        # 미디어 타입 검증
        if 'media_type' in data:
            if data['media_type'] not in self.get_all_media_types():
                raise TemplateValidationError(f"지원하지 않는 미디어 타입: {data['media_type']}")
            validated['media_type'] = data['media_type']
        
        # 단계 번호 검증
        if 'stage_number' in data:
            stage_number = int(data['stage_number'])
            if not (1 <= stage_number <= 4):
                raise TemplateValidationError("단계 번호는 1-4 사이여야 합니다")
            validated['stage_number'] = stage_number
        
        # 작업 순서 검증
        if 'task_order' in data:
            task_order = int(data['task_order'])
            if task_order < 1:
                raise TemplateValidationError("작업 순서는 1 이상이어야 합니다")
            validated['task_order'] = task_order
        
        # 시간 필드들 Decimal 변환
        time_fields = [
            'speed_a_hours', 'speed_b_hours', 'speed_c_hours',
            'review_hours_a', 'review_hours_b', 'review_hours_c',
            'monitoring_hours_a', 'monitoring_hours_b', 'monitoring_hours_c'
        ]
        
        for field in time_fields:
            if field in data:
                try:
                    value = Decimal(str(data[field]))
                    if value < 0:
                        raise TemplateValidationError(f"{field}는 음수가 될 수 없습니다")
                    validated[field] = value
                except (ValueError, TypeError):
                    raise TemplateValidationError(f"{field}는 유효한 숫자여야 합니다")
        
        # 불린 필드들
        bool_fields = ['requires_review', 'requires_monitoring', 'is_required', 'is_parallel', 'is_active']
        for field in bool_fields:
            if field in data:
                validated[field] = bool(data[field])
        
        # 텍스트 필드들 (XSS 방지)
        text_fields = ['task_name', 'acceptance_criteria']
        for field in text_fields:
            if field in data:
                validated[field] = self._sanitize_text(str(data[field]))
        
        return validated
    
    def _check_template_duplicate(self, media_type: str, stage_number: int, task_order: int, exclude_id: Optional[int] = None) -> bool:
        """템플릿 중복 확인"""
        try:
            statement = (
                select(ProductionTemplate)
                .where(ProductionTemplate.media_type == media_type)
                .where(ProductionTemplate.stage_number == stage_number)
                .where(ProductionTemplate.task_order == task_order)
                .where(ProductionTemplate.is_active == True)
            )
            
            if exclude_id:
                statement = statement.where(ProductionTemplate.id != exclude_id)
            
            existing = self.db.exec(statement).first()
            return existing is not None
            
        except Exception:
            # 중복 체크 실패 시 안전하게 중복 있다고 가정
            return True
    
    def _serialize_json_fields(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """JSON 필드들 직렬화"""
        json_fields = ['prerequisite_tasks', 'quality_checklist']
        
        for field in json_fields:
            if field in data:
                value = data[field]
                if isinstance(value, (dict, list)):
                    data[field] = json.dumps(value, ensure_ascii=False)
                elif isinstance(value, str):
                    # 이미 JSON 문자열인지 확인
                    try:
                        json.loads(value)
                        data[field] = value
                    except json.JSONDecodeError:
                        # JSON이 아닌 문자열은 리스트로 감싸서 저장
                        data[field] = json.dumps([value], ensure_ascii=False)
                else:
                    data[field] = json.dumps([], ensure_ascii=False)
        
        return data
    
    def _sanitize_text(self, text: str) -> str:
        """텍스트 XSS 방지 및 정리"""
        if not text:
            return ""
        
        # 기본적인 HTML 태그 제거
        import re
        text = re.sub(r'<[^>]+>', '', text)
        
        # 스크립트 관련 위험 요소 제거
        dangerous_patterns = [
            r'javascript:', r'vbscript:', r'onload=', r'onerror=', 
            r'onclick=', r'onmouseover=', r'<script', r'</script>'
        ]
        
        for pattern in dangerous_patterns:
            text = re.sub(pattern, '', text, flags=re.IGNORECASE)
        
        return text.strip()
    
    def _get_default_templates(self) -> Dict[str, Dict[int, List[Dict[str, Any]]]]:
        """통일된 기본 템플릿 데이터"""
        
        # 모든 미디어 타입에 동일한 템플릿 적용
        standard_template = {
            1: [  # 1단계: 자료 준비 및 섭외
                {
                    "name": "자료 준비 및 섭외 체크",
                    "speed_b_hours": 2.0,
                    "speed_a_hours": 1.5,
                    "speed_c_hours": 3.0,
                    "is_required": True,
                    "quality_checklist": [
                        {"id": 1, "item": "영상 원본 파일 확보", "required": True, "checked": False},
                        {"id": 2, "item": "시나리오/대본 확보", "required": True, "checked": False},
                        {"id": 3, "item": "필요 인력 섭외 완료", "required": True, "checked": False},
                        {"id": 4, "item": "제작 가이드라인 검토", "required": True, "checked": False}
                    ],
                    "acceptance_criteria": "모든 필수 자료 확보 및 인력 섭외 완료"
                }
            ],
            2: [  # 2단계: 대본/스크립트 작성
                {
                    "name": "초안 작성",
                    "speed_b_hours": 8.0,
                    "speed_a_hours": 6.0,
                    "speed_c_hours": 10.0,
                    "is_required": True,
                    "acceptance_criteria": "초안 작성 완료"
                },
                {
                    "name": "1차 검수",
                    "speed_b_hours": 2.0,
                    "speed_a_hours": 1.5,
                    "speed_c_hours": 3.0,
                    "requires_review": True,
                    "review_hours_a": 1.5,
                    "review_hours_b": 2.0,
                    "review_hours_c": 3.0,
                    "acceptance_criteria": "검수 완료 및 수정사항 도출"
                },
                {
                    "name": "수정 작업",
                    "speed_b_hours": 4.0,
                    "speed_a_hours": 3.0,
                    "speed_c_hours": 5.0,
                    "is_required": True,
                    "acceptance_criteria": "수정사항 반영 완료"
                },
                {
                    "name": "최종 모니터링",
                    "speed_b_hours": 2.0,
                    "speed_a_hours": 1.5,
                    "speed_c_hours": 2.5,
                    "requires_monitoring": True,
                    "monitoring_hours_a": 1.5,
                    "monitoring_hours_b": 2.0,
                    "monitoring_hours_c": 2.5,
                    "acceptance_criteria": "최종 품질 확인 완료"
                }
            ],
            3: [  # 3단계: 제작/편집
                {
                    "name": "메인 제작 작업",
                    "speed_b_hours": 8.0,
                    "speed_a_hours": 6.0,
                    "speed_c_hours": 10.0,
                    "is_required": True,
                    "acceptance_criteria": "제작 완료"
                },
                {
                    "name": "편집 및 후반작업",
                    "speed_b_hours": 4.0,
                    "speed_a_hours": 3.0,
                    "speed_c_hours": 5.0,
                    "is_required": True,
                    "acceptance_criteria": "편집 및 동기화 완료"
                },
                {
                    "name": "품질 검수",
                    "speed_b_hours": 2.0,
                    "speed_a_hours": 1.5,
                    "speed_c_hours": 3.0,
                    "requires_review": True,
                    "review_hours_a": 1.5,
                    "review_hours_b": 2.0,
                    "review_hours_c": 3.0,
                    "acceptance_criteria": "품질 기준 통과"
                }
            ],
            4: [  # 4단계: 완료/배포
                {
                    "name": "최종 파일 생성",
                    "speed_b_hours": 1.0,
                    "speed_a_hours": 0.5,
                    "speed_c_hours": 1.5,
                    "is_required": True,
                    "acceptance_criteria": "배포용 파일 생성 완료"
                },
                {
                    "name": "배포 준비",
                    "speed_b_hours": 1.0,
                    "speed_a_hours": 0.5,
                    "speed_c_hours": 1.5,
                    "is_required": True,
                    "acceptance_criteria": "배포 준비 완료"
                }
            ]
        }
        
        # 모든 미디어 타입에 동일한 템플릿 적용
        all_media_types = ['AD', 'CC', 'SL', 'AI', 'CI', 'SI', 'AR', 'CR', 'SR']
        return {media_type: standard_template for media_type in all_media_types}


# ── 헬퍼 함수들 ──────────────────────────────────────────────────────────────

def get_template_service(db: Session) -> ProductionTemplateService:
    """템플릿 서비스 인스턴스 생성"""
    return ProductionTemplateService(db)


def validate_media_type(media_type: str) -> bool:
    """미디어 타입 유효성 검증"""
    valid_types = ['AD', 'CC', 'SL', 'AI', 'CI', 'SI', 'AR', 'CR', 'SR']
    return media_type in valid_types


def validate_speed_type(speed_type: str) -> bool:
    """속도 타입 유효성 검증"""
    return speed_type in ['A', 'B', 'C']


def calculate_estimated_hours(base_hours: Decimal, speed_type: str) -> Decimal:
    """속도 타입별 예상 시간 계산"""
    multipliers = {
        'A': Decimal('0.8'),  # 빠름 - 20% 단축
        'B': Decimal('1.0'),  # 보통 - 기본
        'C': Decimal('1.3'),  # 여유 - 30% 여유
    }
    
    multiplier = multipliers.get(speed_type, Decimal('1.0'))
    return base_hours * multiplier
