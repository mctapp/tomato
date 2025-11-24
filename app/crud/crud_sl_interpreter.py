# app/crud/crud_sl_interpreter.py
from typing import List, Optional, Tuple, Dict, Any
from sqlmodel import Session, select, func, text, and_, or_
from sqlalchemy.orm import selectinload, joinedload
from sqlalchemy import desc, asc

from app.crud.base import CRUDBase
from app.models.sl_interpreter import (
    SLInterpreter, 
    SLInterpreterCreate, 
    SLInterpreterUpdate,
    SLInterpreterSignLanguage,
    SLInterpreterExpertise,
    SLInterpreterSample
)
from app.schemas.sl_interpreter import (
    SLInterpreterSummary,
    SLInterpreterSearchFilters,
    SLInterpreterSignLanguageCreate,
    SLInterpreterExpertiseCreate,
    SLInterpreterSampleCreate,
    PaginationMeta
)

class CRUDSLInterpreter(CRUDBase[SLInterpreter, SLInterpreterCreate, SLInterpreterUpdate]):
    
    def get_with_relations(self, db: Session, *, id: int) -> Optional[SLInterpreter]:
        """관계 데이터를 포함한 수어통역사 조회 - 최적화된 로딩"""
        statement = (
            select(SLInterpreter)
            .options(
                selectinload(SLInterpreter.sign_languages),
                selectinload(SLInterpreter.expertise),
                selectinload(SLInterpreter.samples)
            )
            .where(SLInterpreter.id == id)
        )
        return db.exec(statement).first()

    def get_multi_with_pagination(
        self, 
        db: Session,
        *,
        skip: int = 0,
        limit: int = 20,
        filters: Optional[SLInterpreterSearchFilters] = None,
        order_by: str = "created_at",
        order_desc: bool = True
    ) -> Tuple[List[SLInterpreterSummary], PaginationMeta]:
        """페이지네이션과 필터링을 지원하는 최적화된 목록 조회"""
        
        # 기본 쿼리 빌드
        base_query = select(SLInterpreter)
        count_query = select(func.count(SLInterpreter.id))
        
        # 필터 적용
        if filters:
            filter_conditions = self._build_filter_conditions(filters)
            if filter_conditions:
                base_query = base_query.where(and_(*filter_conditions))
                count_query = count_query.where(and_(*filter_conditions))
        
        # 총 개수 조회 (최적화된 카운트 쿼리)
        total = db.exec(count_query).first() or 0
        
        # 페이지네이션 계산
        total_pages = (total + limit - 1) // limit
        current_page = (skip // limit) + 1
        has_next = current_page < total_pages
        has_prev = current_page > 1
        
        # 정렬 적용
        order_column = getattr(SLInterpreter, order_by, SLInterpreter.created_at)
        if order_desc:
            base_query = base_query.order_by(desc(order_column))
        else:
            base_query = base_query.order_by(asc(order_column))
        
        # 페이지네이션 적용
        base_query = base_query.offset(skip).limit(limit)
        
        # 데이터 조회 (관계 데이터는 별도 쿼리로 최적화)
        interpreters = db.exec(base_query).all()
        
        if not interpreters:
            return [], PaginationMeta(
                total=total,
                page=current_page,
                limit=limit,
                total_pages=total_pages,
                has_next=has_next,
                has_prev=has_prev
            )
        
        # 관계 데이터를 배치로 로드 (N+1 쿼리 방지)
        interpreter_ids = [i.id for i in interpreters]
        
        # 사용수어 데이터 배치 로드
        sign_languages_query = (
            select(SLInterpreterSignLanguage)
            .where(SLInterpreterSignLanguage.sl_interpreter_id.in_(interpreter_ids))
        )
        sign_languages = db.exec(sign_languages_query).all()
        sign_languages_by_interpreter = {}
        for sl in sign_languages:
            if sl.sl_interpreter_id not in sign_languages_by_interpreter:
                sign_languages_by_interpreter[sl.sl_interpreter_id] = []
            sign_languages_by_interpreter[sl.sl_interpreter_id].append(sl.sign_language_code)
        
        # 샘플 통계 배치 로드
        samples_stats_query = text("""
            SELECT 
                sl_interpreter_id,
                COUNT(*) as total_samples,
                SUM(CASE WHEN sample_type = 'video' THEN 1 ELSE 0 END) as video_samples,
                SUM(CASE WHEN sample_type = 'image' THEN 1 ELSE 0 END) as image_samples
            FROM sl_interpreter_samples 
            WHERE sl_interpreter_id = ANY(:interpreter_ids)
            GROUP BY sl_interpreter_id
        """)
        
        samples_stats = db.execute(samples_stats_query, {"interpreter_ids": interpreter_ids}).fetchall()
        samples_stats_by_interpreter = {}
        for stat in samples_stats:
            samples_stats_by_interpreter[stat.sl_interpreter_id] = {
                'total': stat.total_samples,
                'video': stat.video_samples,
                'image': stat.image_samples
            }
        
        # SLInterpreterSummary 객체 생성 - phone, email 필드 추가
        summaries = []
        for interpreter in interpreters:
            sign_languages_list = sign_languages_by_interpreter.get(interpreter.id, [])
            sample_stats = samples_stats_by_interpreter.get(interpreter.id, {'total': 0, 'video': 0, 'image': 0})
            
            summary = SLInterpreterSummary(
                id=interpreter.id,
                name=interpreter.name,
                skill_level=interpreter.skill_level,
                profile_image=interpreter.profile_image,
                gender=interpreter.gender,
                location=interpreter.location,
                phone=interpreter.phone,  # 추가된 필드
                email=interpreter.email,  # 추가된 필드
                sign_languages=sign_languages_list,
                samples_count=sample_stats['total'],
                video_samples_count=sample_stats['video'],
                image_samples_count=sample_stats['image'],
                created_at=interpreter.created_at
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

    def _build_filter_conditions(self, filters: SLInterpreterSearchFilters) -> List:
        """필터 조건을 SQLAlchemy 조건으로 변환"""
        conditions = []
        
        if filters.keyword:
            keyword_condition = or_(
                SLInterpreter.name.ilike(f"%{filters.keyword}%"),
                SLInterpreter.memo.ilike(f"%{filters.keyword}%")
            )
            conditions.append(keyword_condition)
        
        if filters.skill_levels:
            conditions.append(SLInterpreter.skill_level.in_(filters.skill_levels))
        
        if filters.locations:
            location_conditions = []
            for location in filters.locations:
                location_conditions.append(SLInterpreter.location.ilike(f"%{location}%"))
            conditions.append(or_(*location_conditions))
        
        if filters.genders:
            conditions.append(SLInterpreter.gender.in_(filters.genders))
        
        # 사용수어 필터는 조인이 필요하므로 별도 처리
        if filters.sign_languages:
            sign_language_condition = SLInterpreter.id.in_(
                select(SLInterpreterSignLanguage.sl_interpreter_id)
                .where(SLInterpreterSignLanguage.sign_language_code.in_(filters.sign_languages))
            )
            conditions.append(sign_language_condition)
        
        return conditions

    def search_optimized(
        self, 
        db: Session, 
        *,
        filters: SLInterpreterSearchFilters,
        skip: int = 0,
        limit: int = 20
    ) -> Tuple[List[SLInterpreterSummary], PaginationMeta]:
        """최적화된 검색 기능"""
        return self.get_multi_with_pagination(
            db, 
            skip=skip, 
            limit=limit, 
            filters=filters
        )

    def get_by_sign_language_optimized(
        self, 
        db: Session, 
        *, 
        sign_language_code: str,
        skip: int = 0,
        limit: int = 20
    ) -> Tuple[List[SLInterpreterSummary], PaginationMeta]:
        """사용수어로 필터링 - 최적화된 버전"""
        filters = SLInterpreterSearchFilters(sign_languages=[sign_language_code])
        return self.get_multi_with_pagination(
            db,
            skip=skip,
            limit=limit,
            filters=filters
        )

    def create_with_relations(
        self, 
        db: Session, 
        *, 
        obj_in: SLInterpreterCreate
    ) -> SLInterpreter:
        """관계 데이터를 포함한 수어통역사 생성 - 트랜잭션 최적화"""
        try:
            # 기본 객체 생성
            obj_in_data = obj_in.model_dump(exclude={"sign_languages", "expertise"})
            db_obj = SLInterpreter(**obj_in_data)
            db.add(db_obj)
            db.flush()  # ID 생성을 위해 flush
            
            # 관계 데이터 배치 생성
            if obj_in.sign_languages:
                sign_languages = [
                    SLInterpreterSignLanguage(
                        **sign_lang_data.model_dump(),
                        sl_interpreter_id=db_obj.id
                    )
                    for sign_lang_data in obj_in.sign_languages
                ]
                db.add_all(sign_languages)
            
            if obj_in.expertise:
                expertise_list = [
                    SLInterpreterExpertise(
                        **expertise_data.model_dump(),
                        sl_interpreter_id=db_obj.id
                    )
                    for expertise_data in obj_in.expertise
                ]
                db.add_all(expertise_list)
            
            db.commit()
            db.refresh(db_obj)
            return self.get_with_relations(db, id=db_obj.id)
            
        except Exception as e:
            db.rollback()
            raise e

    def update_with_relations(
        self, 
        db: Session, 
        *, 
        db_obj: SLInterpreter, 
        obj_in: SLInterpreterUpdate
    ) -> SLInterpreter:
        """관계 데이터를 포함한 수어통역사 수정 - 최적화된 업데이트"""
        try:
            # 기본 필드 업데이트
            obj_data = obj_in.model_dump(exclude_unset=True, exclude={"sign_languages", "expertise"})
            for field, value in obj_data.items():
                setattr(db_obj, field, value)
            
            # 관계 데이터 업데이트 - 배치 삭제/삽입으로 최적화
            if obj_in.sign_languages is not None:
                # 기존 사용수어 삭제 (배치 삭제)
                db.execute(
                    text("DELETE FROM sl_interpreter_sign_languages WHERE sl_interpreter_id = :interpreter_id"),
                    {"interpreter_id": db_obj.id}
                )
                
                # 새 사용수어 추가 (배치 삽입)
                if obj_in.sign_languages:
                    sign_languages = [
                        SLInterpreterSignLanguage(
                            **sign_lang_data.model_dump(),
                            sl_interpreter_id=db_obj.id
                        )
                        for sign_lang_data in obj_in.sign_languages
                    ]
                    db.add_all(sign_languages)
            
            if obj_in.expertise is not None:
                # 기존 전문영역 삭제 (배치 삭제)
                db.execute(
                    text("DELETE FROM sl_interpreter_expertise WHERE sl_interpreter_id = :interpreter_id"),
                    {"interpreter_id": db_obj.id}
                )
                
                # 새 전문영역 추가 (배치 삽입)
                if obj_in.expertise:
                    expertise_list = [
                        SLInterpreterExpertise(
                            **expertise_data.model_dump(),
                            sl_interpreter_id=db_obj.id
                        )
                        for expertise_data in obj_in.expertise
                    ]
                    db.add_all(expertise_list)
            
            db.commit()
            db.refresh(db_obj)
            return self.get_with_relations(db, id=db_obj.id)
            
        except Exception as e:
            db.rollback()
            raise e

    # 샘플 관련 CRUD 메서드
    def create_sample(
        self, 
        db: Session, 
        *, 
        sl_interpreter_id: int, 
        obj_in: SLInterpreterSampleCreate
    ) -> SLInterpreterSample:
        """수어통역사 샘플 생성"""
        obj_in_data = obj_in.model_dump()
        obj_in_data["sl_interpreter_id"] = sl_interpreter_id
        db_obj = SLInterpreterSample(**obj_in_data)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def get_sample(
        self, 
        db: Session, 
        *, 
        sl_interpreter_id: int, 
        sample_id: int
    ) -> Optional[SLInterpreterSample]:
        """수어통역사 샘플 조회"""
        statement = select(SLInterpreterSample).where(
            SLInterpreterSample.sl_interpreter_id == sl_interpreter_id,
            SLInterpreterSample.id == sample_id
        )
        return db.exec(statement).first()

    def update_sample_file(
        self, 
        db: Session, 
        *, 
        db_obj: SLInterpreterSample,
        file_path: str,
        file_size: int,
        file_type: str
    ) -> SLInterpreterSample:
        """수어통역사 샘플 파일 정보 업데이트"""
        db_obj.file_path = file_path
        db_obj.file_size = file_size
        db_obj.file_type = file_type
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def remove_sample(
        self, 
        db: Session, 
        *, 
        sl_interpreter_id: int, 
        sample_id: int
    ) -> bool:
        """수어통역사 샘플 삭제"""
        statement = select(SLInterpreterSample).where(
            SLInterpreterSample.sl_interpreter_id == sl_interpreter_id,
            SLInterpreterSample.id == sample_id
        )
        sample = db.exec(statement).first()
        if sample:
            db.delete(sample)
            db.commit()
            return True
        return False

    def get_stats(self, db: Session) -> Dict[str, Any]:
        """수어통역사 통계 정보"""
        stats_query = text("""
            SELECT 
                COUNT(*) as total_interpreters,
                AVG(skill_level) as avg_skill_level,
                COUNT(CASE WHEN skill_level >= 7 THEN 1 END) as expert_count,
                COUNT(DISTINCT location) as unique_locations
            FROM sl_interpreters
            WHERE skill_level IS NOT NULL
        """)
        
        result = db.execute(stats_query).fetchone()
        
        return {
            "total_interpreters": result.total_interpreters,
            "average_skill_level": round(result.avg_skill_level, 2) if result.avg_skill_level else 0,
            "expert_count": result.expert_count,
            "unique_locations": result.unique_locations
        }

    def get_credits(
        self, 
        db: Session, 
        *, 
        sl_interpreter_id: int,
        skip: int = 0,
        limit: int = 20,
        media_types: Optional[List[str]] = None
    ) -> Tuple[List[Dict[str, Any]], int]:
        """수어통역사의 작업 이력(크레딧) 조회"""
        from sqlalchemy import text
        
        # 기본 쿼리 작성
        base_query = """
            SELECT DISTINCT
                m.id as movie_id,
                m.title as movie_title,
                EXTRACT(YEAR FROM m.release_date) as release_year,
                aa.id as access_asset_id,
                aa.media_type as access_type,
                ac.role as is_primary,
                ac.memo as role_name,
                ac.created_at
            FROM access_asset_credits ac
            JOIN access_assets aa ON ac.access_asset_id = aa.id
            JOIN movie m ON aa.movie_id = m.id
            WHERE ac.sl_interpreter_id = :sl_interpreter_id
        """
        
        count_query = """
            SELECT COUNT(DISTINCT ac.id)
            FROM access_asset_credits ac
            JOIN access_assets aa ON ac.access_asset_id = aa.id
            WHERE ac.sl_interpreter_id = :sl_interpreter_id
        """
        
        # 미디어 타입 필터 추가
        if media_types:
            media_type_filter = " AND aa.media_type IN :media_types"
            base_query += media_type_filter
            count_query += media_type_filter
        
        # 정렬 및 페이지네이션
        base_query += " ORDER BY ac.created_at DESC LIMIT :limit OFFSET :skip"
        
        # 파라미터 설정
        params = {
            "sl_interpreter_id": sl_interpreter_id,
            "limit": limit,
            "skip": skip
        }
        
        if media_types:
            params["media_types"] = tuple(media_types)
        
        # 전체 개수 조회
        total_result = db.execute(text(count_query), params)
        total_count = total_result.scalar() or 0
        
        # 데이터 조회
        result = db.execute(text(base_query), params)
        
        credits = []
        for row in result:
            credits.append({
                "movieId": row.movie_id,
                "movieTitle": row.movie_title,
                "releaseYear": str(int(row.release_year)) if row.release_year else None,
                "accessAssetId": row.access_asset_id,
                "accessType": row.access_type,
                "isPrimary": row.is_primary == 'primary' if row.is_primary else False,
                "roleName": row.role_name,
                "createdAt": row.created_at.isoformat() if row.created_at else None
            })
        
        return credits, total_count

sl_interpreter = CRUDSLInterpreter(SLInterpreter)
