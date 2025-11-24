# app/routes/admin_voice_artists.py
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from sqlmodel import Session
from typing import List, Optional
from app import crud, schemas
from app.models.voice_artist import VoiceArtistSample  # 직접 import
from app.db import get_db
import boto3
from botocore.exceptions import ClientError
import os
import uuid
import logging

# 로거 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/admin/api/voiceartists",
    tags=["Admin - Voice Artists"]
)

# --- S3 설정 ---
S3_BUCKET = os.getenv("PUBLIC_BUCKET_NAME")
AWS_REGION = os.getenv("AWS_REGION", "ap-northeast-2")

# S3 클라이언트 생성
try:
    s3_client = boto3.client('s3', region_name=AWS_REGION)
    logger.info(f"S3 client created successfully for region {AWS_REGION}.")
except Exception as e:
    logger.error(f"Failed to create S3 client: {e}")
    s3_client = None

# --- API 엔드포인트 ---

@router.get("", response_model=schemas.PaginatedResponse[schemas.VoiceArtistSummary])
def read_voice_artists(
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1, description="페이지 번호 (1부터 시작)"),
    limit: int = Query(20, ge=1, le=100, description="페이지당 항목 수"),
    keyword: Optional[str] = Query(None, description="검색 키워드 (이름, 메모)"),
    levels: Optional[str] = Query(None, description="레벨 (콤마로 구분: 1,2,3)"),
    genders: Optional[str] = Query(None, description="성별 (콤마로 구분)"),
    orderBy: str = Query("created_at", description="정렬 기준 필드"),
    orderDesc: bool = Query(True, description="내림차순 정렬 여부")
):
    """
    성우 목록 조회 (페이지네이션 및 필터링 지원)
    """
    try:
        # 페이지네이션 계산
        skip = (page - 1) * limit
        
        # 필터 파라미터 파싱 - 수어통역사와 동일한 방식
        filters = schemas.VoiceArtistSearchFilters()
        
        if keyword:
            filters.keyword = keyword.strip()
        
        # 레벨 필터 처리
        if levels:
            try:
                if ',' in levels:
                    # 여러 값 처리
                    levels_list = []
                    for level_str in levels.split(','):
                        level_str = level_str.strip()
                        if level_str.isdigit():
                            level = int(level_str)
                            if 1 <= level <= 9:
                                levels_list.append(level)
                    filters.skill_levels = levels_list if levels_list else None
                else:
                    # 단일 값 처리
                    level_str = levels.strip()
                    if level_str.isdigit():
                        level = int(level_str)
                        if 1 <= level <= 9:
                            filters.skill_levels = [level]
            except (ValueError, AttributeError) as e:
                logger.warning(f"Invalid levels format: {levels}, error: {e}")
                filters.skill_levels = None
        
        # 성별 필터 처리
        if genders:
            try:
                if ',' in genders:
                    # 여러 값 처리
                    genders_list = []
                    valid_genders = ['male', 'female', 'other', 'prefer_not_to_say']
                    for gender in genders.split(','):
                        gender = gender.strip().lower()
                        if gender in valid_genders:
                            genders_list.append(gender)
                    filters.genders = genders_list if genders_list else None
                else:
                    # 단일 값 처리
                    gender = genders.strip().lower()
                    valid_genders = ['male', 'female', 'other', 'prefer_not_to_say']
                    if gender in valid_genders:
                        filters.genders = [gender]
            except AttributeError as e:
                logger.warning(f"Invalid genders format: {genders}, error: {e}")
                filters.genders = None
        
        logger.info(f"Processing filters: {filters}")
        
        # 데이터 조회 - 새로운 메서드 필요
        summaries, pagination_meta = crud.voice_artist.get_multi_with_pagination(
            db=db,
            skip=skip,
            limit=limit,
            filters=filters,
            order_by=orderBy,
            order_desc=orderDesc
        )
        
        return schemas.PaginatedResponse(
            data=summaries,
            pagination=pagination_meta
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error reading voice artists: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=schemas.VoiceArtist, status_code=201)
def create_voice_artist(
    *,
    db: Session = Depends(get_db),
    voice_artist_in: schemas.VoiceArtistCreate
):
    """
    성우 아티스트 생성 (기본 정보, 전문영역 포함).
    """
    try:
        voice_artist = crud.voice_artist.create_with_relations(db=db, obj_in=voice_artist_in)
        return voice_artist
    except Exception as e:
        logger.error(f"Error creating voice artist: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error while creating voice artist.")


@router.get("/{voice_artist_id}", response_model=schemas.VoiceArtist)
def read_voice_artist(
    *,
    db: Session = Depends(get_db),
    voice_artist_id: int
):
    """
    특정 성우 아티스트 상세 정보 조회 (연관 정보 포함).
    """
    voice_artist = crud.voice_artist.get(db=db, id=voice_artist_id)
    if not voice_artist:
        logger.warning(f"Voice artist with id {voice_artist_id} not found.")
        raise HTTPException(status_code=404, detail="Voice artist not found")
    return voice_artist


@router.put("/{voice_artist_id}", response_model=schemas.VoiceArtist)
def update_voice_artist(
    *,
    db: Session = Depends(get_db),
    voice_artist_id: int,
    voice_artist_in: schemas.VoiceArtistUpdate
):
    """
    성우 아티스트 정보 수정 (연관 정보 포함).
    - Request body에 포함된 필드만 업데이트.
    - 연관 정보(expertise)는 전체 교체 방식.
    """
    db_voice_artist = crud.voice_artist.get(db=db, id=voice_artist_id)
    if not db_voice_artist:
        logger.warning(f"Voice artist with id {voice_artist_id} not found for update.")
        raise HTTPException(status_code=404, detail="Voice artist not found")

    try:
        voice_artist = crud.voice_artist.update_with_relations(db=db, db_obj=db_voice_artist, obj_in=voice_artist_in)
        return voice_artist
    except Exception as e:
        logger.error(f"Error updating voice artist {voice_artist_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error while updating voice artist.")


@router.delete("/{voice_artist_id}", status_code=204)
def delete_voice_artist(
    *,
    db: Session = Depends(get_db),
    voice_artist_id: int
):
    """
    성우 아티스트 삭제.
    - 연관된 데이터(samples, expertise)도 함께 삭제되어야 함.
    """
    voice_artist = crud.voice_artist.get(db=db, id=voice_artist_id)
    if not voice_artist:
        logger.warning(f"Voice artist with id {voice_artist_id} not found for deletion.")
        raise HTTPException(status_code=404, detail="Voice artist not found")

    try:
        crud.voice_artist.remove(db=db, id=voice_artist_id)
        logger.info(f"Voice artist with id {voice_artist_id} deleted successfully.")
        return None
    except Exception as e:
        logger.error(f"Error deleting voice artist {voice_artist_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error while deleting voice artist.")


@router.post("/{voice_artist_id}/profile-image", response_model=schemas.VoiceArtistProfileImageResponse)
async def upload_profile_image(
    *,
    db: Session = Depends(get_db),
    voice_artist_id: int,
    file: UploadFile = File(...)
):
    """
    성우 아티스트 프로필 이미지 업로드 (S3).
    - 성공 시 새 이미지 URL 반환 ({ "profileImage": "url" }).
    """
    if not s3_client:
        logger.error("S3 client is not available.")
        raise HTTPException(status_code=503, detail="S3 service is unavailable.")

    db_voice_artist = crud.voice_artist.get(db=db, id=voice_artist_id)
    if not db_voice_artist:
        logger.warning(f"Voice artist with id {voice_artist_id} not found for profile image upload.")
        raise HTTPException(status_code=404, detail="Voice artist not found")

    # 파일 확장자 검증
    allowed_extensions = ['.jpg', '.jpeg', '.png', '.gif']
    file_extension = os.path.splitext(file.filename)[1].lower()
    if file_extension not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed types: {', '.join(allowed_extensions)}"
        )

    # S3 파일명 생성
    s3_file_name = f"voice-artists/{voice_artist_id}/profile-{uuid.uuid4()}{file_extension}"

    try:
        file_content = await file.read()

        # 파일 크기 제한 (5MB)
        if len(file_content) > 5 * 1024 * 1024:
            raise HTTPException(status_code=413, detail="File size exceeds the limit of 5MB.")

        s3_client.put_object(
            Bucket=S3_BUCKET,
            Key=s3_file_name,
            Body=file_content,
            ContentType=file.content_type,
            ACL='public-read',
            ServerSideEncryption='AES256'
        )
        logger.info(f"Profile image uploaded to S3: s3://{S3_BUCKET}/{s3_file_name}")

        # S3 URL 생성 - 환경 변수에서 도메인 직접 사용
        s3_url = f"https://{S3_BUCKET}.s3.{AWS_REGION}.amazonaws.com/{s3_file_name}"
        logger.info(f"Generated S3 URL: {s3_url}")

        # DB 업데이트
        updated_data = schemas.VoiceArtistUpdate(profile_image=s3_url)
        crud.voice_artist.update(db=db, db_obj=db_voice_artist, obj_in=updated_data)

        logger.info(f"Voice artist {voice_artist_id} profile image URL updated in DB: {s3_url}")

        return {"profile_image": s3_url}

    except ClientError as e:
        logger.error(f"S3 upload failed for voice artist {voice_artist_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to upload profile image.")
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error during profile image upload for voice artist {voice_artist_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="An internal error occurred.")


# --- Voice Sample Management ---

@router.post("/{voice_artist_id}/samples", response_model=schemas.VoiceArtistSampleInDB, status_code=201)
def create_voice_sample(
    *,
    db: Session = Depends(get_db),
    voice_artist_id: int,
    sample_in: schemas.VoiceArtistSampleCreate
):
    """
    성우 아티스트 음성 샘플 메타데이터 생성.
    - 실제 파일은 별도 엔드포인트로 업로드.
    """
    db_voice_artist = crud.voice_artist.get(db=db, id=voice_artist_id)
    if not db_voice_artist:
        raise HTTPException(status_code=404, detail="Voice artist not found")

    try:
        sample = crud.voice_artist.create_sample(db=db, voice_artist_id=voice_artist_id, sample_in=sample_in)
        return sample
    except Exception as e:
        logger.error(f"Error creating voice sample: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error while creating voice sample.")


@router.post("/{voice_artist_id}/samples/{sample_id}/file", response_model=schemas.VoiceArtistSampleInDB)
async def upload_sample_file(
    *,
    db: Session = Depends(get_db),
    voice_artist_id: int,
    sample_id: int,
    file: UploadFile = File(...)
):
    """
    성우 아티스트 음성 샘플 파일 업로드 (S3).
    """
    if not s3_client:
        logger.error("S3 client is not available.")
        raise HTTPException(status_code=503, detail="S3 service is unavailable.")

    db_sample = db.query(VoiceArtistSample)\
        .filter(VoiceArtistSample.id == sample_id)\
        .filter(VoiceArtistSample.voice_artist_id == voice_artist_id)\
        .first()
    
    if not db_sample:
        raise HTTPException(status_code=404, detail="Voice sample not found")

    # 파일 확장자 검증 (오디오 파일)
    allowed_extensions = ['.mp3', '.wav', '.m4a', '.aac', '.ogg', '.flac']
    file_extension = os.path.splitext(file.filename)[1].lower()
    if file_extension not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed types: {', '.join(allowed_extensions)}"
        )

    # S3 파일명 생성
    s3_file_name = f"voice-artists/{voice_artist_id}/samples/{sample_id}-{uuid.uuid4()}{file_extension}"

    try:
        file_content = await file.read()
        logger.info(f"Uploading sample file: {file.filename}, size: {len(file_content)} bytes, content_type: {file.content_type}")

        # 파일 크기 제한 (10MB)
        if len(file_content) > 10 * 1024 * 1024:
            raise HTTPException(status_code=413, detail="File size exceeds the limit of 10MB.")

        # S3 업로드
        logger.info(f"Attempting to upload to S3 bucket: {S3_BUCKET}, key: {s3_file_name}")
        s3_client.put_object(
            Bucket=S3_BUCKET,
            Key=s3_file_name,
            Body=file_content,
            ContentType=file.content_type or 'audio/mpeg',
            ACL='public-read',
            ServerSideEncryption='AES256'
        )
        logger.info(f"Sample file uploaded to S3: s3://{S3_BUCKET}/{s3_file_name}")

        # S3 URL 생성
        s3_url = f"https://{S3_BUCKET}.s3.{AWS_REGION}.amazonaws.com/{s3_file_name}"
        logger.info(f"Generated S3 URL: {s3_url}")

        # DB 업데이트
        updated_sample = crud.voice_artist.update_sample_file(db=db, sample_id=sample_id, file_path=s3_url)
        
        logger.info(f"Voice sample {sample_id} file URL updated in DB.")

        return updated_sample

    except ClientError as e:
        logger.error(f"S3 upload failed for voice sample {sample_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to upload sample file.")
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error during sample file upload for voice sample {sample_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="An internal error occurred.")


@router.delete("/{voice_artist_id}/samples/{sample_id}", status_code=204)
def delete_voice_sample(
    *,
    db: Session = Depends(get_db),
    voice_artist_id: int,
    sample_id: int
):
    """
    성우 아티스트 음성 샘플 삭제.
    """
    db_sample = db.query(VoiceArtistSample)\
        .filter(VoiceArtistSample.id == sample_id)\
        .filter(VoiceArtistSample.voice_artist_id == voice_artist_id)\
        .first()
    
    if not db_sample:
        raise HTTPException(status_code=404, detail="Voice sample not found")

    try:
        crud.voice_artist.delete_sample(db=db, sample_id=sample_id)
        logger.info(f"Voice sample {sample_id} deleted successfully.")
        return None
    except Exception as e:
        logger.error(f"Error deleting voice sample {sample_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error while deleting voice sample.")

@router.get("/{voice_artist_id}/access-assets", response_model=List[schemas.AccessAssetWithMovie])
def get_voice_artist_access_assets(
    *,
    db: Session = Depends(get_db),
    voice_artist_id: int
):
    """
    성우가 참여한 접근성 미디어 자산 목록 조회
    """
    voice_artist = crud.voice_artist.get(db=db, id=voice_artist_id)
    if not voice_artist:
        raise HTTPException(status_code=404, detail="Voice artist not found")
    
    try:
        # AccessAssetCredit 모델과 조인하여 성우가 참여한 자산 조회
        from app.models.access_asset_credit import AccessAssetCredit
        from app.models.access_asset import AccessAsset
        from app.models.movies import Movie  # movie가 아닌 movies로 수정
        from sqlalchemy.orm import joinedload
        
        access_assets = db.query(AccessAsset)\
            .join(AccessAssetCredit, AccessAsset.id == AccessAssetCredit.access_asset_id)\
            .join(Movie, AccessAsset.movie_id == Movie.id)\
            .filter(AccessAssetCredit.voice_artist_id == voice_artist_id)\
            .options(
                joinedload(AccessAsset.movie),
                joinedload(AccessAsset.credits)
            )\
            .order_by(AccessAsset.created_at.desc())\
            .all()
        
        # 응답 데이터 구성
        result = []
        for asset in access_assets:
            # 해당 성우의 크레디트 정보만 필터링
            voice_artist_credit = next(
                (credit for credit in asset.credits if credit.voice_artist_id == voice_artist_id),
                None
            )
            
            result.append({
                "id": asset.id,
                "name": asset.name,
                "mediaType": asset.media_type,
                "language": asset.language,
                "assetType": asset.asset_type,
                "productionYear": asset.production_year,
                "productionStatus": asset.production_status,
                "publishingStatus": asset.publishing_status,
                "createdAt": asset.created_at,
                "movie": {
                    "id": asset.movie.id,
                    "title": asset.movie.title,
                    "director": asset.movie.director,
                    "releaseDate": asset.movie.release_date
                } if asset.movie else None,
                "credit": {
                    "role": voice_artist_credit.role,
                    "isPrimary": voice_artist_credit.is_primary,
                    "sequenceNumber": voice_artist_credit.sequence_number,
                    "memo": voice_artist_credit.memo
                } if voice_artist_credit else None
            })
        
        return result
        
    except Exception as e:
        logger.error(f"Error getting access assets for voice artist {voice_artist_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")
