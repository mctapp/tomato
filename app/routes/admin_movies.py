# app/routes/admin_movies.py
from fastapi import APIRouter, Depends, HTTPException, Query, Path, Body
from sqlmodel import Session, select, delete
from app.db import get_session
from app.models.movies import Movie
from app.models.file_assets import FileAsset
from app.schemas.movie import MovieDetailResponse, MovieResponse, MovieCreate, MovieUpdate
from typing import List, Optional
from datetime import datetime

router = APIRouter(
    prefix="/admin/api/movies",
    tags=["Movies"]
)

@router.get("", response_model=List[MovieResponse])
async def get_movies(
    title: Optional[str] = Query(None, description="영화 제목으로 필터링"),
    distributor_id: Optional[int] = Query(None, description="배급사 ID로 필터링"),
    is_public: Optional[bool] = Query(None, description="공개 여부로 필터링"),
    publishing_status: Optional[str] = Query(None, description="게시 상태로 필터링"),
    film_genre: Optional[str] = Query(None, description="장르로 필터링"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    db: Session = Depends(get_session)
):
    """영화 목록 조회"""
    query = select(Movie)
    
    # 필터 적용
    if title:
        query = query.where(Movie.title.contains(title))
    if distributor_id:
        query = query.where(Movie.distributor_id == distributor_id)
    if is_public is not None:
        query = query.where(Movie.is_public == is_public)
    if publishing_status:
        query = query.where(Movie.publishing_status == publishing_status)
    if film_genre:
        query = query.where(Movie.film_genre == film_genre)
    
    # 정렬 및 페이지네이션
    query = query.order_by(Movie.created_at.desc())
    query = query.offset(skip).limit(limit)
    
    results = db.exec(query).all()
    return results

@router.get("/by-distributor/{distributor_id}", response_model=List[MovieResponse])
async def get_movies_by_distributor(
    distributor_id: int = Path(..., description="배급사 ID"),
    db: Session = Depends(get_session)
):
    """배급사별 영화 목록 조회"""
    query = select(Movie).where(Movie.distributor_id == distributor_id)
    query = query.order_by(Movie.created_at.desc())
    results = db.exec(query).all()
    return results

@router.get("/{movie_id}", response_model=MovieDetailResponse)
async def get_movie(
    movie_id: int = Path(...), 
    db: Session = Depends(get_session)
):
    """영화 상세 정보 조회"""
    # 영화 정보 조회
    movie = db.get(Movie, movie_id)
    if not movie:
        raise HTTPException(status_code=404, detail="Movie not found")
    
    # 관련 파일 에셋 조회
    files_query = select(FileAsset).where(
        FileAsset.entity_type == "movie",
        FileAsset.entity_id == movie_id,
        FileAsset.status == "active"
    )
    files = db.exec(files_query).all()
    
    # 포스터 파일과 시그니처 파일 찾기
    poster_file = next((f for f in files if f.usage_type == "poster"), None)
    signature_file = next((f for f in files if f.usage_type == "signature"), None)
    
    # 응답 생성
    response_data = MovieDetailResponse.model_validate(movie)
    
    # 파일 정보 설정
    if poster_file:
        response_data.poster_file = poster_file
    
    if signature_file:
        response_data.signature_file = signature_file
    
    return response_data

@router.post("", response_model=MovieResponse, status_code=201)
async def create_movie(
    movie_data: MovieCreate = Body(...),
    db: Session = Depends(get_session)
):
    """새 영화 생성"""
    try:
        movie = Movie(**movie_data.model_dump(exclude_unset=True))
        db.add(movie)
        db.commit()
        db.refresh(movie)
        return movie
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"영화 생성 중 오류 발생: {str(e)}")

@router.put("/{movie_id}", response_model=MovieResponse)
async def update_movie(
    movie_id: int = Path(...),
    movie_data: MovieUpdate = Body(...),
    db: Session = Depends(get_session)
):
    """영화 정보 수정"""
    movie = db.get(Movie, movie_id)
    if not movie:
        raise HTTPException(status_code=404, detail="Movie not found")
    
    try:
        update_data = movie_data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(movie, key, value)
        
        # 레거시 필드 업데이트 (호환성 유지)
        if 'posterFileId' in update_data:
            movie.poster_file_id = update_data['posterFileId']
        
        movie.updated_at = datetime.now()
        db.add(movie)
        db.commit()
        db.refresh(movie)
        return movie
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"영화 수정 중 오류 발생: {str(e)}")

@router.delete("/{movie_id}")
async def delete_movie(
    movie_id: int = Path(...),
    db: Session = Depends(get_session)
):
    """영화 삭제"""
    movie = db.get(Movie, movie_id)
    if not movie:
        raise HTTPException(status_code=404, detail="Movie not found")
    
    try:
        # 영화와 연결된 파일 에셋 조회
        file_assets_query = select(FileAsset).where(
            FileAsset.entity_type == "movie",
            FileAsset.entity_id == movie_id
        )
        file_assets = db.exec(file_assets_query).all()
        
        # 파일 에셋 상태 변경 또는 삭제
        for file_asset in file_assets:
            file_asset.status = "deleted"
            db.add(file_asset)
        
        # 영화 삭제
        db.delete(movie)
        db.commit()
        
        return {"detail": "Movie deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500, 
            detail=f"Internal server error during movie deletion: {str(e)}"
        )
