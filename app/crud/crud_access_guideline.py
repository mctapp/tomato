# app/crud/crud_access_guideline.py
from typing import List, Optional, Any
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import select, delete, desc, func
from app.crud.base import CRUDBase
from app.models.access_guideline import (
    AccessGuideline, 
    AccessGuidelineContent, 
    AccessGuidelineFeedback, 
    AccessGuidelineMemo
)
from app.schemas.access_guideline import (
    AccessGuidelineCreate,
    AccessGuidelineUpdate,
    AccessGuidelineSummary,
    AccessGuidelineContentCreate,
    AccessGuidelineFeedbackCreate,
    AccessGuidelineMemoCreate
)

class CRUDAccessGuideline(CRUDBase[AccessGuideline, AccessGuidelineCreate, AccessGuidelineUpdate]):

    # --- Helper Functions for Relation Handling ---

    def _create_contents(self, db: Session, guideline_id: int, contents: List[AccessGuidelineContentCreate]):
        """Helper function to create contents"""
        for content_in in contents:
            db_content = AccessGuidelineContent(
                guideline_id=guideline_id,
                category=content_in.category,
                content=content_in.content,
                sequence_number=content_in.sequence_number
            )
            db.add(db_content)

    def _create_feedbacks(self, db: Session, guideline_id: int, feedbacks: List[AccessGuidelineFeedbackCreate]):
        """Helper function to create feedbacks"""
        for feedback_in in feedbacks:
            db_feedback = AccessGuidelineFeedback(
                guideline_id=guideline_id,
                feedback_type=feedback_in.feedback_type,
                content=feedback_in.content,
                sequence_number=feedback_in.sequence_number
            )
            db.add(db_feedback)

    def _create_memos(self, db: Session, guideline_id: int, memos: List[AccessGuidelineMemoCreate]):
        """Helper function to create memos"""
        for memo_in in memos:
            db_memo = AccessGuidelineMemo(
                guideline_id=guideline_id,
                content=memo_in.content
            )
            db.add(db_memo)

    # --- Main CRUD Operations with Relations ---

    def create_with_relations(self, db: Session, *, obj_in: AccessGuidelineCreate) -> AccessGuideline:
        """가이드라인 생성 (연관 정보 포함)"""
        guideline_data = obj_in.dict(exclude={'contents', 'feedbacks', 'memos'})
        db_obj = self.model(**guideline_data)

        db.add(db_obj)
        db.flush()  # Generate ID

        if obj_in.contents:
            self._create_contents(db, db_obj.id, obj_in.contents)
        if obj_in.feedbacks:
            self._create_feedbacks(db, db_obj.id, obj_in.feedbacks)
        if obj_in.memos:
            self._create_memos(db, db_obj.id, obj_in.memos)

        db.commit()
        db.refresh(db_obj)
        # Eager load relations
        db.refresh(db_obj, attribute_names=['contents', 'feedbacks', 'memos'])
        return db_obj

    def update_with_relations(
        self, db: Session, *, db_obj: AccessGuideline, obj_in: AccessGuidelineUpdate
    ) -> AccessGuideline:
        """가이드라인 수정 (연관 정보 포함)"""
        # 1. 기본 정보 업데이트
        update_data = obj_in.dict(exclude_unset=True, exclude={'contents', 'feedbacks', 'memos'})
        for field, value in update_data.items():
            setattr(db_obj, field, value)
        db.add(db_obj)

        # 2. 주요내용 업데이트 (전체 교체)
        if obj_in.contents is not None:
            db.execute(delete(AccessGuidelineContent).where(AccessGuidelineContent.guideline_id == db_obj.id))
            if obj_in.contents:
                self._create_contents(db, db_obj.id, obj_in.contents)

        # 3. 피드백 업데이트 (추가만 가능)
        if obj_in.feedbacks is not None and obj_in.feedbacks:
            # 현재 최대 sequence_number 가져오기
            max_seq = db.query(func.max(AccessGuidelineFeedback.sequence_number))\
                .filter(AccessGuidelineFeedback.guideline_id == db_obj.id)\
                .scalar() or 0
            
            for i, feedback_in in enumerate(obj_in.feedbacks):
                feedback_in.sequence_number = max_seq + i + 1
            self._create_feedbacks(db, db_obj.id, obj_in.feedbacks)

        # 4. 메모 업데이트 (추가만 가능)
        if obj_in.memos is not None and obj_in.memos:
            self._create_memos(db, db_obj.id, obj_in.memos)

        db.commit()
        db.refresh(db_obj)
        # Eager load relations
        db.refresh(db_obj, attribute_names=['contents', 'feedbacks', 'memos'])
        return db_obj

    # --- Read Operations ---

    def get(self, db: Session, id: Any) -> Optional[AccessGuideline]:
        """ID로 상세 조회 (연관 정보 포함)"""
        return db.query(self.model)\
            .options(
                joinedload(self.model.contents),
                joinedload(self.model.feedbacks),
                joinedload(self.model.memos)
            )\
            .filter(self.model.id == id)\
            .first()

    def get_multi(
        self, db: Session, *, skip: int = 0, limit: int = 100
    ) -> List[AccessGuideline]:
        """전체 목록 조회"""
        return db.query(self.model)\
            .order_by(desc(self.model.id))\
            .offset(skip)\
            .limit(limit)\
            .options(
                joinedload(self.model.contents),
                joinedload(self.model.feedbacks),
                joinedload(self.model.memos)
            )\
            .all()

    # --- Summary Operations ---

    def convert_to_summary(self, db: Session, guideline: AccessGuideline) -> AccessGuidelineSummary:
        """단일 가이드라인 객체를 Summary 스키마로 변환"""
        return AccessGuidelineSummary(
            id=guideline.id,
            name=guideline.name,
            type=guideline.type,
            field=guideline.field,
            field_other=guideline.field_other,
            version=guideline.version,
            attachment=guideline.attachment,
            created_at=guideline.created_at
        )

    def convert_to_summary_list(self, db: Session, guidelines: List[AccessGuideline]) -> List[AccessGuidelineSummary]:
        """가이드라인 객체 리스트를 Summary 리스트로 변환"""
        return [self.convert_to_summary(db, guideline) for guideline in guidelines]

    def get_multi_summary(self, db: Session, *, skip: int = 0, limit: int = 100) -> List[AccessGuidelineSummary]:
        """목록 조회 (Summary 반환)"""
        results = db.query(self.model)\
            .order_by(desc(self.model.id))\
            .offset(skip)\
            .limit(limit)\
            .all()
        return self.convert_to_summary_list(db, results)

    def search_summary(self, db: Session, *, keyword: str, skip: int = 0, limit: int = 100) -> List[AccessGuidelineSummary]:
        """이름 키워드로 검색 (Summary 반환)"""
        results = db.query(self.model)\
            .filter(self.model.name.ilike(f"%{keyword}%"))\
            .order_by(desc(self.model.id))\
            .offset(skip)\
            .limit(limit)\
            .all()
        return self.convert_to_summary_list(db, results)

    def get_by_type_summary(self, db: Session, *, type: str, skip: int = 0, limit: int = 100) -> List[AccessGuidelineSummary]:
        """타입으로 필터링 (Summary 반환)"""
        results = db.query(self.model)\
            .filter(self.model.type == type)\
            .order_by(desc(self.model.id))\
            .offset(skip)\
            .limit(limit)\
            .all()
        return self.convert_to_summary_list(db, results)

    # --- Delete Operations ---

    def remove_feedback(self, db: Session, feedback_id: int) -> None:
        """피드백 삭제"""
        db.execute(delete(AccessGuidelineFeedback).where(AccessGuidelineFeedback.id == feedback_id))
        db.commit()

    def remove_memo(self, db: Session, memo_id: int) -> None:
        """메모 삭제"""
        db.execute(delete(AccessGuidelineMemo).where(AccessGuidelineMemo.id == memo_id))
        db.commit()

# CRUDAccessGuideline 인스턴스 생성
access_guideline = CRUDAccessGuideline(AccessGuideline)
