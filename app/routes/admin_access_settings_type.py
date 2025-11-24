# app/routes/admin_access_settings_type.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app import crud, schemas
from app.api import deps

router = APIRouter(prefix="/api/access-settings/types")

@router.get("", response_model=List[schemas.AccessType])
def read_access_types(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    active_only: bool = True
):
    """접근성 타입 목록 조회"""
    if active_only:
        access_types = crud.access_type.get_active(db, skip=skip, limit=limit)
    else:
        access_types = crud.access_type.get_multi(db, skip=skip, limit=limit)
    return access_types

@router.post("", response_model=schemas.AccessType)
def create_access_type(
    *,
    db: Session = Depends(deps.get_db),
    access_type_in: schemas.AccessTypeCreate
):
    """접근성 타입 생성"""
    access_type = crud.access_type.create(db=db, obj_in=access_type_in)
    return access_type

@router.put("/{id}", response_model=schemas.AccessType)
def update_access_type(
    *,
    db: Session = Depends(deps.get_db),
    id: int,
    access_type_in: schemas.AccessTypeUpdate
):
    """접근성 타입 수정"""
    access_type = crud.access_type.get(db=db, id=id)
    if not access_type:
        raise HTTPException(status_code=404, detail="Access type not found")
    access_type = crud.access_type.update(db=db, db_obj=access_type, obj_in=access_type_in)
    return access_type

@router.delete("/{id}", response_model=schemas.AccessType)
def delete_access_type(
    *,
    db: Session = Depends(deps.get_db),
    id: int
):
    """접근성 타입 삭제 (비활성화)"""
    access_type = crud.access_type.get(db=db, id=id)
    if not access_type:
        raise HTTPException(status_code=404, detail="Access type not found")
    access_type = crud.access_type.update(db=db, db_obj=access_type, obj_in={"is_active": False})
    return access_type

