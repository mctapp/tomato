# app/crud/crud_scriptwriter.py
from typing import List, Optional, Tuple, Dict, Any
from sqlmodel import Session, select, func, text, and_, or_
from sqlalchemy.orm import selectinload, joinedload
from sqlalchemy import desc, asc

from app.crud.base import CRUDBase
from app.models.scriptwriter import (
    Scriptwriter, 
    ScriptwriterCreate, 
    ScriptwriterUpdate,
    ScriptwriterLanguage,
    ScriptwriterSpecialty,
    ScriptwriterWorkLog,
    ScriptwriterSample
)
from app.schemas.scriptwriter import (
    ScriptwriterSummary,
    ScriptwriterSearchFilters,
    ScriptwriterLanguageCreate,
    ScriptwriterSpecialtyCreate,
    ScriptwriterWorkLogCreate,
    ScriptwriterSampleCreate,
    PaginationMeta,
    ScriptwriterCredit
)

class CRUDScriptwriter(CRUDBase[Scriptwriter, ScriptwriterCreate, ScriptwriterUpdate]):
    
    def get_with_relations(self, db: Session, *, id: int) -> Optional[Scriptwriter]:
        """관계 데이터를 포함한 해설작가 조회 - 최적화된 로딩"""
        statement = (
            select(Scriptwriter)
            .options(
                selectinload(Scriptwriter.languages),
                selectinload(Scriptwriter.specialties),
                selectinload(Scriptwriter.work_logs),
                selectinload(Scriptwriter.samples)
            )
            .where(Scriptwriter.id == id)
        )
        return db.exec(statement).first()

    def get_multi_with_pagination(
        self, 
        db: Session,
        *,
        skip: int = 0,
        limit: int = 20,
        filters: Optional[ScriptwriterSearchFilters] = None,
        order_by: str = "created_at",
        order_desc: bool = True
    ) -> Tuple[List[ScriptwriterSummary], PaginationMeta]:
        """페이지네이션과 필터링을 지원하는 최적화된 목록 조회"""
        
        # 기본 쿼리 빌드
        base_query = select(Scriptwriter)
        count_query = select(func.count(Scriptwriter.id))
        
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
        order_column = getattr(Scriptwriter, order_by, Scriptwriter.created_at)
        if order_desc:
            base_query = base_query.order_by(desc(order_column))
        else:
            base_query = base_query.order_by(asc(order_column))
        
        # 페이지네이션 적용
        base_query = base_query.offset(skip).limit(limit)
        
        # 데이터 조회 (관계 데이터는 별도 쿼리로 최적화)
        scriptwriters = db.exec(base_query).all()
        
        if not scriptwriters:
            return [], PaginationMeta(
                total=total,
                page=current_page,
                limit=limit,
                total_pages=total_pages,
                has_next=has_next,
                has_prev=has_prev
            )
        
        # 관계 데이터를 배치로 로드 (N+1 쿼리 방지)
        scriptwriter_ids = [i.id for i in scriptwriters]
        
        # 사용언어 데이터 배치 로드
        languages_query = (
            select(ScriptwriterLanguage)
            .where(ScriptwriterLanguage.scriptwriter_id.in_(scriptwriter_ids))
        )
        languages = db.exec(languages_query).all()
        languages_by_scriptwriter = {}
        for lang in languages:
            if lang.scriptwriter_id not in languages_by_scriptwriter:
                languages_by_scriptwriter[lang.scriptwriter_id] = []
            languages_by_scriptwriter[lang.scriptwriter_id].append(lang.language_code)
        
        # 해설분야 데이터 배치 로드
        specialties_query = (
            select(ScriptwriterSpecialty)
            .where(ScriptwriterSpecialty.scriptwriter_id.in_(scriptwriter_ids))
        )
        specialties = db.exec(specialties_query).all()
        specialties_by_scriptwriter = {}
        for specialty in specialties:
            if specialty.scriptwriter_id not in specialties_by_scriptwriter:
                specialties_by_scriptwriter[specialty.scriptwriter_id] = []
            specialties_by_scriptwriter[specialty.scriptwriter_id].append(specialty.specialty_type)
        
        # 대표해설 통계 배치 로드
        samples_stats_query = text("""
            SELECT 
                scriptwriter_id,
                COUNT(*) as total_samples
            FROM scriptwriter_samples 
            WHERE scriptwriter_id = ANY(:scriptwriter_ids)
            GROUP BY scriptwriter_id
        """)
        
        samples_stats = db.execute(samples_stats_query, {"scriptwriter_ids": scriptwriter_ids}).fetchall()
        samples_stats_by_scriptwriter = {}
        for stat in samples_stats:
            samples_stats_by_scriptwriter[stat.scriptwriter_id] = stat.total_samples
        
        # 작업로그 통계 배치 로드
        work_logs_stats_query = text("""
            SELECT 
                scriptwriter_id,
                COUNT(*) as total_work_logs
            FROM scriptwriter_work_logs 
            WHERE scriptwriter_id = ANY(:scriptwriter_ids)
            GROUP BY scriptwriter_id
        """)
        
        work_logs_stats = db.execute(work_logs_stats_query, {"scriptwriter_ids": scriptwriter_ids}).fetchall()
        work_logs_stats_by_scriptwriter = {}
        for stat in work_logs_stats:
            work_logs_stats_by_scriptwriter[stat.scriptwriter_id] = stat.total_work_logs
        
        # ScriptwriterSummary 객체 생성
        summaries = []
        for scriptwriter in scriptwriters:
            languages_list = languages_by_scriptwriter.get(scriptwriter.id, [])
            specialties_list = specialties_by_scriptwriter.get(scriptwriter.id, [])
            samples_count = samples_stats_by_scriptwriter.get(scriptwriter.id, 0)
            work_logs_count = work_logs_stats_by_scriptwriter.get(scriptwriter.id, 0)
            
            summary = ScriptwriterSummary(
                id=scriptwriter.id,
                name=scriptwriter.name,
                skill_level=scriptwriter.skill_level,
                profile_image=scriptwriter.profile_image,
                gender=scriptwriter.gender,
                location=scriptwriter.location,
                phone=scriptwriter.phone,
                email=scriptwriter.email,
                languages=languages_list,
                specialties=specialties_list,
                samples_count=samples_count,
                work_logs_count=work_logs_count,
                created_at=scriptwriter.created_at
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

    def _build_filter_conditions(self, filters: ScriptwriterSearchFilters) -> List:
        """필터 조건을 SQLAlchemy 조건으로 변환"""
        conditions = []
        
        if filters.keyword:
            keyword_condition = or_(
                Scriptwriter.name.ilike(f"%{filters.keyword}%"),
                Scriptwriter.memo.ilike(f"%{filters.keyword}%")
            )
            conditions.append(keyword_condition)
        
        if filters.skill_levels:
            conditions.append(Scriptwriter.skill_level.in_(filters.skill_levels))
        
        if filters.locations:
            location_conditions = []
            for location in filters.locations:
                location_conditions.append(Scriptwriter.location.ilike(f"%{location}%"))
            conditions.append(or_(*location_conditions))
        
        if filters.genders:
            conditions.append(Scriptwriter.gender.in_(filters.genders))
        
        # 사용언어 필터는 조인이 필요하므로 별도 처리
        if filters.languages:
            language_condition = Scriptwriter.id.in_(
                select(ScriptwriterLanguage.scriptwriter_id)
                .where(ScriptwriterLanguage.language_code.in_(filters.languages))
            )
            conditions.append(language_condition)
        
        # 해설분야 필터는 조인이 필요하므로 별도 처리
        if filters.specialties:
            specialty_condition = Scriptwriter.id.in_(
                select(ScriptwriterSpecialty.scriptwriter_id)
                .where(ScriptwriterSpecialty.specialty_type.in_(filters.specialties))
            )
            conditions.append(specialty_condition)
        
        return conditions

    def search_optimized(
        self, 
        db: Session, 
        *,
        filters: ScriptwriterSearchFilters,
        skip: int = 0,
        limit: int = 20
    ) -> Tuple[List[ScriptwriterSummary], PaginationMeta]:
        """최적화된 검색 기능"""
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
        obj_in: ScriptwriterCreate
    ) -> Scriptwriter:
        """관계 데이터를 포함한 해설작가 생성 - 트랜잭션 최적화"""
        try:
            # 기본 객체 생성
            obj_in_data = obj_in.model_dump(exclude={"languages", "specialties"})
            db_obj = Scriptwriter(**obj_in_data)
            db.add(db_obj)
            db.flush()  # ID 생성을 위해 flush
            
            # 관계 데이터 배치 생성
            if obj_in.languages:
                languages = [
                    ScriptwriterLanguage(
                        **lang_data.model_dump(),
                        scriptwriter_id=db_obj.id
                    )
                    for lang_data in obj_in.languages
                ]
                db.add_all(languages)
            
            if obj_in.specialties:
                specialties = [
                    ScriptwriterSpecialty(
                        **specialty_data.model_dump(),
                        scriptwriter_id=db_obj.id
                    )
                    for specialty_data in obj_in.specialties
                ]
                db.add_all(specialties)
            
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
        db_obj: Scriptwriter, 
        obj_in: ScriptwriterUpdate
    ) -> Scriptwriter:
        """관계 데이터를 포함한 해설작가 수정 - 최적화된 업데이트"""
        try:
            # 기본 필드 업데이트
            obj_data = obj_in.model_dump(exclude_unset=True, exclude={"languages", "specialties"})
            for field, value in obj_data.items():
                setattr(db_obj, field, value)
            
            # 관계 데이터 업데이트 - 배치 삭제/삽입으로 최적화
            if obj_in.languages is not None:
                # 기존 사용언어 삭제 (배치 삭제)
                db.execute(
                    text("DELETE FROM scriptwriter_languages WHERE scriptwriter_id = :scriptwriter_id"),
                    {"scriptwriter_id": db_obj.id}
                )
                
                # 새 사용언어 추가 (배치 삽입)
                if obj_in.languages:
                    languages = [
                        ScriptwriterLanguage(
                            **lang_data.model_dump(),
                            scriptwriter_id=db_obj.id
                        )
                        for lang_data in obj_in.languages
                    ]
                    db.add_all(languages)
            
            if obj_in.specialties is not None:
                # 기존 해설분야 삭제 (배치 삭제)
                db.execute(
                    text("DELETE FROM scriptwriter_specialties WHERE scriptwriter_id = :scriptwriter_id"),
                    {"scriptwriter_id": db_obj.id}
                )
                
                # 새 해설분야 추가 (배치 삽입)
                if obj_in.specialties:
                    specialties = [
                        ScriptwriterSpecialty(
                            **specialty_data.model_dump(),
                            scriptwriter_id=db_obj.id
                        )
                        for specialty_data in obj_in.specialties
                    ]
                    db.add_all(specialties)
            
            db.commit()
            db.refresh(db_obj)
            return self.get_with_relations(db, id=db_obj.id)
            
        except Exception as e:
            db.rollback()
            raise e

    def get_credits(
        self,
        db: Session,
        *,
        scriptwriter_id: int,
        skip: int = 0,
        limit: int = 20,
        access_types: Optional[List[str]] = None
    ) -> Tuple[List[ScriptwriterCredit], int]:
        """해설작가의 작업 이력(크레딧) 조회"""
        # 기본 쿼리
        query = text("""
            SELECT 
                aac.access_asset_id,
                aac.is_primary,
                aa.movie_id,
                aa.media_type as access_type,
                aa.created_at,
                m.title as movie_title,
                EXTRACT(YEAR FROM m.release_date)::integer as release_year
            FROM access_asset_credits aac
            JOIN access_assets aa ON aac.access_asset_id = aa.id
            JOIN movie m ON aa.movie_id = m.id
            WHERE aac.scriptwriter_id = :scriptwriter_id
        """)
        
        # 카운트 쿼리
        count_query = text("""
            SELECT COUNT(*)
            FROM access_asset_credits aac
            JOIN access_assets aa ON aac.access_asset_id = aa.id
            WHERE aac.scriptwriter_id = :scriptwriter_id
        """)
        
        # 접근성 미디어 타입 필터
        if access_types:
            access_types_str = ','.join([f"'{at}'" for at in access_types])
            query = text(f"""
                SELECT 
                    aac.access_asset_id,
                    aac.is_primary,
                    aa.movie_id,
                    aa.media_type as access_type,
                    aa.created_at,
                    m.title as movie_title,
                    EXTRACT(YEAR FROM m.release_date)::integer as release_year
                FROM access_asset_credits aac
                JOIN access_assets aa ON aac.access_asset_id = aa.id
                JOIN movie m ON aa.movie_id = m.id
                WHERE aac.scriptwriter_id = :scriptwriter_id
                AND aa.media_type IN ({access_types_str})
                ORDER BY aa.created_at DESC
                LIMIT :limit OFFSET :skip
            """)
            
            count_query = text(f"""
                SELECT COUNT(*)
                FROM access_asset_credits aac
                JOIN access_assets aa ON aac.access_asset_id = aa.id
                WHERE aac.scriptwriter_id = :scriptwriter_id
                AND aa.media_type IN ({access_types_str})
            """)
        else:
            query = text("""
                SELECT 
                    aac.access_asset_id,
                    aac.is_primary,
                    aa.movie_id,
                    aa.media_type as access_type,
                    aa.created_at,
                    m.title as movie_title,
                    EXTRACT(YEAR FROM m.release_date)::integer as release_year
                FROM access_asset_credits aac
                JOIN access_assets aa ON aac.access_asset_id = aa.id
                JOIN movie m ON aa.movie_id = m.id
                WHERE aac.scriptwriter_id = :scriptwriter_id
                ORDER BY aa.created_at DESC
                LIMIT :limit OFFSET :skip
            """)
        
        # 총 개수 조회
        total_count = db.execute(count_query, {"scriptwriter_id": scriptwriter_id}).scalar()
        
        # 데이터 조회
        results = db.execute(
            query, 
            {
                "scriptwriter_id": scriptwriter_id,
                "limit": limit,
                "skip": skip
            }
        ).fetchall()
        
        # ScriptwriterCredit 객체로 변환
        credits = []
        for row in results:
            credit = ScriptwriterCredit(
                access_asset_id=row.access_asset_id,
                movie_id=row.movie_id,
                movie_title=row.movie_title,
                movie_title_en=None,
                release_year=row.release_year,
                poster_image=None,
                access_type=row.access_type,
                created_at=row.created_at.isoformat() if row.created_at else None,
                is_primary=row.is_primary
            )
            credits.append(credit)
        
        return credits, total_count

    # 작업로그 관련 CRUD 메서드
    def create_work_log(
        self, 
        db: Session, 
        *, 
        scriptwriter_id: int, 
        obj_in: ScriptwriterWorkLogCreate
    ) -> ScriptwriterWorkLog:
        """해설작가 작업로그 생성"""
        obj_in_data = obj_in.model_dump()
        obj_in_data["scriptwriter_id"] = scriptwriter_id
        db_obj = ScriptwriterWorkLog(**obj_in_data)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def get_work_log(
        self, 
        db: Session, 
        *, 
        scriptwriter_id: int, 
        work_log_id: int
    ) -> Optional[ScriptwriterWorkLog]:
        """해설작가 작업로그 조회"""
        statement = select(ScriptwriterWorkLog).where(
            ScriptwriterWorkLog.scriptwriter_id == scriptwriter_id,
            ScriptwriterWorkLog.id == work_log_id
        )
        return db.exec(statement).first()

    def remove_work_log(
        self, 
        db: Session, 
        *, 
        scriptwriter_id: int, 
        work_log_id: int
    ) -> bool:
        """해설작가 작업로그 삭제"""
        statement = select(ScriptwriterWorkLog).where(
            ScriptwriterWorkLog.scriptwriter_id == scriptwriter_id,
            ScriptwriterWorkLog.id == work_log_id
        )
        work_log = db.exec(statement).first()
        if work_log:
            db.delete(work_log)
            db.commit()
            return True
        return False

    # 대표해설 관련 CRUD 메서드
    def create_sample(
        self, 
        db: Session, 
        *, 
        scriptwriter_id: int, 
        obj_in: ScriptwriterSampleCreate
    ) -> ScriptwriterSample:
        """해설작가 대표해설 생성"""
        obj_in_data = obj_in.model_dump()
        obj_in_data["scriptwriter_id"] = scriptwriter_id
        db_obj = ScriptwriterSample(**obj_in_data)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def get_sample(
        self, 
        db: Session, 
        *, 
        scriptwriter_id: int, 
        sample_id: int
    ) -> Optional[ScriptwriterSample]:
        """해설작가 대표해설 조회"""
        statement = select(ScriptwriterSample).where(
            ScriptwriterSample.scriptwriter_id == scriptwriter_id,
            ScriptwriterSample.id == sample_id
        )
        return db.exec(statement).first()

    def update_sample_images(
        self, 
        db: Session, 
        *, 
        db_obj: ScriptwriterSample,
        poster_image: Optional[str] = None,
        reference_image: Optional[str] = None
    ) -> ScriptwriterSample:
        """해설작가 대표해설 이미지 정보 업데이트"""
        if poster_image:
            db_obj.poster_image = poster_image
        if reference_image:
            db_obj.reference_image = reference_image
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def remove_sample(
        self, 
        db: Session, 
        *, 
        scriptwriter_id: int, 
        sample_id: int
    ) -> bool:
        """해설작가 대표해설 삭제"""
        statement = select(ScriptwriterSample).where(
            ScriptwriterSample.scriptwriter_id == scriptwriter_id,
            ScriptwriterSample.id == sample_id
        )
        sample = db.exec(statement).first()
        if sample:
            db.delete(sample)
            db.commit()
            return True
        return False

    def get_stats(self, db: Session) -> Dict[str, Any]:
        """해설작가 통계 정보"""
        stats_query = text("""
            SELECT 
                COUNT(*) as total_scriptwriters,
                AVG(skill_level) as avg_skill_level,
                COUNT(CASE WHEN skill_level >= 7 THEN 1 END) as expert_count,
                COUNT(DISTINCT location) as unique_locations
            FROM scriptwriters
            WHERE skill_level IS NOT NULL
        """)
        
        result = db.execute(stats_query).fetchone()
        
        return {
            "total_scriptwriters": result.total_scriptwriters,
            "average_skill_level": round(result.avg_skill_level, 2) if result.avg_skill_level else 0,
            "expert_count": result.expert_count,
            "unique_locations": result.unique_locations
        }

scriptwriter = CRUDScriptwriter(Scriptwriter)
