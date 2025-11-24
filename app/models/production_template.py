# app/models/production_template.py
from sqlmodel import SQLModel, Field, Column
from typing import Optional, List, Dict, Any
from datetime import datetime
from decimal import Decimal
from sqlalchemy import DateTime, CheckConstraint, DECIMAL, JSON, UniqueConstraint
from sqlalchemy.sql import func

# 중앙화된 Enum import
from app.models.enums import (
    MediaType, StageNumber, WorkSpeedType,
    get_enum_constraint_string
)


class ProductionTemplate(SQLModel, table=True):
    __tablename__ = "production_templates"
    __table_args__ = (
        CheckConstraint(
            f"media_type IN ({get_enum_constraint_string(MediaType)})", 
            name="check_media_type"
        ),
        CheckConstraint(
            f"stage_number IN ({get_enum_constraint_string(StageNumber)})", 
            name="check_stage_number"
        ),
        CheckConstraint("task_order >= 0", name="check_task_order"),
        CheckConstraint("speed_a_hours >= 0", name="check_speed_a_hours"),
        CheckConstraint("speed_b_hours >= 0", name="check_speed_b_hours"),
        CheckConstraint("speed_c_hours >= 0", name="check_speed_c_hours"),
        CheckConstraint("review_hours_a >= 0", name="check_review_hours_a"),
        CheckConstraint("review_hours_b >= 0", name="check_review_hours_b"),
        CheckConstraint("review_hours_c >= 0", name="check_review_hours_c"),
        CheckConstraint("monitoring_hours_a >= 0", name="check_monitoring_hours_a"),
        CheckConstraint("monitoring_hours_b >= 0", name="check_monitoring_hours_b"),
        CheckConstraint("monitoring_hours_c >= 0", name="check_monitoring_hours_c"),
        # 미디어 타입, 단계, 작업 순서 조합의 유일성 보장
        UniqueConstraint('media_type', 'stage_number', 'task_order', name='unique_media_stage_order'),
        {"extend_existing": True}
    )
    
    # ── 기본 키 ────────────────────────────────────────────────────────────
    id: Optional[int] = Field(default=None, primary_key=True)
    
    # ── 미디어 및 단계 정보 ───────────────────────────────────────────────────
    media_type: str = Field(max_length=2)
    stage_number: int = Field(ge=1, le=4)
    task_name: str = Field(max_length=100, min_length=1)
    task_order: int = Field(default=0, ge=0)
    
    # ── 작업 속도 유형별 기본 소요 시간 (A/B/C) ─────────────────────────────────
    # Decimal 타입으로 통일하여 정밀도 문제 해결
    speed_a_hours: Decimal = Field(ge=0, sa_column=Column(DECIMAL(6,2)))  # A유형(빠름) 소요 시간
    speed_b_hours: Decimal = Field(ge=0, sa_column=Column(DECIMAL(6,2)))  # B유형(보통) 소요 시간  
    speed_c_hours: Decimal = Field(ge=0, sa_column=Column(DECIMAL(6,2)))  # C유형(느림) 소요 시간
    
    # ── 감수/모니터링 설정 ────────────────────────────────────────────────────
    requires_review: bool = Field(default=False)  # 감수 필요 여부
    review_hours_a: Decimal = Field(default=Decimal('0.0'), ge=0, sa_column=Column(DECIMAL(6,2)))  # A유형 감수 시간
    review_hours_b: Decimal = Field(default=Decimal('0.0'), ge=0, sa_column=Column(DECIMAL(6,2)))  # B유형 감수 시간
    review_hours_c: Decimal = Field(default=Decimal('0.0'), ge=0, sa_column=Column(DECIMAL(6,2)))  # C유형 감수 시간
    
    requires_monitoring: bool = Field(default=False)  # 모니터링 필요 여부
    monitoring_hours_a: Decimal = Field(default=Decimal('0.0'), ge=0, sa_column=Column(DECIMAL(6,2)))  # A유형 모니터링 시간
    monitoring_hours_b: Decimal = Field(default=Decimal('0.0'), ge=0, sa_column=Column(DECIMAL(6,2)))  # B유형 모니터링 시간
    monitoring_hours_c: Decimal = Field(default=Decimal('0.0'), ge=0, sa_column=Column(DECIMAL(6,2)))  # C유형 모니터링 시간
    
    # ── 의존성 및 설정 ────────────────────────────────────────────────────────
    # JSON 필드는 실제 데이터 타입과 일치시켜 혼동 방지
    prerequisite_tasks: Optional[List[str]] = Field(default=None, sa_column=Column(JSON))  # 선행 작업 목록
    is_required: bool = Field(default=True)
    is_parallel: bool = Field(default=False)  # 병렬 작업 가능 여부
    
    # ── 품질 기준 ──────────────────────────────────────────────────────────
    quality_checklist: Optional[List[Dict[str, Any]]] = Field(default=None, sa_column=Column(JSON))  # 체크리스트
    acceptance_criteria: Optional[str] = Field(default=None, max_length=2000)
    
    # ── 활성화 상태 (Soft Delete) ─────────────────────────────────────────
    is_active: bool = Field(default=True)
    
    # ── 타임스탬프 ────────────────────────────────────────────────────────
    created_at: Optional[datetime] = Field(
        default=None,
        sa_column=Column(
            DateTime(timezone=True),
            server_default=func.now(),
            nullable=False
        )
    )
    
    # updated_at은 애플리케이션 레벨에서 수동으로 관리하여 DB 호환성 확보
    updated_at: Optional[datetime] = Field(
        default=None,
        sa_column=Column(
            DateTime(timezone=True),
            server_default=func.now(),
            nullable=False
        )
    )
    
    # ── 유틸리티 메서드 ────────────────────────────────────────────────────
    def update_timestamp(self) -> None:
        """updated_at을 현재 시간으로 수동 갱신 (DB 호환성을 위해)"""
        self.updated_at = datetime.utcnow()
    
    def get_media_type_label(self) -> str:
        """미디어 타입 한글 라벨 반환"""
        labels = {
            MediaType.AD.value: "음성해설",
            MediaType.CC.value: "자막해설", 
            MediaType.SL.value: "수어해설",
            MediaType.AI.value: "음성소개",
            MediaType.CI.value: "자막소개",
            MediaType.SI.value: "수어소개",
            MediaType.AR.value: "음성리뷰",
            MediaType.CR.value: "자막리뷰",
            MediaType.SR.value: "수어리뷰"
        }
        return labels.get(self.media_type, "알 수 없음")
    
    def get_hours_by_speed_type(self, speed_type: str) -> Decimal:
        """작업 속도 타입에 따른 소요 시간 반환"""
        speed_mapping = {
            WorkSpeedType.A.value: self.speed_a_hours,
            WorkSpeedType.B.value: self.speed_b_hours,
            WorkSpeedType.C.value: self.speed_c_hours
        }
        return speed_mapping.get(speed_type, self.speed_b_hours)
    
    def get_review_hours_by_speed_type(self, speed_type: str) -> Decimal:
        """작업 속도 타입에 따른 감수 시간 반환"""
        if not self.requires_review:
            return Decimal('0.0')
        
        speed_mapping = {
            WorkSpeedType.A.value: self.review_hours_a,
            WorkSpeedType.B.value: self.review_hours_b,
            WorkSpeedType.C.value: self.review_hours_c
        }
        return speed_mapping.get(speed_type, self.review_hours_b)
    
    def get_monitoring_hours_by_speed_type(self, speed_type: str) -> Decimal:
        """작업 속도 타입에 따른 모니터링 시간 반환"""
        if not self.requires_monitoring:
            return Decimal('0.0')
        
        speed_mapping = {
            WorkSpeedType.A.value: self.monitoring_hours_a,
            WorkSpeedType.B.value: self.monitoring_hours_b,
            WorkSpeedType.C.value: self.monitoring_hours_c
        }
        return speed_mapping.get(speed_type, self.monitoring_hours_c)
    
    def get_total_hours_by_speed_type(self, speed_type: str) -> Decimal:
        """작업 속도 타입에 따른 총 소요 시간 (작업 + 감수 + 모니터링)"""
        base_hours = self.get_hours_by_speed_type(speed_type)
        review_hours = self.get_review_hours_by_speed_type(speed_type)
        monitoring_hours = self.get_monitoring_hours_by_speed_type(speed_type)
        
        return base_hours + review_hours + monitoring_hours
    
    def set_prerequisite_tasks(self, tasks: List[str]) -> None:
        """선행 작업 목록 설정"""
        if not tasks:
            self.prerequisite_tasks = None
            return
        
        # 중복 제거 및 정제
        cleaned_tasks = list(set([task.strip() for task in tasks if task.strip()]))
        self.prerequisite_tasks = cleaned_tasks if cleaned_tasks else None
    
    def add_quality_checklist_item(self, item: str, required: bool = True, description: str = "") -> None:
        """품질 체크리스트 항목 추가"""
        if not self.quality_checklist:
            self.quality_checklist = []
        
        checklist_item = {
            "id": len(self.quality_checklist) + 1,
            "item": item.strip(),
            "required": required,
            "description": description.strip(),
            "checked": False
        }
        
        self.quality_checklist.append(checklist_item)
    
    def get_quality_checklist_count(self) -> Dict[str, int]:
        """품질 체크리스트 통계 반환"""
        if not self.quality_checklist:
            return {"total": 0, "required": 0, "optional": 0}
        
        total = len(self.quality_checklist)
        required = sum(1 for item in self.quality_checklist if item.get("required", True))
        optional = total - required
        
        return {"total": total, "required": required, "optional": optional}
    
    def sanitize_acceptance_criteria(self) -> str:
        """승인 기준 텍스트 안전화 (XSS 방지)"""
        if not self.acceptance_criteria:
            return ""
        
        # 기본 HTML 엔티티 인코딩
        safe_text = self.acceptance_criteria.replace('&', '&amp;')
        safe_text = safe_text.replace('<', '&lt;')
        safe_text = safe_text.replace('>', '&gt;')
        safe_text = safe_text.replace('"', '&quot;')
        safe_text = safe_text.replace("'", '&#x27;')
        
        return safe_text.strip()
    
    def clone_for_media_type(self, new_media_type: str) -> "ProductionTemplate":
        """다른 미디어 타입용으로 템플릿 복제"""
        return ProductionTemplate(
            media_type=new_media_type,
            stage_number=self.stage_number,
            task_name=self.task_name,
            task_order=self.task_order,
            speed_a_hours=self.speed_a_hours,
            speed_b_hours=self.speed_b_hours,
            speed_c_hours=self.speed_c_hours,
            requires_review=self.requires_review,
            review_hours_a=self.review_hours_a,
            review_hours_b=self.review_hours_b,
            review_hours_c=self.review_hours_c,
            requires_monitoring=self.requires_monitoring,
            monitoring_hours_a=self.monitoring_hours_a,
            monitoring_hours_b=self.monitoring_hours_b,
            monitoring_hours_c=self.monitoring_hours_c,
            prerequisite_tasks=self.prerequisite_tasks.copy() if self.prerequisite_tasks else None,
            is_required=self.is_required,
            is_parallel=self.is_parallel,
            quality_checklist=self.quality_checklist.copy() if self.quality_checklist else None,
            acceptance_criteria=self.acceptance_criteria,
            is_active=True
        )
