from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import List
from app.db import get_db
from app.models.image_rendition import ImageRendition
from app.schemas.image_rendition import ImageRenditionResponse, ImageRenditionUpdate

router = APIRouter(prefix="/admin/image-renditions", tags=["ImageRenditions"])


@router.get("/", response_model=List[ImageRenditionResponse])
def list_renditions(db: Session = Depends(get_db)):
    return db.query(ImageRendition).all()


@router.get("/{rendition_id}", response_model=ImageRenditionResponse)
def get_rendition(rendition_id: int, db: Session = Depends(get_db)):
    rendition = db.query(ImageRendition).filter(ImageRendition.id == rendition_id).first()
    if not rendition:
        raise HTTPException(status_code=404, detail="렌디션을 찾을 수 없습니다")
    return rendition


@router.patch("/{rendition_id}", response_model=ImageRenditionResponse)
def update_rendition(rendition_id: int, update_data: ImageRenditionUpdate, db: Session = Depends(get_db)):
    rendition = db.query(ImageRendition).filter(ImageRendition.id == rendition_id).first()
    if not rendition:
        raise HTTPException(status_code=404, detail="렌디션을 찾을 수 없습니다")

    for key, value in update_data.dict(exclude_unset=True).items():
        setattr(rendition, key, value)

    db.commit()
    db.refresh(rendition)
    return rendition
