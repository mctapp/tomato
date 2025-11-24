# app/routes/admin_production_templates.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session
from typing import List, Dict, Any, Optional
from decimal import Decimal
import json
import logging

from app.dependencies.auth import get_admin_user
from app.models.users import User
from app.models.production_template import ProductionTemplate
from app.services.production_template_service import ProductionTemplateService
from app.db import get_session

# 중앙화된 Enum import
from app.models.enums import (
    MediaType, StageNumber, WorkSpeedType,
    get_media_type_name
)

# Import centralized schemas
from app.schemas.production_management import (
    ProductionTemplateResponse,
    ProductionTemplateCreate,
    ProductionTemplateUpdate,
    MediaTypeTemplatesResponse,
    MediaTypeInfo,
    HoursEstimationResponse
)

# 로깅 설정
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin/api/production/templates", tags=["Admin Production Templates"])

# ── 헬퍼 함수 ──────────────────────────────────────────────────────────

def safe_float(value: Any) -> float:
    """Decimal이나 기타 숫자 타입을 안전하게 float로 변환"""
    if value is None:
        return 0.0
    if isinstance(value, Decimal):
        return float(value)
    return float(value)

def validate_json_field(value: Any, field_name: str) -> Optional[Dict]:
    """JSON 필드의 타입을 검증하고 변환"""
    if value is None:
        return None
    
    if isinstance(value, str):
        try:
            return json.loads(value)
        except json.JSONDecodeError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid JSON format for {field_name}"
            )
    elif isinstance(value, (dict, list)):
        return value
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{field_name} must be a valid JSON object, array, or string"
        )

def template_to_response(template: ProductionTemplate) -> ProductionTemplateResponse:
    """템플릿 모델을 응답 스키마로 변환"""
    # JSON 필드 안전하게 처리
    def parse_json_field(field_value):
        if field_value is None:
            return []
        if isinstance(field_value, (list, dict)):
            return field_value
        if isinstance(field_value, str):
            try:
                return json.loads(field_value)
            except json.JSONDecodeError:
                return []
        return []
    
    template_dict = {
        "id": template.id,
        "media_type": template.media_type,
        "stage_number": template.stage_number,
        "task_name": template.task_name,
        "task_order": template.task_order,
        "speed_a_hours": float(template.speed_a_hours),
        "speed_b_hours": float(template.speed_b_hours),
        "speed_c_hours": float(template.speed_c_hours),
        "requires_review": template.requires_review,
        "review_hours_a": float(template.review_hours_a) if template.review_hours_a else 0.0,
        "review_hours_b": float(template.review_hours_b) if template.review_hours_b else 0.0,
        "review_hours_c": float(template.review_hours_c) if template.review_hours_c else 0.0,
        "requires_monitoring": template.requires_monitoring,
        "monitoring_hours_a": float(template.monitoring_hours_a) if template.monitoring_hours_a else 0.0,
        "monitoring_hours_b": float(template.monitoring_hours_b) if template.monitoring_hours_b else 0.0,
        "monitoring_hours_c": float(template.monitoring_hours_c) if template.monitoring_hours_c else 0.0,
        "is_required": template.is_required,
        "is_parallel": template.is_parallel,
        "prerequisite_tasks": parse_json_field(template.prerequisite_tasks),
        "quality_checklist": parse_json_field(template.quality_checklist),
        "acceptance_criteria": template.acceptance_criteria or "",
        "is_active": template.is_active,
        "created_at": template.created_at,
        "updated_at": template.updated_at
    }
    
    return ProductionTemplateResponse(**template_dict)

# ── API 엔드포인트 (순서 중요!) ──────────────────────────────────────────────────────

# 1. 고정 경로들 (매개변수 없는 경로)
@router.get("/media-types", response_model=List[MediaTypeInfo])
async def get_media_types(
    db: Session = Depends(get_session),
    current_user: User = Depends(get_admin_user)
):
    """사용 가능한 미디어 유형 목록 조회"""
    try:
        service = ProductionTemplateService(db)
        media_types = service.get_all_media_types()
        
        return [
            MediaTypeInfo(
                media_type=mt,
                media_type_name=get_media_type_name(mt)
            )
            for mt in media_types
        ]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve media types: {str(e)}"
        )

@router.post("/initialize-defaults")
async def initialize_default_templates(
    db: Session = Depends(get_session),
    current_user: User = Depends(get_admin_user)
):
    """기본 템플릿 초기화"""
    try:
        service = ProductionTemplateService(db)
        
        # 트랜잭션 처리
        try:
            service.initialize_default_templates()
            db.commit()
            return {"message": "Default templates initialized successfully"}
        except Exception as e:
            db.rollback()
            raise e
            
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to initialize default templates: {str(e)}"
        )

# 2. 더 구체적인 매개변수 경로들
@router.get("/{media_type}/hours-estimation", response_model=HoursEstimationResponse)
async def get_hours_estimation(
    media_type: str,
    work_speed_type: str = "B",
    db: Session = Depends(get_session),
    current_user: User = Depends(get_admin_user)
):
    """미디어 유형 및 작업 속도별 예상 소요 시간 계산"""
    # 작업 속도 타입 유효성 검증
    try:
        WorkSpeedType(work_speed_type)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Work speed type must be A, B, or C"
        )
    
    # 미디어 타입 유효성 검증
    try:
        MediaType(media_type)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid media type: {media_type}"
        )
    
    try:
        service = ProductionTemplateService(db)
        templates = service.get_templates_by_media_type(media_type)
        
        if not templates:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Templates not found for media type: {media_type}"
            )
        
        total_hours = 0.0
        total_review_hours = 0.0
        total_monitoring_hours = 0.0
        stage_breakdown = {}
        
        for template in templates:
            hours_info = service.get_hours_by_speed_type(template, work_speed_type)
            
            # Decimal → float 변환 보장
            main_hours = safe_float(hours_info.get('main', 0))
            review_hours = safe_float(hours_info.get('review', 0))
            monitoring_hours = safe_float(hours_info.get('monitoring', 0))
            
            stage_num = str(template.stage_number)  # string key for JSON
            if stage_num not in stage_breakdown:
                stage_breakdown[stage_num] = {
                    "stageName": f"단계 {template.stage_number}",
                    "mainHours": 0.0,
                    "reviewHours": 0.0,
                    "monitoringHours": 0.0,
                    "totalHours": 0.0
                }
            
            stage_breakdown[stage_num]["mainHours"] += main_hours
            stage_breakdown[stage_num]["reviewHours"] += review_hours
            stage_breakdown[stage_num]["monitoringHours"] += monitoring_hours
            stage_breakdown[stage_num]["totalHours"] += (main_hours + review_hours + monitoring_hours)
            
            total_hours += main_hours
            total_review_hours += review_hours
            total_monitoring_hours += monitoring_hours
        
        total_all_hours = total_hours + total_review_hours + total_monitoring_hours
        estimated_days = round(total_all_hours / 8, 1) if total_all_hours > 0 else 0.0
        
        return HoursEstimationResponse(
            media_type=media_type,
            media_type_name=get_media_type_name(media_type),
            work_speed_type=work_speed_type,
            total_main_hours=total_hours,
            total_review_hours=total_review_hours,
            total_monitoring_hours=total_monitoring_hours,
            total_hours=total_all_hours,
            estimated_days=estimated_days,
            stage_breakdown=stage_breakdown
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to calculate hours estimation: {str(e)}"
        )

@router.get("/{media_type}/stage/{stage_number}", response_model=List[ProductionTemplateResponse])
async def get_templates_by_stage(
    media_type: str,
    stage_number: int,
    db: Session = Depends(get_session),
    current_user: User = Depends(get_admin_user)
):
    """특정 미디어 유형의 특정 단계 템플릿 조회"""
    # 단계 번호 유효성 검증
    try:
        StageNumber(stage_number)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Stage number must be between 1 and 4"
        )
    
    # 미디어 타입 유효성 검증
    try:
        MediaType(media_type)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid media type: {media_type}"
        )
    
    try:
        service = ProductionTemplateService(db)
        templates = service.get_templates_by_stage(media_type, stage_number)
        
        return [template_to_response(template) for template in templates]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve stage templates: {str(e)}"
        )

@router.put("/{media_type}/bulk", response_model=List[ProductionTemplateResponse])
async def bulk_update_templates(
    media_type: str,
    templates_data: List[ProductionTemplateCreate],
    db: Session = Depends(get_session),
    current_user: User = Depends(get_admin_user)
):
    """미디어 유형별 템플릿 일괄 업데이트"""
    # 미디어 타입 유효성 검증
    try:
        MediaType(media_type)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid media type: {media_type}"
        )
    
    # 모든 템플릿의 media_type 검증 (보안 강화)
    for i, template_data in enumerate(templates_data):
        if template_data.media_type != media_type:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Template at index {i}: media_type must be {media_type}, got {template_data.media_type}"
            )
    
    # 중복 검사 (같은 요청 내에서)
    seen_keys = set()
    for template_data in templates_data:
        key = (template_data.media_type, template_data.stage_number, template_data.task_order)
        if key in seen_keys:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Duplicate template in request: media_type={key[0]}, stage={key[1]}, task_order={key[2]}"
            )
        seen_keys.add(key)
    
    try:
        service = ProductionTemplateService(db)
        
        # 모델 데이터로 변환 (snake_case)
        validated_templates_data = [
            template_data.model_dump(by_alias=False) 
            for template_data in templates_data
        ]
        
        # 트랜잭션 처리
        try:
            templates = service.bulk_update_templates(media_type, validated_templates_data)
            db.commit()
            return [template_to_response(template) for template in templates]
        except Exception as e:
            db.rollback()
            raise e
            
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to bulk update templates: {str(e)}"
        )

# 3. 일반적인 매개변수 경로들
@router.get("/{media_type}", response_model=MediaTypeTemplatesResponse)
async def get_templates_by_media_type(
    media_type: str,
    db: Session = Depends(get_session),
    current_user: User = Depends(get_admin_user)
):
    """특정 미디어 유형의 모든 템플릿 조회 (단계별 그룹화)"""
    try:
        MediaType(media_type)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid media type: {media_type}"
        )
    
    try:
        service = ProductionTemplateService(db)
        templates = service.get_templates_by_media_type(media_type)
        
        # 템플릿이 없으면 자동으로 기본값 초기화
        if not templates:
            logger.info(f"No templates found for {media_type}, initializing defaults")
            service.initialize_default_templates()
            db.commit()
            templates = service.get_templates_by_media_type(media_type)
        
        # 단계별로 그룹화
        stages = {}
        for template in templates:
            stage_num = template.stage_number
            if stage_num not in stages:
                stages[stage_num] = []
            stages[stage_num].append(template_to_response(template))
        
        return MediaTypeTemplatesResponse(
            media_type=media_type,
            media_type_name=get_media_type_name(media_type),
            stages=stages
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve templates: {str(e)}"
        )

@router.post("/{media_type}", response_model=ProductionTemplateResponse)
async def create_template(
    media_type: str,
    template_data: ProductionTemplateCreate,
    db: Session = Depends(get_session),
    current_user: User = Depends(get_admin_user)
):
    """새 템플릿 생성"""
    # media_type 일치 확인 (보안 강화)
    if template_data.media_type != media_type:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Media type in URL ({media_type}) and request body ({template_data.media_type}) must match"
        )
    
    try:
        service = ProductionTemplateService(db)
        
        # 중복 체크 (UniqueConstraint 위반 방지)
        existing = service.check_template_exists(
            media_type, 
            template_data.stage_number, 
            template_data.task_order
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Template already exists for media_type={media_type}, stage={template_data.stage_number}, task_order={template_data.task_order}"
            )
        
        # 모델 데이터로 변환 (snake_case)
        create_data = template_data.model_dump(by_alias=False)
        
        # 트랜잭션 처리
        try:
            template = service.create_template(create_data)
            db.commit()
            return template_to_response(template)
        except Exception as e:
            db.rollback()
            raise e
            
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create template: {str(e)}"
        )

# 4. ID 기반 경로들
@router.put("/{template_id}", response_model=ProductionTemplateResponse)
async def update_template(
    template_id: int,
    update_data: ProductionTemplateUpdate,
    db: Session = Depends(get_session),
    current_user: User = Depends(get_admin_user)
):
    """템플릿 수정"""
    try:
        service = ProductionTemplateService(db)
        
        # 템플릿 존재 확인
        existing_template = service.get_template_by_id(template_id)
        if not existing_template:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Template not found"
            )
        
        # None이 아닌 필드만 업데이트 (snake_case)
        update_dict = update_data.model_dump(exclude_unset=True, by_alias=False)
        
        # task_order 변경 시 중복 체크
        if 'task_order' in update_dict:
            existing_with_order = service.check_template_exists(
                existing_template.media_type,
                existing_template.stage_number,
                update_dict['task_order']
            )
            if existing_with_order and existing_with_order.id != template_id:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Another template already exists with task_order={update_dict['task_order']}"
                )
        
        # 트랜잭션 처리
        try:
            template = service.update_template(template_id, update_dict)
            db.commit()
            return template_to_response(template)
        except Exception as e:
            db.rollback()
            raise e
            
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update template: {str(e)}"
        )

@router.delete("/{template_id}")
async def delete_template(
    template_id: int,
    db: Session = Depends(get_session),
    current_user: User = Depends(get_admin_user)
):
    """템플릿 삭제 (소프트 삭제)"""
    try:
        service = ProductionTemplateService(db)
        
        # 트랜잭션 처리
        try:
            success = service.delete_template(template_id)
            if not success:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Template not found"
                )
            db.commit()
            return {"message": "Template deleted successfully"}
        except Exception as e:
            db.rollback()
            raise e
            
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete template: {str(e)}"
        )
