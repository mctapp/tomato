# app/routes/admin_distributors.py

from fastapi import APIRouter, Depends, HTTPException, status, Response, Query
from sqlalchemy.orm import Session, selectinload
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy import text
from typing import List, Optional, Dict
import logging

from app.db import get_session  # get_db → get_session으로 변경
from app.models.distributors import Distributor
from app.models.distributor_contacts import DistributorContact
from app.models.movies import Movie
from app.schemas.distributors import (
    DistributorResponse,
    DistributorCreate,
    DistributorUpdate,
    DistributorContactResponse,
    DistributorContactInput,
    DistributorListItemResponse
)

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/admin/api/distributors",
    tags=["Admin - Distributors"]
)

@router.get("/stats", response_model=Dict[str, int])
def get_distributor_stats(db: Session = Depends(get_session)):  # get_db → get_session
    """
    배급사 관련 통계 정보를 제공합니다.
    - 총 배급사 수
    - 총 담당자 수
    """
    try:
        # 총 배급사 수 계산
        total_distributors = db.query(Distributor).count()

        # 총 담당자 수 계산
        total_contacts = db.query(DistributorContact).count()

        return {
            "totalDistributors": total_distributors,
            "totalContacts": total_contacts
        }
    except SQLAlchemyError as e:
        logger.error(f"Database error getting distributor stats: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="데이터베이스 쿼리 중 오류가 발생했습니다."
        )
    except Exception as e:
        logger.error(f"Error getting distributor stats: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="통계 정보를 가져오는 중 오류가 발생했습니다."
        )

@router.post("", response_model=DistributorResponse, status_code=status.HTTP_201_CREATED)  # "/" → ""로 변경
async def create_distributor(
    distributor_in: DistributorCreate,
    db: Session = Depends(get_session)  # get_db → get_session
):
    """
    새로운 배급사를 등록합니다.
    """
    db_distributor = Distributor(**distributor_in.dict())
    try:
        db.add(db_distributor)
        db.commit()
        db.refresh(db_distributor)
        return db_distributor
    except IntegrityError as e:
        db.rollback()
        logger.error(f"IntegrityError creating distributor: {e}")
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="배급사 생성 중 데이터베이스 무결성 오류 발생 (예: 중복된 사업자 번호)"
        )
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating distributor: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"배급사 생성 중 오류 발생: {type(e).__name__}"
        )

@router.get("", response_model=List[DistributorListItemResponse])  # "/" → ""로 변경
def read_distributors(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = Query(None, description="배급사 이름 검색어"),
    db: Session = Depends(get_session)  # get_db → get_session
):
    """
    배급사 목록을 조회합니다 (페이지네이션 및 이름 검색 지원).
    """
    query = db.query(Distributor)

    if search:
        query = query.filter(Distributor.name.ilike(f"%{search}%"))

    distributors = query.order_by(Distributor.id).offset(skip).limit(limit).all()
    return distributors

@router.get("/{distributor_id}", response_model=DistributorResponse)
def read_distributor(
    distributor_id: int,
    db: Session = Depends(get_session)  # get_db → get_session
):
    """
    지정된 ID의 배급사 정보와 관련 담당자 목록을 함께 조회합니다.
    """
    db_distributor = db.query(Distributor)\
        .options(selectinload(Distributor.contacts))\
        .filter(Distributor.id == distributor_id)\
        .first()
    if not db_distributor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Distributor with ID {distributor_id} not found"
        )
    return db_distributor

@router.put("/{distributor_id}", response_model=DistributorResponse)
async def update_distributor(
    distributor_id: int,
    distributor_in: DistributorUpdate,
    db: Session = Depends(get_session)  # get_db → get_session
):
    """
    지정된 ID의 배급사 정보 및 관련 담당자 정보를 수정합니다.
    """
    # 배급사 조회
    db_distributor = db.query(Distributor)\
        .options(selectinload(Distributor.contacts))\
        .filter(Distributor.id == distributor_id)\
        .first()
    if not db_distributor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Distributor with ID {distributor_id} not found")

    # 기본 정보 업데이트
    update_data = distributor_in.dict(exclude_unset=True)
    for key, value in update_data.items():
        if key != 'contacts':
            if hasattr(db_distributor, key):
                 setattr(db_distributor, key, value)

    # 담당자 정보 처리
    if distributor_in.contacts is not None:
        incoming_contacts_data = distributor_in.contacts
        existing_contacts_map = {contact.id: contact for contact in db_distributor.contacts}
        incoming_contact_ids = {contact.id for contact in incoming_contacts_data if contact.id is not None}
        
        # 삭제할 담당자 처리
        for contact_id, contact in existing_contacts_map.items():
            if contact_id not in incoming_contact_ids:
                db.delete(contact)
        
        # 신규/수정 담당자 처리
        for contact_data in incoming_contacts_data:
            contact_id = contact_data.id
            if contact_id is None:  # 신규
                new_contact = DistributorContact(
                    **contact_data.dict(exclude={'id'}), 
                    distributor_id=db_distributor.id
                )
                db.add(new_contact)
            elif contact_id in existing_contacts_map:  # 수정
                existing_contact = existing_contacts_map[contact_id]
                update_contact_data = contact_data.dict(exclude_unset=True, exclude={'id'})
                for key, value in update_contact_data.items():
                    if hasattr(existing_contact, key):
                        setattr(existing_contact, key, value)

    # 변경사항 커밋
    try:
        db.commit()
        db.refresh(db_distributor)
        # 담당자 정보 다시 로드
        db_distributor = db.query(Distributor)\
            .options(selectinload(Distributor.contacts))\
            .filter(Distributor.id == distributor_id)\
            .first()
        return db_distributor
    except IntegrityError as e:
         db.rollback()
         logger.error(f"IntegrityError updating distributor {distributor_id}: {e}")
         raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="데이터베이스 무결성 제약 조건 위반 발생")
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating distributor {distributor_id}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"배급사 수정 중 오류 발생: {type(e).__name__}")

@router.delete("/{distributor_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_distributor(distributor_id: int, db: Session = Depends(get_session)):  # get_db → get_session
    """
    지정된 ID의 배급사 및 관련 담당자 정보를 삭제합니다.
    """
    # 배급사 존재 확인
    db_distributor = db.query(Distributor).filter(Distributor.id == distributor_id).first()
    if not db_distributor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="배급사를 찾을 수 없습니다")
        
    # SQL 직접 실행으로 영화 참조 확인 (파라미터화된 쿼리)
    movie_count_result = db.execute(
        text("SELECT COUNT(*) FROM movie WHERE distributor_id = :distributor_id"),
        {"distributor_id": distributor_id}
    ).scalar()
    
    if movie_count_result > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"배급사가 {movie_count_result}개의 영화와 연결되어 있어 삭제할 수 없습니다."
        )
    
    try:
        # 담당자 삭제 - text() 함수 사용
        db.execute(
            text("DELETE FROM distributor_contacts WHERE distributor_id = :distributor_id"),
            {"distributor_id": distributor_id}
        )
        # 배급사 삭제 - text() 함수 사용
        db.execute(
            text("DELETE FROM distributors WHERE id = :distributor_id"),
            {"distributor_id": distributor_id}
        )
        db.commit()
        logger.info(f"배급사 ID {distributor_id} 삭제 성공")
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except Exception as e:
        db.rollback()
        logger.error(f"배급사 {distributor_id} 삭제 중 오류 발생: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"배급사 삭제 중 오류 발생: {str(e)}"
        )
