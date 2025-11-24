# app/routes/admin_image_renditions.py
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List

from app.db import get_db
from app.models.image_renditions import ImageRendition

router = APIRouter(
    prefix="/admin/image-renditions", 
    tags=["ImageRenditions"]
)

@router.get("/", response_model=List[ImageRendition])
def list_renditions(
    db: Session = Depends(get_db)
):
    """이미지 렌디션 목록 조회"""
    renditions = db.exec(select(ImageRendition)).all()
    return renditions

@router.post("/", response_model=ImageRendition, status_code=201)
def create_rendition(
    rendition: ImageRendition,
    db: Session = Depends(get_db)
):
    """이미지 렌디션 생성"""
    db.add(rendition)
    db.commit()
    db.refresh(rendition)
    return rendition

@router.get("/{rendition_id}", response_model=ImageRendition)
def get_rendition(
    rendition_id: int,
    db: Session = Depends(get_db)
):
    """이미지 렌디션 상세 조회"""
    rendition = db.get(ImageRendition, rendition_id)
    if not rendition:
        raise HTTPException(status_code=404, detail="Rendition not found")
    return rendition

@router.put("/{rendition_id}", response_model=ImageRendition)
def update_rendition(
    rendition_id: int,
    updated: ImageRendition,
    db: Session = Depends(get_db)
):
    """이미지 렌디션 수정"""
    rendition = db.get(ImageRendition, rendition_id)
    if not rendition:
        raise HTTPException(status_code=404, detail="Rendition not found")
    
    for key, value in updated.dict(exclude_unset=True).items():
        setattr(rendition, key, value)
    
    db.add(rendition)
    db.commit()
    db.refresh(rendition)
    return rendition

@router.delete("/{rendition_id}", status_code=204)
def delete_rendition(
    rendition_id: int,
    db: Session = Depends(get_db)
):
    """이미지 렌디션 삭제"""
    rendition = db.get(ImageRendition, rendition_id)
    if not rendition:
        raise HTTPException(status_code=404, detail="Rendition not found")
    
    db.delete(rendition)
    db.commit()
    return None
