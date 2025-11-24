# app/models/production_archives.py
from sqlmodel import SQLModel, Field, Column, Relationship
from typing import Optional, TYPE_CHECKING, Dict, Any, List
from datetime import date, datetime
from decimal import Decimal
from sqlalchemy import DateTime, CheckConstraint, DECIMAL, JSON, Text
from sqlalchemy.sql import func
from pydantic import validator
import json

# 중앙화된 Enum import
from app.models.enums import (
    MediaType, WorkSpeedType, ProjectSuccessRating,
    get_enum_constraint_string
)

if TYPE_CHECKING:
    from app.models.access_asset import AccessAsset
    from app.models.users import User

# ── 메인 모델 ─────────────────────────────────────────────────────────────

class ProductionArchive(SQLModel, table=True):
    __tablename__ = "production_archives"
    __table_args__ = (
        CheckConstraint(
            f"media_type IN ({get_enum_constraint_string(MediaType)})", 
            name="check_media_type"
        ),
        CheckConstraint(
            f"work_speed_type IN ({get_enum_constraint_string(WorkSpeedType)})", 
            name="check_work_speed_type"
        ),
        CheckConstraint(
            f"project_success_rating BETWEEN {ProjectSuccessRating.POOR.value} AND {ProjectSuccessRating.EXCELLENT.value}", 
            name="check_project_success_rating"
        ),
        CheckConstraint("total_days >= 0", name="check_total_days_positive"),
        CheckConstraint("total_hours >= 0", name="check_total_hours_positive"),
        CheckConstraint("overall_efficiency >= 0", name="check_efficiency_positive"),
        CheckConstraint("average_quality >= 0 AND average_quality <= 5", name="check_quality_range"),
        CheckConstraint("rework_percentage >= 0 AND rework_percentage <= 100", name="check_rework_percentage_range"),
        {"extend_existing": True}
    )
    
    # ── 기본 키 ────────────────────────────────────────────────────────────
    id: Optional[int] = Field(default=None, primary_key=True)
    
    # ── FK 및 참조 정보 ─────────────────────────────────────────────────────
    original_project_id: int = Field(description="원본 ProductionProject ID (삭제되어도 기록 유지)")
    access_asset_id: int = Field(foreign_key="access_assets.id", description="접근성 에셋 ID")
    
    # ── 프로젝트 기본 정보 ──────────────────────────────────────────────────
    movie_title: str = Field(max_length=200, description="영화 제목")
    media_type: str = Field(max_length=2, description="미디어 타입")
    asset_name: str = Field(max_length=200, description="에셋 이름")
    work_speed_type: str = Field(max_length=1, description="작업 속도 타입")  # A/B/C
    
    # ── 완료 정보 ──────────────────────────────────────────────────────────
    start_date: date = Field(description="프로젝트 시작일")
    completion_date: date = Field(description="프로젝트 완료일")
    total_days: int = Field(ge=0, description="총 소요 일수")
    total_hours: Optional[Decimal] = Field(
        default=None, 
        sa_column=Column(DECIMAL(8,2)), 
        description="총 작업 시간"
    )
    
    # ── 참여자 정보 (JSON - 크레디트 기반) ───────────────────────────────────
    # server_default로 변경하여 mutable default 문제 해결
    participants: Dict[str, Any] = Field(
        default_factory=dict,
        sa_column=Column(JSON, nullable=False, server_default='{}'), 
        description="전체 참여자 목록과 역할 (JSON 형태)"
    )
    
    # ── 성과 요약 ──────────────────────────────────────────────────────────
    overall_efficiency: Optional[Decimal] = Field(
        default=None, 
        sa_column=Column(DECIMAL(5,2)), 
        description="전체 효율성"
    )
    average_quality: Optional[Decimal] = Field(
        default=None, 
        sa_column=Column(DECIMAL(3,1)), 
        description="평균 품질 (1-5)"
    )
    total_cost: Optional[Decimal] = Field(
        default=None, 
        sa_column=Column(DECIMAL(12,2)), 
        description="총 비용"
    )
    rework_percentage: Optional[Decimal] = Field(
        default=None, 
        sa_column=Column(DECIMAL(5,2)), 
        description="재작업 비율 (%)"
    )
    
    # ── 단계별 소요 시간 ────────────────────────────────────────────────────
    # server_default로 변경
    stage_durations: Optional[Dict[str, int]] = Field(
        default_factory=dict, 
        sa_column=Column(JSON, nullable=True, server_default='{}'), 
        description="단계별 소요 시간 (JSON 형태: {stage_1: 3, stage_2: 7, ...})"
    )
    
    # ── 최종 평가 ──────────────────────────────────────────────────────────
    project_success_rating: Optional[int] = Field(
        default=None, 
        ge=1, 
        le=5, 
        description="프로젝트 성공도 (1-5)"
    )
    lessons_learned: Optional[str] = Field(
        default=None, 
        sa_column=Column(Text), 
        description="교훈 및 개선점"
    )
    completion_notes: Optional[str] = Field(
        default=None, 
        sa_column=Column(Text), 
        description="완료 시 특이사항"
    )
    
    # ── 아카이브 정보 ──────────────────────────────────────────────────────
    archived_at: datetime = Field(
        default_factory=datetime.utcnow,
        sa_column=Column(
            DateTime(timezone=True),
            server_default=func.now(),
            nullable=False
        ),
        description="아카이브 생성 시각"
    )
    archived_by: Optional[int] = Field(
        default=None, 
        foreign_key="users.id", 
        description="아카이브 생성자 ID"
    )
    
    # ── 관계 설정 ──────────────────────────────────────────────────────────
    access_asset: Optional["AccessAsset"] = Relationship(
        sa_relationship_kwargs={
            "foreign_keys": "[ProductionArchive.access_asset_id]",
            "lazy": "select"
        }
    )
    
    archived_by_user: Optional["User"] = Relationship(
        sa_relationship_kwargs={
            "foreign_keys": "[ProductionArchive.archived_by]",
            "lazy": "select"
        }
    )
    
    # ── 검증 메서드 (JSON 필드 안전성 확보) ──────────────────────────────────
    @validator('participants', pre=True)
    def validate_participants(cls, v):
        """참여자 정보 JSON 검증"""
        if v is None:
            return {}
        
        if isinstance(v, str):
            try:
                v = json.loads(v)
            except json.JSONDecodeError:
                return {}
        
        if not isinstance(v, dict):
            return {}
        
        # 예상 구조: {"main_writer": {...}, "reviewers": [...], ...}
        allowed_keys = [
            'main_writer', 'producer', 'reviewers', 'monitors', 
            'voice_artists', 'other_staff', 'sl_interpreters'
        ]
        
        # 허용된 키만 유지
        validated = {}
        for key in allowed_keys:
            if key in v:
                validated[key] = v[key]
        
        return validated
    
    @validator('stage_durations', pre=True)
    def validate_stage_durations(cls, v):
        """단계별 소요 시간 JSON 검증"""
        if v is None:
            return {}
        
        if isinstance(v, str):
            try:
                v = json.loads(v)
            except json.JSONDecodeError:
                return {}
        
        if not isinstance(v, dict):
            return {}
        
        # 예상 구조: {"stage_1": 3, "stage_2": 7, "stage_3": 5, "stage_4": 2}
        validated = {}
        for i in range(1, 5):  # stage_1 ~ stage_4
            key = f"stage_{i}"
            if key in v:
                try:
                    # 정수로 변환 가능한지 확인
                    validated[key] = int(v[key])
                except (ValueError, TypeError):
                    validated[key] = 0
        
        return validated
    
    # ── 모델 메서드 ────────────────────────────────────────────────────────
    
    @property
    def duration_days(self) -> int:
        """프로젝트 소요 일수 계산"""
        return (self.completion_date - self.start_date).days
    
    @property
    def efficiency_rating(self) -> str:
        """효율성 등급 반환"""
        if self.overall_efficiency is None:
            return "N/A"
        
        efficiency = float(self.overall_efficiency)
        if efficiency >= 1.2:
            return "매우 우수"
        elif efficiency >= 1.0:
            return "우수"
        elif efficiency >= 0.8:
            return "보통"
        else:
            return "개선필요"
    
    @property
    def quality_rating(self) -> str:
        """품질 등급 반환"""
        if self.average_quality is None:
            return "N/A"
        
        quality = float(self.average_quality)
        if quality >= 4.5:
            return "매우 우수"
        elif quality >= 3.5:
            return "우수"
        elif quality >= 2.5:
            return "보통"
        else:
            return "개선필요"
    
    @property
    def success_rating_text(self) -> str:
        """성공 평가 텍스트 반환"""
        if self.project_success_rating is None:
            return "N/A"
        
        rating_map = {
            1: "미흡",
            2: "보통",
            3: "양호", 
            4: "우수",
            5: "매우 우수"
        }
        return rating_map.get(self.project_success_rating, "N/A")
    
    def get_participant_count(self) -> int:
        """참여자 수 반환 (안전한 처리)"""
        if not self.participants or not isinstance(self.participants, dict):
            return 0
        
        total_participants = 0
        try:
            for key, value in self.participants.items():
                if isinstance(value, list):
                    total_participants += len(value)
                elif isinstance(value, dict) and value:  # 빈 딕셔너리가 아닌 경우
                    total_participants += 1
        except Exception:
            # JSON 파싱 오류 시 0 반환
            return 0
        
        return total_participants
    
    def get_stage_duration(self, stage: int) -> Optional[int]:
        """특정 단계의 소요 시간 반환 (안전한 처리)"""
        if not self.stage_durations or not isinstance(self.stage_durations, dict):
            return None
        
        try:
            return self.stage_durations.get(f"stage_{stage}")
        except Exception:
            return None
    
    def add_participant(self, role_group: str, participant_info: Dict[str, Any]) -> None:
        """참여자 추가 (안전한 처리)"""
        if not isinstance(self.participants, dict):
            self.participants = {}
        
        if role_group not in self.participants:
            self.participants[role_group] = []
        
        if isinstance(self.participants[role_group], list):
            self.participants[role_group].append(participant_info)
        else:
            # 리스트가 아닌 경우 리스트로 변환
            existing = self.participants[role_group]
            self.participants[role_group] = [existing, participant_info]
    
    def set_stage_duration(self, stage: int, duration: int) -> None:
        """단계별 소요 시간 설정 (안전한 처리)"""
        if not isinstance(self.stage_durations, dict):
            self.stage_durations = {}
        
        if 1 <= stage <= 4:
            self.stage_durations[f"stage_{stage}"] = duration
    
    def to_summary_dict(self) -> Dict[str, Any]:
        """아카이브 요약 정보 반환"""
        return {
            "id": self.id,
            "movie_title": self.movie_title,
            "media_type": self.media_type,
            "work_speed_type": self.work_speed_type,
            "duration_days": self.duration_days,
            "total_hours": float(self.total_hours) if self.total_hours else None,
            "efficiency_rating": self.efficiency_rating,
            "quality_rating": self.quality_rating,
            "success_rating": self.success_rating_text,
            "participant_count": self.get_participant_count(),
            "completion_date": self.completion_date.isoformat() if self.completion_date else None,
            "archived_at": self.archived_at.isoformat() if self.archived_at else None
        }
    
    def to_detailed_dict(self) -> Dict[str, Any]:
        """아카이브 상세 정보 반환 (JSON 필드 포함)"""
        summary = self.to_summary_dict()
        summary.update({
            "original_project_id": self.original_project_id,
            "access_asset_id": self.access_asset_id,
            "asset_name": self.asset_name,
            "start_date": self.start_date.isoformat() if self.start_date else None,
            "overall_efficiency": float(self.overall_efficiency) if self.overall_efficiency else None,
            "average_quality": float(self.average_quality) if self.average_quality else None,
            "total_cost": float(self.total_cost) if self.total_cost else None,
            "rework_percentage": float(self.rework_percentage) if self.rework_percentage else None,
            "participants": self.participants,
            "stage_durations": self.stage_durations,
            "project_success_rating": self.project_success_rating,
            "lessons_learned": self.lessons_learned,
            "completion_notes": self.completion_notes,
            "archived_by": self.archived_by
        })
        return summary
    
    # Decimal to float 변환 헬퍼 메서드 추가
    def to_float_dict(self) -> Dict[str, Any]:
        """모든 Decimal 필드를 float로 변환한 딕셔너리 반환"""
        return {
            "id": self.id,
            "original_project_id": self.original_project_id,
            "access_asset_id": self.access_asset_id,
            "movie_title": self.movie_title,
            "media_type": self.media_type,
            "asset_name": self.asset_name,
            "work_speed_type": self.work_speed_type,
            "start_date": self.start_date.isoformat() if self.start_date else None,
            "completion_date": self.completion_date.isoformat() if self.completion_date else None,
            "total_days": self.total_days,
            "total_hours": float(self.total_hours) if self.total_hours else None,
            "overall_efficiency": float(self.overall_efficiency) if self.overall_efficiency else None,
            "average_quality": float(self.average_quality) if self.average_quality else None,
            "total_cost": float(self.total_cost) if self.total_cost else None,
            "rework_percentage": float(self.rework_percentage) if self.rework_percentage else None,
            "participants": self.participants,
            "stage_durations": self.stage_durations,
            "project_success_rating": self.project_success_rating,
            "lessons_learned": self.lessons_learned,
            "completion_notes": self.completion_notes,
            "archived_at": self.archived_at.isoformat() if self.archived_at else None,
            "archived_by": self.archived_by
        }
    
    # 추가 계산 속성들
    @property
    def project_duration_weeks(self) -> float:
        """프로젝트 기간 (주 단위)"""
        return round(self.total_days / 7, 1)
    
    @property
    def efficiency_grade(self) -> str:
        """효율성 등급 (A-F)"""
        if self.overall_efficiency is None:
            return "N/A"
        efficiency = float(self.overall_efficiency)
        if efficiency >= 1.2:
            return "A"
        elif efficiency >= 1.0:
            return "B"
        elif efficiency >= 0.8:
            return "C"
        elif efficiency >= 0.6:
            return "D"
        else:
            return "F"
    
    @property
    def quality_grade(self) -> str:
        """품질 등급 (A-F)"""
        if self.average_quality is None:
            return "N/A"
        quality = float(self.average_quality)
        if quality >= 4.5:
            return "A"
        elif quality >= 3.5:
            return "B"
        elif quality >= 2.5:
            return "C"
        elif quality >= 1.5:
            return "D"
        else:
            return "F"
    
    @property
    def success_level(self) -> str:
        """성공 수준"""
        if self.project_success_rating is None:
            return "미평가"
        return ProjectSuccessRating(self.project_success_rating).name
    
    @property
    def cost_per_hour(self) -> Optional[float]:
        """시간당 비용"""
        if self.total_cost and self.total_hours and self.total_hours > 0:
            return round(float(self.total_cost) / float(self.total_hours), 2)
        return None
    
    @property
    def average_daily_hours(self) -> Optional[float]:
        """일평균 작업 시간"""
        if self.total_hours and self.total_days > 0:
            return round(float(self.total_hours) / self.total_days, 2)
        return None
    
    # ── 클래스 메서드 ──────────────────────────────────────────────────────
    
    @classmethod
    def get_media_type_choices(cls) -> List[tuple]:
        """미디어 타입 선택지 반환"""
        return [(mt.value, mt.value) for mt in MediaType]
    
    @classmethod
    def get_speed_type_choices(cls) -> List[tuple]:
        """작업 속도 선택지 반환"""
        return [(wst.value, wst.value) for wst in WorkSpeedType]
    
    @classmethod
    def get_success_rating_choices(cls) -> List[tuple]:
        """성공 평가 선택지 반환"""
        return [(rating.value, rating.value) for rating in ProjectSuccessRating]
    
    @classmethod
    def create_from_project(cls, project_data: Dict[str, Any], archived_by_id: int) -> 'ProductionArchive':
        """프로젝트 데이터로부터 아카이브 생성"""
        archive = cls(
            original_project_id=project_data['id'],
            access_asset_id=project_data['access_asset_id'],
            movie_title=project_data['movie_title'],
            media_type=project_data['media_type'],
            asset_name=project_data['asset_name'],
            work_speed_type=project_data['work_speed_type'],
            start_date=project_data['start_date'],
            completion_date=project_data['completion_date'],
            total_days=project_data['total_days'],
            total_hours=project_data.get('total_hours'),
            participants=project_data.get('participants', {}),
            overall_efficiency=project_data.get('overall_efficiency'),
            average_quality=project_data.get('average_quality'),
            total_cost=project_data.get('total_cost'),
            rework_percentage=project_data.get('rework_percentage'),
            stage_durations=project_data.get('stage_durations', {}),
            project_success_rating=project_data.get('project_success_rating'),
            lessons_learned=project_data.get('lessons_learned'),
            completion_notes=project_data.get('completion_notes'),
            archived_by=archived_by_id
        )
        return archive
