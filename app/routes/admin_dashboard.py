# app/routes/admin_dashboard.py
from fastapi import APIRouter, Depends, Query, Body, HTTPException
from sqlmodel import Session, select, func
from app.db import get_session
from app.models.movies import Movie
from app.models.users import User
from app.models.voice_artist import VoiceArtist, VoiceArtistSample
from app.models.user_preference import UserPreference
from app.schemas.movie import MovieSummaryResponse, MovieStats, RecentMovieResponse, VisibilityTypeCounts, PublishingStatusCounts
from app.schemas.voice_artist import VoiceArtistStats
from app.dependencies.auth import get_current_active_user
from typing import List
from datetime import datetime as dt
from pydantic import BaseModel
import traceback, logging

# 로깅 설정
logger = logging.getLogger(__name__)

# Pydantic 모델 수정
class DashboardPreferences(BaseModel):
   cardOrder: List[str]
   visibleCards: List[str]  # visibleCardIds → visibleCards
   collapsedCards: List[str]  # collapsedCardIds → collapsedCards

router = APIRouter(
   prefix="/admin/api/dashboard",
   tags=["Dashboard"]
)

@router.get("/expiring-movies", response_model=List[MovieSummaryResponse])
async def get_expiring_movies(
   limit: int = Query(5, ge=1, le=20),
   db: Session = Depends(get_session),
   current_user: User = Depends(get_current_active_user)
):
   """만료 임박한 영화 목록 조회"""
   try:
       now = dt.now()
       query = (select(Movie)
              .where(Movie.visibility_type == "period",
                     Movie.end_at > now)
              .order_by(Movie.end_at)
              .limit(limit))
       movies = db.exec(query).all()
       return movies
   except Exception as e:
       logger.error(f"만료 임박 영화 조회 오류: {str(e)}")
       raise HTTPException(status_code=500, detail=f"만료 임박 영화 조회 중 오류 발생: {str(e)}")

@router.get("/movie-stats", response_model=MovieStats)
async def get_movie_stats(
   db: Session = Depends(get_session),
   current_user: User = Depends(get_current_active_user)
):
   """영화 통계 정보 조회"""
   total_count_result = db.exec(select(func.count()).select_from(Movie)).one_or_none()
   total_count = total_count_result[0] if total_count_result and isinstance(total_count_result, tuple) else (total_count_result if total_count_result else 0)

   visibility_counts = {"always": 0, "period": 0, "hidden": 0}
   for visibility_type in ["always", "period", "hidden"]:
       count_result = db.exec(
           select(func.count())
           .select_from(Movie)
           .where(Movie.visibility_type == visibility_type)
       ).one_or_none()
       count = count_result[0] if count_result and isinstance(count_result, tuple) else (count_result if count_result else 0)
       visibility_counts[visibility_type] = count
   
   status_counts = {"draft": 0, "published": 0, "archived": 0}
   for status in ["draft", "published", "archived"]:
       count_result = db.exec(
           select(func.count())
           .select_from(Movie)
           .where(Movie.publishing_status == status)
       ).one_or_none()
       count = count_result[0] if count_result and isinstance(count_result, tuple) else (count_result if count_result else 0)
       status_counts[status] = count
   
   return {
       "total": total_count,
       "visibility_types": VisibilityTypeCounts(**visibility_counts),
       "publishing_statuses": PublishingStatusCounts(**status_counts)
   }

@router.get("/recent-movies", response_model=List[RecentMovieResponse])
async def get_recent_movies(
   limit: int = Query(3, ge=1, le=10),
   db: Session = Depends(get_session),
   current_user: User = Depends(get_current_active_user)
):
   """최근 등록된 영화 목록 조회"""
   query = (select(Movie)
           .order_by(Movie.created_at.desc())
           .limit(limit))
   movies = db.exec(query).all()
   return movies

@router.get("/voice-artist-stats")
async def get_voice_artist_stats(
   db: Session = Depends(get_session),
   current_user: User = Depends(get_current_active_user)
):
   """성우 통계 정보 조회"""
   try:
       voice_artists_count_result = db.exec(select(func.count()).select_from(VoiceArtist)).one_or_none()
       voice_artists_count = voice_artists_count_result[0] if voice_artists_count_result and isinstance(voice_artists_count_result, tuple) else (voice_artists_count_result if voice_artists_count_result else 0)
       
       samples_count_result = db.exec(select(func.count()).select_from(VoiceArtistSample)).one_or_none()
       samples_count = samples_count_result[0] if samples_count_result and isinstance(samples_count_result, tuple) else (samples_count_result if samples_count_result else 0)
       
       return {
           "totalVoiceArtists": voice_artists_count,
           "totalSamples": samples_count
       }
   except Exception as e:
       logger.error(f"성우 통계 조회 오류: {str(e)}")
       raise HTTPException(status_code=500, detail=f"성우 통계 조회 중 오류 발생: {str(e)}")

@router.get("/preferences", response_model=DashboardPreferences)
async def get_dashboard_preferences(
   db: Session = Depends(get_session),
   current_user: User = Depends(get_current_active_user)
):
   """사용자 대시보드 설정 조회"""
   statement = select(UserPreference).where(
       UserPreference.user_id == current_user.id,
       UserPreference.preference_type == "dashboard_layout"
   )
   preference_from_db = db.exec(statement).first()
   
   default_card_order = ["profile", "todos", "distributor", "voice-artist", "guideline", "asset", "storage-usage", "file-types", "recent-backups", "expiring-movies", "movie-stats", "users"]
   
   if preference_from_db and preference_from_db.preference_data:
       data = preference_from_db.preference_data.copy()
       
       # 변환 필요 없음 - 이미 올바른 키
       if "cardOrder" not in data or not data["cardOrder"]:
           data["cardOrder"] = default_card_order
       if "visibleCards" not in data:
           data["visibleCards"] = data.get("cardOrder", default_card_order).copy()
       if "collapsedCards" not in data:
           data["collapsedCards"] = []
           
       return DashboardPreferences(**data)
   else:
       return DashboardPreferences(
           cardOrder=default_card_order,
           visibleCards=default_card_order.copy(),
           collapsedCards=[]
       )

@router.put("/preferences")
async def update_dashboard_preferences(
   preferences: DashboardPreferences = Body(...),
   current_user: User = Depends(get_current_active_user),
   db: Session = Depends(get_session)
):
   """사용자 대시보드 설정 업데이트"""
   try:
       statement = select(UserPreference).where(
           UserPreference.user_id == current_user.id,
           UserPreference.preference_type == "dashboard_layout"
       )
       preference_from_db = db.exec(statement).first()
       
       data_to_save = {
           "cardOrder": preferences.cardOrder,
           "visibleCards": preferences.visibleCards,
           "collapsedCards": preferences.collapsedCards
       }
       
       if preference_from_db:
           preference_from_db.preference_data = data_to_save
           db.add(preference_from_db)
       else:
           new_preference = UserPreference(
               user_id=current_user.id,
               preference_type="dashboard_layout",
               preference_data=data_to_save
           )
           db.add(new_preference)
       
       db.commit()

       return {
           "success": True,
           "message": "설정이 저장되었습니다",
           "data": preferences
       }
   except Exception as e:
       db.rollback()
       logger.error(f"설정 저장 오류: {str(e)}")
       logger.error(traceback.format_exc())
       raise HTTPException(status_code=500, detail=f"설정 저장 중 오류가 발생했습니다: {str(e)}")
