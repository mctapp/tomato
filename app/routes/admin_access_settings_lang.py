# app/routes/admin_access_settings_lang.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app import crud, schemas
from app.api import deps

router = APIRouter(prefix="/api/access-settings/langs")

@router.get("", response_model=List[schemas.AccessLang])
def read_access_langs(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    active_only: bool = True
):
    """지원 언어 목록 조회"""
    if active_only:
        access_langs = crud.access_lang.get_active(db, skip=skip, limit=limit)
    else:
        access_langs = crud.access_lang.get_multi(db, skip=skip, limit=limit)
    return access_langs

@router.post("", response_model=schemas.AccessLang)
def create_access_lang(
    *,
    db: Session = Depends(deps.get_db),
    access_lang_in: schemas.AccessLangCreate
):
    """지원 언어 생성"""
    access_lang = crud.access_lang.create(db=db, obj_in=access_lang_in)
    return access_lang

@router.put("/{id}", response_model=schemas.AccessLang)
def update_access_lang(
    *,
    db: Session = Depends(deps.get_db),
    id: int,
    access_lang_in: schemas.AccessLangUpdate
):
    """지원 언어 수정"""
    access_lang = crud.access_lang.get(db=db, id=id)
    if not access_lang:
        raise HTTPException(status_code=404, detail="Access language not found")
    access_lang = crud.access_lang.update(db=db, db_obj=access_lang, obj_in=access_lang_in)
    return access_lang

@router.delete("/{id}", response_model=schemas.AccessLang)
def delete_access_lang(
    *,
    db: Session = Depends(deps.get_db),
    id: int
):
    """지원 언어 삭제 (비활성화)"""
    access_lang = crud.access_lang.get(db=db, id=id)
    if not access_lang:
        raise HTTPException(status_code=404, detail="Access language not found")
    access_lang = crud.access_lang.update(db=db, db_obj=access_lang, obj_in={"is_active": False})
    return access_lang

@router.put("/{id}/set-default", response_model=schemas.AccessLang)
def set_default_lang(
    *,
    db: Session = Depends(deps.get_db),
    id: int
):
    """기본 언어 설정"""
    # 먼저 모든 언어의 is_default를 False로 설정
    crud.access_lang.unset_all_defaults(db)
    
    # 선택된 언어의 is_default를 True로 설정
    access_lang = crud.access_lang.get(db=db, id=id)
    if not access_lang:
        raise HTTPException(status_code=404, detail="Access language not found")
    access_lang = crud.access_lang.update(db=db, db_obj=access_lang, obj_in={"is_default": True})
    return access_lang

