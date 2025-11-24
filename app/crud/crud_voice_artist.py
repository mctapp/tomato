# app/crud/crud_voice_artist.py
from typing import List, Optional, Any, Tuple
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import select, delete, desc, asc, func, text, and_, or_
from app.crud.base import CRUDBase
from app.models.voice_artist import VoiceArtist, VoiceArtistSample, VoiceArtistExpertise
from app.schemas.voice_artist import (
    VoiceArtistCreate,
    VoiceArtistUpdate,
    VoiceArtistSummary,
    VoiceArtistSampleCreate,
    VoiceArtistExpertiseCreate,
    VoiceArtistSearchFilters,
    PaginationMeta
)

class CRUDVoiceArtist(CRUDBase[VoiceArtist, VoiceArtistCreate, VoiceArtistUpdate]):

    # --- Helper Functions for Relation Handling ---

    def _create_samples(self, db: Session, voice_artist_id: int, samples: List[VoiceArtistSampleCreate]):
        """Helper function to create voice samples"""
        for sample_in in samples:
            db_sample = VoiceArtistSample(
                voice_artist_id=voice_artist_id,
                sequence_number=sample_in.sequence_number,
                title=sample_in.title,
                file_path=sample_in.file_path or "",  # 파일은 나중에 업로드됨
            )
            db.add(db_sample)

    def _create_expertise(self, db: Session, voice_artist_id: int, expertise_list: List[VoiceArtistExpertiseCreate]):
        """Helper function to create expertise"""
        for expertise_in in expertise_list:
            db_expertise = VoiceArtistExpertise(
                voice_artist_id=voice_artist_id,
                domain=expertise_in.domain,
                domain_other=expertise_in.domain_other,
                grade=expertise_in.grade
            )
            db.add(db_expertise)

    # --- Main CRUD Operations with Relations ---

    def create_with_relations(self, db: Session, *, obj_in: VoiceArtistCreate) -> VoiceArtist:
        """성우 아티스트 생성 (연관 정보 포함)"""
        # dict로 변환하고 expertise 필드 제외
        voice_artist_data = obj_in.dict(exclude={'expertise'})
        
        # None이나 빈 문자열로 전달된 필드 처리
        cleaned_data = {}
        for field, value in voice_artist_data.items():
            # 필드 타입에 따라 적절히 처리
            if value is None:
                cleaned_data[field] = None  # None 값 그대로 유지
            elif isinstance(value, str) and value.strip() == "":
                cleaned_data[field] = ""  # 빈 문자열 그대로 유지 (또는 None으로 변환 가능)
            else:
                cleaned_data[field] = value  # 다른 값은 그대로 유지
        
        # 모델 인스턴스 생성
        db_obj = self.model(**cleaned_data)
        
        db.add(db_obj)
        db.flush()  # VoiceArtist ID 생성을 위해 flush

        if obj_in.expertise:
            self._create_expertise(db, db_obj.id, obj_in.expertise)

        db.commit()
        db.refresh(db_obj)
        # Eager load relations after creation for the returned object
        db.refresh(db_obj, attribute_names=['samples', 'expertise'])
        return db_obj

    def update_with_relations(
        self, db: Session, *, db_obj: VoiceArtist, obj_in: VoiceArtistUpdate
    ) -> VoiceArtist:
        """성우 아티스트 수정 (연관 정보 포함 - 전체 교체 방식)"""
        # 1. 기본 정보 업데이트
        update_data = obj_in.dict(exclude_unset=True, exclude={'expertise'})
        
        # None이나 빈 문자열로 전달된 필드 처리
        cleaned_data = {}
        for field, value in update_data.items():
            # 필드 타입에 따라 적절히 처리
            if value is None:
                cleaned_data[field] = None  # None 값 그대로 유지
            elif isinstance(value, str) and value.strip() == "":
                cleaned_data[field] = ""  # 빈 문자열 그대로 유지 (또는 None으로 변환 가능)
            else:
                cleaned_data[field] = value  # 다른 값은 그대로 유지
        
        for field, value in cleaned_data.items():
            setattr(db_obj, field, value)
            
        db.add(db_obj)  # Mark the object as dirty

        # 2. 전문영역 업데이트
        if obj_in.expertise is not None:
            db.execute(delete(VoiceArtistExpertise).where(VoiceArtistExpertise.voice_artist_id == db_obj.id))
            if obj_in.expertise:
                self._create_expertise(db, db_obj.id, obj_in.expertise)

        db.commit()
        db.refresh(db_obj)
        # Eager load relations after update for the returned object
        db.refresh(db_obj, attribute_names=['samples', 'expertise'])
        return db_obj

    # --- Read Operations ---

    def get(self, db: Session, id: Any) -> Optional[VoiceArtist]:
        """ ID로 상세 조회 (연관 정보 포함) """
        return db.query(self.model)\
            .options(
                joinedload(self.model.samples),
                joinedload(self.model.expertise)
            )\
            .filter(self.model.id == id)\
            .first()

    def get_multi(
        self, db: Session, *, skip: int = 0, limit: int = 100
    ) -> List[VoiceArtist]:
        """ 전체 목록 조회 (기본 - 전체 VoiceArtist 객체 반환) """
        return db.query(self.model)\
            .order_by(desc(self.model.id))\
            .offset(skip)\
            .limit(limit)\
            .options(  # N+1 방지 위해 Eager Loading 추가
                joinedload(self.model.samples),
                joinedload(self.model.expertise)
            )\
            .all()

    def get_multi_with_pagination(
        self, 
        db: Session,
        *,
        skip: int = 0,
        limit: int = 20,
        filters: Optional[VoiceArtistSearchFilters] = None,
        order_by: str = "created_at",
        order_desc: bool = True
    ) -> Tuple[List[VoiceArtistSummary], PaginationMeta]:
        """페이지네이션과 필터링을 지원하는 최적화된 목록 조회"""
        
        # 기본 쿼리 빌드
        base_query = db.query(self.model)
        count_query = db.query(func.count(self.model.id))
        
        # 필터 적용
        if filters:
            filter_conditions = self._build_filter_conditions(filters)
            if filter_conditions:
                base_query = base_query.filter(and_(*filter_conditions))
                count_query = count_query.filter(and_(*filter_conditions))
        
        # 총 개수 조회 (최적화된 카운트 쿼리)
        total = count_query.scalar() or 0
        
        # 페이지네이션 계산
        total_pages = (total + limit - 1) // limit
        current_page = (skip // limit) + 1
        has_next = current_page < total_pages
        has_prev = current_page > 1
        
        # 정렬 적용
        order_column = getattr(self.model, order_by, self.model.created_at)
        if order_desc:
            base_query = base_query.order_by(desc(order_column))
        else:
            base_query = base_query.order_by(asc(order_column))
        
        # 페이지네이션 적용
        base_query = base_query.offset(skip).limit(limit)
        
        # 데이터 조회 (관계 데이터는 별도 쿼리로 최적화)
        voice_artists = base_query.all()
        
        if not voice_artists:
            return [], PaginationMeta(
                total=total,
                page=current_page,
                limit=limit,
                total_pages=total_pages,
                has_next=has_next,
                has_prev=has_prev
            )
        
        # 관계 데이터를 배치로 로드 (N+1 쿼리 방지)
        voice_artist_ids = [va.id for va in voice_artists]
        
        # 샘플 통계 배치 로드
        samples_stats_query = text("""
            SELECT 
                voice_artist_id,
                COUNT(*) as total_samples
            FROM voice_artist_samples 
            WHERE voice_artist_id = ANY(:voice_artist_ids)
            GROUP BY voice_artist_id
        """)
        
        samples_stats = db.execute(samples_stats_query, {"voice_artist_ids": voice_artist_ids}).fetchall()
        samples_stats_by_artist = {}
        for stat in samples_stats:
            samples_stats_by_artist[stat.voice_artist_id] = stat.total_samples
        
        # VoiceArtistSummary 객체 생성
        summaries = []
        for voice_artist in voice_artists:
            samples_count = samples_stats_by_artist.get(voice_artist.id, 0)
            
            summary = VoiceArtistSummary(
                id=voice_artist.id,
                voiceartist_name=voice_artist.voiceartist_name,
                voiceartist_level=voice_artist.voiceartist_level,
                voiceartist_gender=voice_artist.voiceartist_gender,
                voiceartist_location=voice_artist.voiceartist_location,
                voiceartist_phone=voice_artist.voiceartist_phone,
                voiceartist_email=voice_artist.voiceartist_email,
                profile_image=voice_artist.profile_image,
                samples_count=samples_count,
                created_at=voice_artist.created_at
            )
            summaries.append(summary)
        
        pagination_meta = PaginationMeta(
            total=total,
            page=current_page,
            limit=limit,
            total_pages=total_pages,
            has_next=has_next,
            has_prev=has_prev
        )
        
        return summaries, pagination_meta

    def _build_filter_conditions(self, filters: VoiceArtistSearchFilters) -> List:
        """필터 조건을 SQLAlchemy 조건으로 변환"""
        conditions = []
        
        if filters.keyword:
            keyword_condition = or_(
                self.model.voiceartist_name.ilike(f"%{filters.keyword}%"),
                self.model.voiceartist_memo.ilike(f"%{filters.keyword}%")
            )
            conditions.append(keyword_condition)
        
        if filters.skill_levels:
            conditions.append(self.model.voiceartist_level.in_(filters.skill_levels))
        
        if filters.locations:
            location_conditions = []
            for location in filters.locations:
                location_conditions.append(self.model.voiceartist_location.ilike(f"%{location}%"))
            conditions.append(or_(*location_conditions))
        
        if filters.genders:
            conditions.append(self.model.voiceartist_gender.in_(filters.genders))
        
        return conditions

    def search_optimized(
        self, 
        db: Session, 
        *,
        filters: VoiceArtistSearchFilters,
        skip: int = 0,
        limit: int = 20
    ) -> Tuple[List[VoiceArtistSummary], PaginationMeta]:
        """최적화된 검색 기능"""
        return self.get_multi_with_pagination(
            db, 
            skip=skip, 
            limit=limit, 
            filters=filters
        )

    # --- Summary Conversion Helper ---

    def convert_to_summary(self, db: Session, voice_artist: VoiceArtist) -> VoiceArtistSummary:
        """ 단일 VoiceArtist 객체를 VoiceArtistSummary 스키마로 변환 """
        samples_count = len(voice_artist.samples) if hasattr(voice_artist, 'samples') and voice_artist.samples else 0
        
        return VoiceArtistSummary(
            id=voice_artist.id,
            voiceartist_name=voice_artist.voiceartist_name,  # 필드명 수정
            voiceartist_level=voice_artist.voiceartist_level,  # 필드명 수정
            voiceartist_gender=voice_artist.voiceartist_gender,  # 추가된 필드
            voiceartist_location=voice_artist.voiceartist_location,  # 추가된 필드
            voiceartist_phone=voice_artist.voiceartist_phone,  # 추가된 필드
            voiceartist_email=voice_artist.voiceartist_email,  # 추가된 필드
            profile_image=voice_artist.profile_image,
            samples_count=samples_count,
            created_at=voice_artist.created_at
        )

    def convert_to_summary_list(self, db: Session, voice_artists: List[VoiceArtist]) -> List[VoiceArtistSummary]:
        """ VoiceArtist 객체 리스트를 VoiceArtistSummary 리스트로 변환 """
        return [self.convert_to_summary(db, voice_artist) for voice_artist in voice_artists]

    # --- Read Operations Returning Summary ---

    def get_multi_summary(self, db: Session, *, skip: int = 0, limit: int = 100) -> List[VoiceArtistSummary]:
        """ 목록 조회 (VoiceArtistSummary 반환) """
        results = db.query(self.model)\
            .options(joinedload(self.model.samples))\
            .order_by(desc(self.model.id))\
            .offset(skip)\
            .limit(limit)\
            .all()
        return self.convert_to_summary_list(db, results)

    def search_summary(self, db: Session, *, keyword: str, skip: int = 0, limit: int = 100) -> List[VoiceArtistSummary]:
        """ 이름 키워드로 검색 (VoiceArtistSummary 반환) """
        # 필드명 수정
        results = db.query(self.model)\
            .filter(self.model.voiceartist_name.ilike(f"%{keyword}%"))\
            .options(joinedload(self.model.samples))\
            .order_by(desc(self.model.id))\
            .offset(skip)\
            .limit(limit)\
            .all()
        return self.convert_to_summary_list(db, results)

    def get_by_level_summary(self, db: Session, *, level: int, skip: int = 0, limit: int = 100) -> List[VoiceArtistSummary]:
        """ 레벨로 필터링 (VoiceArtistSummary 반환) """
        # 필드명 수정
        results = db.query(self.model)\
            .filter(self.model.voiceartist_level == level)\
            .options(joinedload(self.model.samples))\
            .order_by(desc(self.model.id))\
            .offset(skip)\
            .limit(limit)\
            .all()
        return self.convert_to_summary_list(db, results)

    # --- Sample Management ---

    def create_sample(self, db: Session, *, voice_artist_id: int, sample_in: VoiceArtistSampleCreate) -> VoiceArtistSample:
        """성우 샘플 생성"""
        db_sample = VoiceArtistSample(
            voice_artist_id=voice_artist_id,
            sequence_number=sample_in.sequence_number,
            title=sample_in.title,
            file_path=sample_in.file_path or "",
        )
        db.add(db_sample)
        db.commit()
        db.refresh(db_sample)
        return db_sample

    def update_sample_file(self, db: Session, *, sample_id: int, file_path: str) -> Optional[VoiceArtistSample]:
        """샘플 파일 경로 업데이트"""
        db_sample = db.query(VoiceArtistSample).filter(VoiceArtistSample.id == sample_id).first()
        if db_sample:
            db_sample.file_path = file_path
            db.add(db_sample)
            db.commit()
            db.refresh(db_sample)
        return db_sample

    def delete_sample(self, db: Session, *, sample_id: int) -> Optional[VoiceArtistSample]:
        """샘플 삭제"""
        db_sample = db.query(VoiceArtistSample).filter(VoiceArtistSample.id == sample_id).first()
        if db_sample:
            db.delete(db_sample)
            db.commit()
        return db_sample

    # --- Delete Operation ---

    def remove(self, db: Session, *, id: int) -> Optional[VoiceArtist]:
        """성우 아티스트 삭제"""
        obj = db.query(self.model).get(id)
        if obj:
            db.delete(obj)
            db.commit()
        return obj  # 삭제된 객체 (또는 None) 반환


# CRUDVoiceArtist 인스턴스 생성
voice_artist = CRUDVoiceArtist(VoiceArtist)
