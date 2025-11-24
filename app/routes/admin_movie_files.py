# app/routes/admin_movie_files.py
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List

from app.db import get_db
from app.models.movie_files import MovieFile

router = APIRouter(
    prefix="/admin/movie-files",
    tags=["MovieFiles"]
)

@router.get("/", response_model=List[MovieFile])
def list_files(
    db: Session = Depends(get_db)
):
    """영화 파일 목록 조회"""
    files = db.exec(select(MovieFile)).all()
    return files

@router.post("/", response_model=MovieFile, status_code=201)
def create_file(
    file: MovieFile,
    db: Session = Depends(get_db)
):
    """영화 파일 생성"""
    db.add(file)
    db.commit()
    db.refresh(file)
    return file

@router.get("/{file_id}", response_model=MovieFile)
def get_file(
    file_id: int,
    db: Session = Depends(get_db)
):
    """영화 파일 상세 조회"""
    file = db.get(MovieFile, file_id)
    if not file:
        raise HTTPException(status_code=404, detail="File not found")
    return file

@router.put("/{file_id}", response_model=MovieFile)
def update_file(
    file_id: int,
    updated: MovieFile,
    db: Session = Depends(get_db)
):
    """영화 파일 수정"""
    file = db.get(MovieFile, file_id)
    if not file:
        raise HTTPException(status_code=404, detail="File not found")
    
    for key, value in updated.dict(exclude_unset=True).items():
        setattr(file, key, value)
    
    db.add(file)
    db.commit()
    db.refresh(file)
    return file

@router.delete("/{file_id}", status_code=204)
def delete_file(
    file_id: int,
    db: Session = Depends(get_db)
):
    """영화 파일 삭제"""
    file = db.get(MovieFile, file_id)
    if not file:
        raise HTTPException(status_code=404, detail="File not found")
    
    db.delete(file)
    db.commit()
    return None
