# app/crud/crud_staff.py
from typing import List, Optional, Tuple, Dict, Any
from sqlmodel import Session, select, func, text, and_, or_
from sqlalchemy.orm import selectinload, joinedload
from sqlalchemy import desc, asc

from app.crud.base import CRUDBase
from app.models.staff import (
    Staff, 
    StaffCreate, 
    StaffUpdate,
    StaffRole,
    StaffExpertise,
    StaffWorkLog,
    StaffPortfolio
)
from app.schemas.staff import (
    StaffSummary,
    StaffSearchFilters,
    StaffRoleCreate,
    StaffExpertiseCreate,
    StaffWorkLogCreate,
    StaffPortfolioCreate,
    PaginationMeta
)

class CRUDStaff(CRUDBase[Staff, StaffCreate, StaffUpdate]):
    
    def get_with_relations(self, db: Session, *, id: int) -> Optional[Staff]:
        """관계 데이터를 포함한 스태프 조회 - 최적화된 로딩"""
        statement = (
            select(Staff)
            .options(
                selectinload(Staff.roles),
                selectinload(Staff.expertise),
                selectinload(Staff.work_logs),
                selectinload(Staff.portfolios)
            )
            .where(Staff.id == id)
        )
        return db.exec(statement).first()

    def get_multi_with_pagination(
        self, 
        db: Session,
        *,
        skip: int = 0,
        limit: int = 20,
        filters: Optional[StaffSearchFilters] = None,
        order_by: str = "created_at",
        order_desc: bool = True
    ) -> Tuple[List[StaffSummary], PaginationMeta]:
        """페이지네이션과 필터링을 지원하는 최적화된 목록 조회"""
        
        # 기본 쿼리 빌드
        base_query = select(Staff)
        count_query = select(func.count(Staff.id))
        
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
        order_column = getattr(Staff, order_by, Staff.created_at)
        if order_desc:
            base_query = base_query.order_by(desc(order_column))
        else:
            base_query = base_query.order_by(asc(order_column))
        
        # 페이지네이션 적용
        base_query = base_query.offset(skip).limit(limit)
        
        # 데이터 조회 (관계 데이터는 별도 쿼리로 최적화)
        staffs = db.exec(base_query).all()
        
        if not staffs:
            return [], PaginationMeta(
                total=total,
                page=current_page,
                limit=limit,
                total_pages=total_pages,
                has_next=has_next,
                has_prev=has_prev
            )
        
        # 관계 데이터를 배치로 로드 (N+1 쿼리 방지)
        staff_ids = [i.id for i in staffs]
        
        # 역할 데이터 배치 로드
        roles_query = (
            select(StaffRole)
            .where(StaffRole.staff_id.in_(staff_ids))
        )
        roles = db.exec(roles_query).all()
        roles_by_staff = {}
        for role in roles:
            if role.staff_id not in roles_by_staff:
                roles_by_staff[role.staff_id] = []
            roles_by_staff[role.staff_id].append(role.role_type)
        
        # 대표작 통계 배치 로드
        portfolios_stats_query = text("""
            SELECT 
                staff_id,
                COUNT(*) as total_portfolios
            FROM staff_portfolios 
            WHERE staff_id = ANY(:staff_ids)
            GROUP BY staff_id
        """)
        
        portfolios_stats = db.execute(portfolios_stats_query, {"staff_ids": staff_ids}).fetchall()
        portfolios_stats_by_staff = {}
        for stat in portfolios_stats:
            portfolios_stats_by_staff[stat.staff_id] = stat.total_portfolios
        
        # 작업로그 통계 배치 로드
        work_logs_stats_query = text("""
            SELECT 
                staff_id,
                COUNT(*) as total_work_logs
            FROM staff_work_logs 
            WHERE staff_id = ANY(:staff_ids)
            GROUP BY staff_id
        """)
        
        work_logs_stats = db.execute(work_logs_stats_query, {"staff_ids": staff_ids}).fetchall()
        work_logs_stats_by_staff = {}
        for stat in work_logs_stats:
            work_logs_stats_by_staff[stat.staff_id] = stat.total_work_logs
        
        # StaffSummary 객체 생성
        summaries = []
        for staff in staffs:
            roles_list = roles_by_staff.get(staff.id, [])
            portfolios_count = portfolios_stats_by_staff.get(staff.id, 0)
            work_logs_count = work_logs_stats_by_staff.get(staff.id, 0)
            
            summary = StaffSummary(
                id=staff.id,
                name=staff.name,
                skill_level=staff.skill_level,
                profile_image=staff.profile_image,
                gender=staff.gender,
                location=staff.location,
                phone=staff.phone,
                email=staff.email,
                roles=roles_list,
                portfolios_count=portfolios_count,
                work_logs_count=work_logs_count,
                samples_count=0,  # PersonnelSummary 호환성
                created_at=staff.created_at
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

    def _build_filter_conditions(self, filters: StaffSearchFilters) -> List:
        """필터 조건을 SQLAlchemy 조건으로 변환"""
        conditions = []
        
        if filters.keyword:
            keyword_condition = or_(
                Staff.name.ilike(f"%{filters.keyword}%"),
                Staff.memo.ilike(f"%{filters.keyword}%")
            )
            conditions.append(keyword_condition)
        
        if filters.skill_levels:
            conditions.append(Staff.skill_level.in_(filters.skill_levels))
        
        if filters.locations:
            location_conditions = []
            for location in filters.locations:
                location_conditions.append(Staff.location.ilike(f"%{location}%"))
            conditions.append(or_(*location_conditions))
        
        if filters.genders:
            conditions.append(Staff.gender.in_(filters.genders))
        
        # 역할 필터는 조인이 필요하므로 별도 처리
        if filters.roles:
            role_condition = Staff.id.in_(
                select(StaffRole.staff_id)
                .where(StaffRole.role_type.in_(filters.roles))
            )
            conditions.append(role_condition)
        
        return conditions

    def search_optimized(
        self, 
        db: Session, 
        *,
        filters: StaffSearchFilters,
        skip: int = 0,
        limit: int = 20
    ) -> Tuple[List[StaffSummary], PaginationMeta]:
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
        obj_in: StaffCreate
    ) -> Staff:
        """관계 데이터를 포함한 스태프 생성 - 트랜잭션 최적화"""
        try:
            # 기본 객체 생성
            obj_in_data = obj_in.model_dump(exclude={"roles", "expertise"})
            db_obj = Staff(**obj_in_data)
            db.add(db_obj)
            db.flush()  # ID 생성을 위해 flush
            
            # 관계 데이터 배치 생성
            if obj_in.roles:
                roles = [
                    StaffRole(
                        **role_data.model_dump(),
                        staff_id=db_obj.id
                    )
                    for role_data in obj_in.roles
                ]
                db.add_all(roles)
            
            if obj_in.expertise:
                expertise = [
                    StaffExpertise(
                        **expertise_data.model_dump(),
                        staff_id=db_obj.id
                    )
                    for expertise_data in obj_in.expertise
                ]
                db.add_all(expertise)
            
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
        db_obj: Staff, 
        obj_in: StaffUpdate
    ) -> Staff:
        """관계 데이터를 포함한 스태프 수정 - 최적화된 업데이트"""
        try:
            # 기본 필드 업데이트
            obj_data = obj_in.model_dump(exclude_unset=True, exclude={"roles", "expertise"})
            for field, value in obj_data.items():
                setattr(db_obj, field, value)
            
            # 관계 데이터 업데이트 - 배치 삭제/삽입으로 최적화
            if obj_in.roles is not None:
                # 기존 역할 삭제 (배치 삭제)
                db.execute(
                    text("DELETE FROM staff_roles WHERE staff_id = :staff_id"),
                    {"staff_id": db_obj.id}
                )
                
                # 새 역할 추가 (배치 삽입)
                if obj_in.roles:
                    roles = [
                        StaffRole(
                            **role_data.model_dump(),
                            staff_id=db_obj.id
                        )
                        for role_data in obj_in.roles
                    ]
                    db.add_all(roles)
            
            if obj_in.expertise is not None:
                # 기존 전문영역 삭제 (배치 삭제)
                db.execute(
                    text("DELETE FROM staff_expertise WHERE staff_id = :staff_id"),
                    {"staff_id": db_obj.id}
                )
                
                # 새 전문영역 추가 (배치 삽입)
                if obj_in.expertise:
                    expertise = [
                        StaffExpertise(
                            **expertise_data.model_dump(),
                            staff_id=db_obj.id
                        )
                        for expertise_data in obj_in.expertise
                    ]
                    db.add_all(expertise)
            
            db.commit()
            db.refresh(db_obj)
            return self.get_with_relations(db, id=db_obj.id)
            
        except Exception as e:
            db.rollback()
            raise e

    # 작업로그 관련 CRUD 메서드
    def create_work_log(
        self, 
        db: Session, 
        *, 
        staff_id: int, 
        obj_in: StaffWorkLogCreate
    ) -> StaffWorkLog:
        """스태프 작업로그 생성"""
        obj_in_data = obj_in.model_dump()
        obj_in_data["staff_id"] = staff_id
        db_obj = StaffWorkLog(**obj_in_data)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def get_work_log(
        self, 
        db: Session, 
        *, 
        staff_id: int, 
        work_log_id: int
    ) -> Optional[StaffWorkLog]:
        """스태프 작업로그 조회"""
        statement = select(StaffWorkLog).where(
            StaffWorkLog.staff_id == staff_id,
            StaffWorkLog.id == work_log_id
        )
        return db.exec(statement).first()

    def remove_work_log(
        self, 
        db: Session, 
        *, 
        staff_id: int, 
        work_log_id: int
    ) -> bool:
        """스태프 작업로그 삭제"""
        statement = select(StaffWorkLog).where(
            StaffWorkLog.staff_id == staff_id,
            StaffWorkLog.id == work_log_id
        )
        work_log = db.exec(statement).first()
        if work_log:
            db.delete(work_log)
            db.commit()
            return True
        return False

    # 대표작 관련 CRUD 메서드
    def create_portfolio(
        self, 
        db: Session, 
        *, 
        staff_id: int, 
        obj_in: StaffPortfolioCreate
    ) -> StaffPortfolio:
        """스태프 대표작 생성"""
        obj_in_data = obj_in.model_dump()
        obj_in_data["staff_id"] = staff_id
        db_obj = StaffPortfolio(**obj_in_data)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def get_portfolio(
        self, 
        db: Session, 
        *, 
        staff_id: int, 
        portfolio_id: int
    ) -> Optional[StaffPortfolio]:
        """스태프 대표작 조회"""
        statement = select(StaffPortfolio).where(
            StaffPortfolio.staff_id == staff_id,
            StaffPortfolio.id == portfolio_id
        )
        return db.exec(statement).first()

    def update_portfolio_images(
        self, 
        db: Session, 
        *, 
        db_obj: StaffPortfolio,
        poster_image: Optional[str] = None,
        credit_image: Optional[str] = None
    ) -> StaffPortfolio:
        """스태프 대표작 이미지 정보 업데이트"""
        if poster_image:
            db_obj.poster_image = poster_image
        if credit_image:
            db_obj.credit_image = credit_image
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def remove_portfolio(
        self, 
        db: Session, 
        *, 
        staff_id: int, 
        portfolio_id: int
    ) -> bool:
        """스태프 대표작 삭제"""
        statement = select(StaffPortfolio).where(
            StaffPortfolio.staff_id == staff_id,
            StaffPortfolio.id == portfolio_id
        )
        portfolio = db.exec(statement).first()
        if portfolio:
            db.delete(portfolio)
            db.commit()
            return True
        return False

    def get_stats(self, db: Session) -> Dict[str, Any]:
        """스태프 통계 정보"""
        stats_query = text("""
            SELECT 
                COUNT(*) as total_staffs,
                AVG(skill_level) as avg_skill_level,
                COUNT(CASE WHEN skill_level >= 7 THEN 1 END) as expert_count,
                COUNT(DISTINCT location) as unique_locations
            FROM staffs
            WHERE skill_level IS NOT NULL
        """)
        
        result = db.execute(stats_query).fetchone()
        
        return {
            "total_staffs": result.total_staffs,
            "average_skill_level": round(result.avg_skill_level, 2) if result.avg_skill_level else 0,
            "expert_count": result.expert_count,
            "unique_locations": result.unique_locations
        }

staff = CRUDStaff(Staff)
