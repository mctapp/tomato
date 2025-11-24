from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import SQLModel, Field, select, Session
from typing import Optional, List
from app.db import get_session
from datetime import datetime

router = APIRouter(prefix="/api/accessibility/meta", tags=["AccessibilityMeta"])

# 데이터 모델
class AccessibilityMetaBase(SQLModel):
    moviefile_id: int
    access_translator: Optional[str] = None
    access_superviser: Optional[str] = None
    access_narrator: Optional[str] = None
    access_director: Optional[str] = None
    access_company: Optional[str] = None
    access_created_at: Optional[str] = None  # YYMMDD 형식
    access_memo: Optional[str] = None

class AccessibilityMeta(AccessibilityMetaBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)

class AccessibilityMetaCreate(AccessibilityMetaBase):
    pass

class AccessibilityMetaRead(AccessibilityMetaBase):
    id: int

class AccessibilityMetaUpdate(SQLModel):
    access_translator: Optional[str] = None
    access_superviser: Optional[str] = None
    access_narrator: Optional[str] = None
    access_director: Optional[str] = None
    access_company: Optional[str] = None
    access_created_at: Optional[str] = None
    access_memo: Optional[str] = None

# 메타 데이터 생성
@router.post("/", response_model=AccessibilityMetaRead)
async def create_meta(
    meta: AccessibilityMetaCreate,
    session: Session = Depends(get_session)
):
    db_meta = AccessibilityMeta.from_orm(meta)
    session.add(db_meta)
    session.commit()
    session.refresh(db_meta)
    return db_meta

# 메타 데이터 전체 목록 조회
@router.get("/", response_model=List[AccessibilityMetaRead])
async def read_metas(session: Session = Depends(get_session)):
    metas = session.exec(select(AccessibilityMeta)).all()
    return metas

# 메타 데이터 단일 조회
@router.get("/{meta_id}", response_model=AccessibilityMetaRead)
async def read_meta(meta_id: int, session: Session = Depends(get_session)):
    meta = session.get(AccessibilityMeta, meta_id)
    if not meta:
        raise HTTPException(status_code=404, detail="Meta not found")
    return meta

# 메타 데이터 업데이트
@router.put("/{meta_id}", response_model=AccessibilityMetaRead)
async def update_meta(
    meta_id: int, 
    meta_update: AccessibilityMetaUpdate,
    session: Session = Depends(get_session)
):
    meta = session.get(AccessibilityMeta, meta_id)
    if not meta:
        raise HTTPException(status_code=404, detail="Meta not found")
    
    meta_data = meta_update.dict(exclude_unset=True)
    for key, value in meta_data.items():
        setattr(meta, key, value)
    
    session.add(meta)
    session.commit()
    session.refresh(meta)
    return meta

# 메타 데이터 삭제
@router.delete("/{meta_id}")
async def delete_meta(meta_id: int, session: Session = Depends(get_session)):
    meta = session.get(AccessibilityMeta, meta_id)
    if not meta:
        raise HTTPException(status_code=404, detail="Meta not found")

    session.delete(meta)
    session.commit()
    return {"ok": True}
