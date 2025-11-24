# app/models/production_memo.py
from sqlmodel import SQLModel, Field, Column, Relationship
from typing import Optional, List, TYPE_CHECKING
from datetime import datetime
from sqlalchemy import DateTime, CheckConstraint, Text, ForeignKey
from sqlalchemy.sql import func
import re

# 중앙화된 Enum import
from app.models.enums import (
    MemoType, PriorityLevel,
    get_enum_constraint_string
)

if TYPE_CHECKING:
    from app.models.production_project import ProductionProject
    from app.models.production_task import ProductionTask
    from app.models.users import User


class ProductionMemo(SQLModel, table=True):
    __tablename__ = "production_memos"
    __table_args__ = (
        CheckConstraint(
            f"memo_type IN ({get_enum_constraint_string(MemoType)})", 
            name="check_memo_type"
        ),
        CheckConstraint(
            f"priority_level IN ({get_enum_constraint_string(PriorityLevel)})", 
            name="check_priority_level"
        ),
        CheckConstraint("LENGTH(TRIM(memo_content)) > 0", name="check_memo_content_not_empty"),
        CheckConstraint("LENGTH(memo_content) <= 10000", name="check_memo_content_length"),
        {"extend_existing": True}
    )
    
    # ── 기본 키 ────────────────────────────────────────────────────────────
    id: Optional[int] = Field(default=None, primary_key=True)
    
    # ── FK ────────────────────────────────────────────────────────────────
    production_project_id: int = Field(foreign_key="production_projects.id", index=True)
    
    # production_task_id는 Optional이지만 FK 무결성 보장
    # ondelete='SET NULL'로 태스크 삭제 시 메모는 프로젝트 레벨로 유지
    production_task_id: Optional[int] = Field(
        default=None, 
        sa_column=Column(
            'production_task_id',
            ForeignKey('production_tasks.id', ondelete='SET NULL'),
            nullable=True
        )
    )
    
    # ── 메모 내용 ──────────────────────────────────────────────────────────
    # 길이 제한 및 공백 검증 추가
    memo_content: str = Field(
        min_length=1,
        max_length=10000,
        sa_column=Column(Text)
    )
    memo_type: str = Field(default=MemoType.GENERAL.value)
    priority_level: int = Field(default=PriorityLevel.MEDIUM.value)
    
    # ── 태그 및 분류 ────────────────────────────────────────────────────────
    # 태그는 쉼표로 구분된 문자열로 통일 (예: "태그1,태그2,태그3")
    tags: Optional[str] = Field(
        default=None, 
        max_length=500,
        description="쉼표로 구분된 태그 목록 (예: 태그1,태그2,태그3)"
    )
    is_pinned: bool = Field(default=False)
    
    # ── 작성자 정보 ──────────────────────────────────────────────────────────
    # ondelete='RESTRICT'로 작성자 삭제 시 메모 먼저 처리하도록 강제
    created_by: int = Field(
        sa_column=Column(
            'created_by',
            ForeignKey('users.id', ondelete='RESTRICT'),
            nullable=False
        )
    )
    
    # 수정자는 삭제되어도 메모는 유지 (ondelete='SET NULL')
    updated_by: Optional[int] = Field(
        default=None,
        sa_column=Column(
            'updated_by', 
            ForeignKey('users.id', ondelete='SET NULL'),
            nullable=True
        )
    )
    
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
    
    # ── 관계 설정 ──────────────────────────────────────────────────────────
    production_project: Optional["ProductionProject"] = Relationship(back_populates="memos")
    
    production_task: Optional["ProductionTask"] = Relationship(
        back_populates="memos",
        sa_relationship_kwargs={
            "foreign_keys": "[ProductionMemo.production_task_id]",
            "lazy": "select"  # 일관된 lazy loading
        }
    )
    
    # 작성자 정보
    created_by_user: Optional["User"] = Relationship(
        sa_relationship_kwargs={
            "foreign_keys": "[ProductionMemo.created_by]",
            "lazy": "select"
        }
    )
    
    # 수정자 정보
    updated_by_user: Optional["User"] = Relationship(
        sa_relationship_kwargs={
            "foreign_keys": "[ProductionMemo.updated_by]",
            "lazy": "select"
        }
    )
    
    # ── 유틸리티 메서드 ────────────────────────────────────────────────────
    def update_timestamp(self, updated_by_user_id: Optional[int] = None) -> None:
        """updated_at을 현재 시간으로 수동 갱신 (DB 호환성을 위해)"""
        self.updated_at = datetime.utcnow()
        if updated_by_user_id:
            self.updated_by = updated_by_user_id
    
    def get_priority_label(self) -> str:
        """우선순위 레벨 한글 라벨 반환"""
        labels = {
            PriorityLevel.CRITICAL.value: "긴급",
            PriorityLevel.HIGH.value: "높음",
            PriorityLevel.MEDIUM.value: "보통",
            PriorityLevel.LOW.value: "낮음",
            PriorityLevel.MINIMAL.value: "최소"
        }
        return labels.get(self.priority_level, "보통")
    
    def get_memo_type_label(self) -> str:
        """메모 타입 한글 라벨 반환"""
        labels = {
            MemoType.GENERAL.value: "일반",
            MemoType.ISSUE.value: "이슈",
            MemoType.DECISION.value: "결정",
            MemoType.REVIEW.value: "검토"
        }
        return labels.get(self.memo_type, "일반")
    
    def set_tags_from_list(self, tag_list: List[str]) -> None:
        """태그 리스트를 쉼표로 구분된 문자열로 변환하여 저장"""
        if not tag_list:
            self.tags = None
            return
        
        # 태그 정제: 공백 제거, 빈 문자열 제외, 중복 제거
        cleaned_tags = list(set([tag.strip() for tag in tag_list if tag.strip()]))
        self.tags = ",".join(cleaned_tags) if cleaned_tags else None
    
    def get_tags_as_list(self) -> List[str]:
        """쉼표로 구분된 태그 문자열을 리스트로 반환"""
        if not self.tags:
            return []
        return [tag.strip() for tag in self.tags.split(",") if tag.strip()]
    
    def has_tag(self, tag: str) -> bool:
        """특정 태그 포함 여부 확인"""
        return tag.strip() in self.get_tags_as_list()
    
    def sanitize_content(self) -> str:
        """메모 내용에서 HTML 태그 제거 및 XSS 방지"""
        if not self.memo_content:
            return ""
        
        # HTML 태그 제거
        clean_content = re.sub(r'<[^>]+>', '', self.memo_content)
        
        # 스크립트 태그 완전 제거
        clean_content = re.sub(r'<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>', '', clean_content, flags=re.IGNORECASE)
        
        # 기본 HTML 엔티티 인코딩
        clean_content = clean_content.replace('&', '&amp;')
        clean_content = clean_content.replace('<', '&lt;')
        clean_content = clean_content.replace('>', '&gt;')
        clean_content = clean_content.replace('"', '&quot;')
        clean_content = clean_content.replace("'", '&#x27;')
        
        return clean_content.strip()
    
    def soft_delete(self, deleted_by_user_id: int) -> None:
        """소프트 삭제 (is_active = False)"""
        self.is_active = False
        self.update_timestamp(deleted_by_user_id)
    
    def restore(self, restored_by_user_id: int) -> None:
        """소프트 삭제된 메모 복원"""
        self.is_active = True
        self.update_timestamp(restored_by_user_id)
    
    def is_project_level_memo(self) -> bool:
        """프로젝트 레벨 메모인지 확인 (태스크에 속하지 않은 메모)"""
        return self.production_task_id is None
    
    def get_content_preview(self, max_length: int = 100) -> str:
        """메모 내용 미리보기 (지정된 길이로 자르기)"""
        content = self.sanitize_content()
        if len(content) <= max_length:
            return content
        return content[:max_length] + "..."
    
    def to_dict(self) -> dict:
        """딕셔너리로 변환 (API 응답용)"""
        return {
            "id": self.id,
            "production_project_id": self.production_project_id,
            "production_task_id": self.production_task_id,
            "memo_content": self.memo_content,
            "memo_type": self.memo_type,
            "memo_type_label": self.get_memo_type_label(),
            "priority_level": self.priority_level,
            "priority_label": self.get_priority_label(),
            "tags": self.get_tags_as_list(),
            "is_pinned": self.is_pinned,
            "is_active": self.is_active,
            "is_project_level": self.is_project_level_memo(),
            "content_preview": self.get_content_preview(),
            "created_by": self.created_by,
            "updated_by": self.updated_by,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }
    
    def __repr__(self) -> str:
        return (
            f"<ProductionMemo(id={self.id}, "
            f"type={self.memo_type}, "
            f"priority={self.priority_level}, "
            f"project_id={self.production_project_id})>"
        )


# ── 유틸리티 함수들 ──────────────────────────────────────────────────────────

def validate_memo_type(memo_type: str) -> bool:
    """메모 타입 유효성 검증"""
    try:
        MemoType(memo_type)
        return True
    except ValueError:
        return False


def validate_priority_level(level: int) -> bool:
    """우선순위 레벨 유효성 검증"""
    try:
        PriorityLevel(level)
        return True
    except ValueError:
        return False


def get_memo_type_choices() -> list[dict]:
    """메모 타입 선택지 반환 (API용)"""
    return [
        {
            "value": mt.value,
            "label": mt.name,
            "display": {
                MemoType.GENERAL.value: "일반",
                MemoType.ISSUE.value: "이슈",
                MemoType.DECISION.value: "결정",
                MemoType.REVIEW.value: "검토"
            }.get(mt.value, mt.value)
        }
        for mt in MemoType
    ]


def get_priority_level_choices() -> list[dict]:
    """우선순위 레벨 선택지 반환 (API용)"""
    return [
        {
            "value": pl.value,
            "label": pl.name,
            "display": {
                PriorityLevel.CRITICAL.value: "긴급",
                PriorityLevel.HIGH.value: "높음",
                PriorityLevel.MEDIUM.value: "보통",
                PriorityLevel.LOW.value: "낮음",
                PriorityLevel.MINIMAL.value: "최소"
            }.get(pl.value, str(pl.value))
        }
        for pl in PriorityLevel
    ]
