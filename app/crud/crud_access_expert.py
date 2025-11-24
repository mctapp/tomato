# app/crud/crud_access_expert.py
from typing import List, Optional, Any
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import select, delete, desc
from app.crud.base import CRUDBase
from app.models.access_expert import AccessExpert, AccessExpertExpertise
from app.models.representative_works import RepresentativeWork
from app.schemas.access_expert import (
    AccessExpertCreate,
    AccessExpertUpdate,
    AccessExpertSummary,
    AccessExpertExpertiseCreate,
    RepresentativeWorkCreate
)

class CRUDAccessExpert(CRUDBase[AccessExpert, AccessExpertCreate, AccessExpertUpdate]):

    # --- Helper Functions for Relation Handling ---

    def _create_expertise(self, db: Session, access_expert_id: int, expertise_list: List[AccessExpertExpertiseCreate]):
        """Helper function to create expertise"""
        for expertise_in in expertise_list:
            db_expertise = AccessExpertExpertise(
                access_expert_id=access_expert_id,
                domain=expertise_in.domain,
                domain_other=expertise_in.domain_other,
                grade=expertise_in.grade
            )
            db.add(db_expertise)

    def _create_representative_works(self, db: Session, access_expert_id: int, works: List[RepresentativeWorkCreate]):
        """Helper function to create representative works"""
        for work_in in works:
            db_work = RepresentativeWork(
                person_type='accessexpert',
                person_id=access_expert_id,
                year=work_in.year,
                category=work_in.category,
                title=work_in.title,
                role=work_in.role,
                memo=work_in.memo,
                sequence_number=work_in.sequence_number
            )
            db.add(db_work)

    # --- Main CRUD Operations with Relations ---

    def create_with_relations(self, db: Session, *, obj_in: AccessExpertCreate) -> AccessExpert:
        """AccessExpert 생성 (연관 정보 포함)"""
        access_expert_data = obj_in.dict(exclude={'expertise', 'representative_works'})
        db_obj = self.model(**access_expert_data)

        db.add(db_obj)
        db.flush()  # AccessExpert ID 생성을 위해 flush

        if obj_in.expertise:
            self._create_expertise(db, db_obj.id, obj_in.expertise)
        if obj_in.representative_works:
            self._create_representative_works(db, db_obj.id, obj_in.representative_works)

        db.commit()
        db.refresh(db_obj)
        # Eager load relations after creation for the returned object
        db.refresh(db_obj, attribute_names=['expertise', 'representative_works'])
        return db_obj

    def update_with_relations(
        self, db: Session, *, db_obj: AccessExpert, obj_in: AccessExpertUpdate
    ) -> AccessExpert:
        """AccessExpert 수정 (연관 정보 포함 - 전체 교체 방식)"""
        # 1. 기본 정보 업데이트
        update_data = obj_in.dict(exclude_unset=True, exclude={'expertise', 'representative_works'})
        for field, value in update_data.items():
            setattr(db_obj, field, value)
        db.add(db_obj)

        # 2. 전문영역 업데이트
        if obj_in.expertise is not None:
            db.execute(delete(AccessExpertExpertise).where(AccessExpertExpertise.access_expert_id == db_obj.id))
            if obj_in.expertise:
                self._create_expertise(db, db_obj.id, obj_in.expertise)

        # 3. 대표 작품 업데이트
        if obj_in.representative_works is not None:
            db.execute(delete(RepresentativeWork)
                       .where(RepresentativeWork.person_id == db_obj.id)
                       .where(RepresentativeWork.person_type == 'accessexpert'))
            if obj_in.representative_works:
                self._create_representative_works(db, db_obj.id, obj_in.representative_works)

        db.commit()
        db.refresh(db_obj)
        # Eager load relations after update for the returned object
        db.refresh(db_obj, attribute_names=['expertise', 'representative_works'])
        return db_obj

    # --- Read Operations ---

    def get(self, db: Session, id: Any) -> Optional[AccessExpert]:
        """ ID로 상세 조회 (연관 정보 포함) """
        return db.query(self.model)\
            .options(
                joinedload(self.model.expertise),
                joinedload(self.model.representative_works)
            )\
            .filter(self.model.id == id)\
            .first()

    def get_multi(
        self, db: Session, *, skip: int = 0, limit: int = 100
    ) -> List[AccessExpert]:
        """ 전체 목록 조회 (기본 - 전체 AccessExpert 객체 반환) """
        return db.query(self.model)\
            .order_by(desc(self.model.id))\
            .offset(skip)\
            .limit(limit)\
            .options(
                joinedload(self.model.expertise),
                joinedload(self.model.representative_works)
            )\
            .all()

    # --- Summary Conversion Helper ---

    def convert_to_summary(self, db: Session, access_expert: AccessExpert) -> AccessExpertSummary:
        """ 단일 AccessExpert 객체를 AccessExpertSummary 스키마로 변환 """
        return AccessExpertSummary(
            id=access_expert.id,
            name=access_expert.name,
            level=access_expert.level,
            profile_image=access_expert.profile_image,
            speciality1=access_expert.speciality1,
            speciality2=access_expert.speciality2,
            created_at=access_expert.created_at
        )

    def convert_to_summary_list(self, db: Session, access_experts: List[AccessExpert]) -> List[AccessExpertSummary]:
        """ AccessExpert 객체 리스트를 AccessExpertSummary 리스트로 변환 """
        return [self.convert_to_summary(db, access_expert) for access_expert in access_experts]

    # --- Read Operations Returning Summary ---

    def get_multi_summary(self, db: Session, *, skip: int = 0, limit: int = 100) -> List[AccessExpertSummary]:
        """ 목록 조회 (AccessExpertSummary 반환) """
        results = db.query(self.model)\
            .order_by(desc(self.model.id))\
            .offset(skip)\
            .limit(limit)\
            .all()
        return self.convert_to_summary_list(db, results)

    def search_summary(self, db: Session, *, keyword: str, skip: int = 0, limit: int = 100) -> List[AccessExpertSummary]:
        """ 이름 키워드로 검색 (AccessExpertSummary 반환) """
        results = db.query(self.model)\
            .filter(self.model.name.ilike(f"%{keyword}%"))\
            .order_by(desc(self.model.id))\
            .offset(skip)\
            .limit(limit)\
            .all()
        return self.convert_to_summary_list(db, results)

    def get_by_speciality_summary(self, db: Session, *, speciality: str, skip: int = 0, limit: int = 100) -> List[AccessExpertSummary]:
        """ 전문성으로 필터링 (AccessExpertSummary 반환) """
        results = db.query(self.model)\
            .filter((self.model.speciality1 == speciality) | (self.model.speciality2 == speciality))\
            .order_by(desc(self.model.id))\
            .offset(skip)\
            .limit(limit)\
            .all()
        return self.convert_to_summary_list(db, results)

    # --- Delete Operation ---

    def remove(self, db: Session, *, id: int) -> Optional[AccessExpert]:
        """
        AccessExpert 삭제.
        주의: 연관된 데이터(expertise, representative_works)는
        SQLModel 모델의 cascade 설정에 의해 자동 삭제됨.
        """
        obj = db.query(self.model).get(id)
        if obj:
            db.delete(obj)
            db.commit()
        return obj


# CRUDAccessExpert 인스턴스 생성
access_expert = CRUDAccessExpert(AccessExpert)
