# app/routes/admin_scriptwriters.py
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from sqlmodel import Session
from typing import List, Optional
from app.db import get_db
from app.crud.crud_scriptwriter import scriptwriter
from app.schemas import scriptwriter as schemas
import boto3
from botocore.exceptions import ClientError
import os
import uuid
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/admin/api/scriptwriters",
    tags=["Admin - Scriptwriters"]
)

# S3 설정
S3_BUCKET = os.getenv("PUBLIC_BUCKET_NAME")
S3_PRIVATE_BUCKET = os.getenv("PRIVATE_BUCKET_NAME")
AWS_REGION = os.getenv("AWS_REGION", "ap-northeast-2")

try:
    s3_client = boto3.client('s3', region_name=AWS_REGION)
    logger.info(f"S3 client created successfully for region {AWS_REGION}.")
except Exception as e:
    logger.error(f"Failed to create S3 client: {e}")
    s3_client = None

@router.get("", response_model=schemas.PaginatedResponse[schemas.ScriptwriterSummary])
def read_scriptwriters(
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1, description="페이지 번호 (1부터 시작)"),
    limit: int = Query(20, ge=1, le=100, description="페이지당 항목 수"),
    keyword: Optional[str] = Query(None, description="검색 키워드 (이름, 메모)"),
    skillLevels: Optional[str] = Query(None, description="스킬 레벨 (콤마로 구분: 1,2,3)"),
    languages: Optional[str] = Query(None, description="사용언어 (콤마로 구분: ko,en,zh)"),
    specialties: Optional[str] = Query(None, description="해설분야 (콤마로 구분: AD,CC)"),
    locations: Optional[str] = Query(None, description="지역 (콤마로 구분)"),
    genders: Optional[str] = Query(None, description="성별 (콤마로 구분)"),
    orderBy: str = Query("created_at", description="정렬 기준 필드"),
    orderDesc: bool = Query(True, description="내림차순 정렬 여부")
):
    """해설작가 목록 조회 (페이지네이션 및 필터링 지원)"""
    try:
        # 페이지네이션 계산
        skip = (page - 1) * limit
        
        # 필터 파라미터 파싱
        filters = schemas.ScriptwriterSearchFilters()
        
        if keyword:
            filters.keyword = keyword.strip()
        
        # 스킬 레벨 필터
        if skillLevels:
            try:
                if ',' in skillLevels:
                    skill_levels_list = []
                    for level_str in skillLevels.split(','):
                        level_str = level_str.strip()
                        if level_str.isdigit():
                            level = int(level_str)
                            if 1 <= level <= 9:
                                skill_levels_list.append(level)
                    filters.skill_levels = skill_levels_list if skill_levels_list else None
                else:
                    level_str = skillLevels.strip()
                    if level_str.isdigit():
                        level = int(level_str)
                        if 1 <= level <= 9:
                            filters.skill_levels = [level]
            except (ValueError, AttributeError) as e:
                logger.warning(f"Invalid skill levels format: {skillLevels}, error: {e}")
                filters.skill_levels = None
        
        # 사용언어 필터
        if languages:
            try:
                if ',' in languages:
                    languages_list = []
                    valid_codes = ['ko', 'en', 'zh', 'ja', 'vi', 'tl', 'ne', 'id', 'km', 'my', 'si']
                    for code in languages.split(','):
                        code = code.strip().lower()
                        if code in valid_codes:
                            languages_list.append(code)
                    filters.languages = languages_list if languages_list else None
                else:
                    code = languages.strip().lower()
                    valid_codes = ['ko', 'en', 'zh', 'ja', 'vi', 'tl', 'ne', 'id', 'km', 'my', 'si']
                    if code in valid_codes:
                        filters.languages = [code]
            except AttributeError as e:
                logger.warning(f"Invalid languages format: {languages}, error: {e}")
                filters.languages = None
        
        # 해설분야 필터
        if specialties:
            try:
                if ',' in specialties:
                    specialties_list = []
                    valid_types = ['AD', 'CC']
                    for specialty in specialties.split(','):
                        specialty = specialty.strip().upper()
                        if specialty in valid_types:
                            specialties_list.append(specialty)
                    filters.specialties = specialties_list if specialties_list else None
                else:
                    specialty = specialties.strip().upper()
                    valid_types = ['AD', 'CC']
                    if specialty in valid_types:
                        filters.specialties = [specialty]
            except AttributeError as e:
                logger.warning(f"Invalid specialties format: {specialties}, error: {e}")
                filters.specialties = None
        
        # 성별 필터
        if genders:
            try:
                if ',' in genders:
                    genders_list = []
                    valid_genders = ['male', 'female', 'other', 'prefer_not_to_say']
                    for gender in genders.split(','):
                        gender = gender.strip().lower()
                        if gender in valid_genders:
                            genders_list.append(gender)
                    filters.genders = genders_list if genders_list else None
                else:
                    gender = genders.strip().lower()
                    valid_genders = ['male', 'female', 'other', 'prefer_not_to_say']
                    if gender in valid_genders:
                        filters.genders = [gender]
            except AttributeError as e:
                logger.warning(f"Invalid genders format: {genders}, error: {e}")
                filters.genders = None
        
        logger.info(f"Processing filters: {filters}")
        
        # 데이터 조회
        summaries, pagination_meta = scriptwriter.get_multi_with_pagination(
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
        logger.error(f"Error reading scriptwriters: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/search", response_model=schemas.PaginatedResponse[schemas.ScriptwriterSummary])
def search_scriptwriters(
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    keyword: Optional[str] = Query(None, description="검색 키워드"),
    skillLevels: Optional[str] = Query(None, description="스킬 레벨 필터"),
    languages: Optional[str] = Query(None, description="사용언어 필터"),
    specialties: Optional[str] = Query(None, description="해설분야 필터"),
    locations: Optional[str] = Query(None, description="지역 필터")
):
    """고급 검색 기능"""
    try:
        skip = (page - 1) * limit
        
        # 필터 객체 생성
        filters = schemas.ScriptwriterSearchFilters()
        
        if keyword:
            filters.keyword = keyword.strip()
        
        if skillLevels:
            try:
                skill_levels_list = []
                for level_str in skillLevels.split(','):
                    level_str = level_str.strip()
                    if level_str and level_str.isdigit():
                        level = int(level_str)
                        if 1 <= level <= 9:
                            skill_levels_list.append(level)
                filters.skill_levels = skill_levels_list if skill_levels_list else None
            except (ValueError, AttributeError):
                filters.skill_levels = None
        
        if languages:
            try:
                languages_list = []
                valid_codes = ['ko', 'en', 'zh', 'ja', 'vi', 'tl', 'ne', 'id', 'km', 'my', 'si']
                for code in languages.split(','):
                    code = code.strip().lower()
                    if code in valid_codes:
                        languages_list.append(code)
                filters.languages = languages_list if languages_list else None
            except AttributeError:
                filters.languages = None
        
        if specialties:
            try:
                specialties_list = []
                valid_types = ['AD', 'CC']
                for specialty in specialties.split(','):
                    specialty = specialty.strip().upper()
                    if specialty in valid_types:
                        specialties_list.append(specialty)
                filters.specialties = specialties_list if specialties_list else None
            except AttributeError:
                filters.specialties = None
        
        if locations:
            try:
                filters.locations = [x.strip() for x in locations.split(',') if x.strip()]
            except AttributeError:
                filters.locations = None
        
        summaries, pagination_meta = scriptwriter.search_optimized(
            db=db,
            filters=filters,
            skip=skip,
            limit=limit
        )
        
        return schemas.PaginatedResponse(
            data=summaries,
            pagination=pagination_meta
        )
        
    except Exception as e:
        logger.error(f"Error searching scriptwriters: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Search error occurred.")

@router.get("/stats", response_model=dict)
def get_scriptwriter_stats(db: Session = Depends(get_db)):
    """해설작가 통계 정보"""
    try:
        stats = scriptwriter.get_stats(db)
        return stats
    except Exception as e:
        logger.error(f"Error getting stats: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error retrieving statistics.")

@router.post("", response_model=schemas.Scriptwriter, status_code=201)
def create_scriptwriter(
    *,
    db: Session = Depends(get_db),
    scriptwriter_in: schemas.ScriptwriterCreate
):
    """해설작가 생성"""
    try:
        scriptwriter_obj = scriptwriter.create_with_relations(db=db, obj_in=scriptwriter_in)
        logger.info(f"Scriptwriter created with ID: {scriptwriter_obj.id}")
        return scriptwriter_obj
    except Exception as e:
        logger.error(f"Error creating scriptwriter: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error while creating scriptwriter.")

@router.get("/{scriptwriter_id}", response_model=schemas.Scriptwriter)
def read_scriptwriter(
    *,
    db: Session = Depends(get_db),
    scriptwriter_id: int
):
    """특정 해설작가 상세 정보 조회"""
    scriptwriter_obj = scriptwriter.get_with_relations(db=db, id=scriptwriter_id)
    if not scriptwriter_obj:
        logger.warning(f"Scriptwriter with id {scriptwriter_id} not found.")
        raise HTTPException(status_code=404, detail="Scriptwriter not found")
    return scriptwriter_obj

@router.put("/{scriptwriter_id}", response_model=schemas.Scriptwriter)
def update_scriptwriter(
    *,
    db: Session = Depends(get_db),
    scriptwriter_id: int,
    scriptwriter_in: schemas.ScriptwriterUpdate
):
    """해설작가 정보 수정"""
    db_scriptwriter = scriptwriter.get(db=db, id=scriptwriter_id)
    if not db_scriptwriter:
        logger.warning(f"Scriptwriter with id {scriptwriter_id} not found for update.")
        raise HTTPException(status_code=404, detail="Scriptwriter not found")

    try:
        scriptwriter_obj = scriptwriter.update_with_relations(db=db, db_obj=db_scriptwriter, obj_in=scriptwriter_in)
        logger.info(f"Scriptwriter {scriptwriter_id} updated successfully.")
        return scriptwriter_obj
    except Exception as e:
        logger.error(f"Error updating scriptwriter {scriptwriter_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error while updating scriptwriter.")

@router.delete("/{scriptwriter_id}", status_code=204)
def delete_scriptwriter(
    *,
    db: Session = Depends(get_db),
    scriptwriter_id: int
):
    """해설작가 삭제"""
    scriptwriter_obj = scriptwriter.get(db=db, id=scriptwriter_id)
    if not scriptwriter_obj:
        logger.warning(f"Scriptwriter with id {scriptwriter_id} not found for deletion.")
        raise HTTPException(status_code=404, detail="Scriptwriter not found")

    try:
        scriptwriter.remove(db=db, id=scriptwriter_id)
        logger.info(f"Scriptwriter with id {scriptwriter_id} deleted successfully.")
        return None
    except Exception as e:
        logger.error(f"Error deleting scriptwriter {scriptwriter_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error while deleting scriptwriter.")

@router.post("/{scriptwriter_id}/profile-image", response_model=schemas.ProfileImageResponse)
async def upload_profile_image(
    *,
    db: Session = Depends(get_db),
    scriptwriter_id: int,
    file: UploadFile = File(...)
):
    """해설작가 프로필 이미지 업로드"""
    if not s3_client:
        logger.error("S3 client is not available.")
        raise HTTPException(status_code=503, detail="S3 service is unavailable.")

    db_scriptwriter = scriptwriter.get(db=db, id=scriptwriter_id)
    if not db_scriptwriter:
        logger.warning(f"Scriptwriter with id {scriptwriter_id} not found for profile image upload.")
        raise HTTPException(status_code=404, detail="Scriptwriter not found")

    # 파일 확장자 및 크기 제한
    allowed_extensions = ['.jpg', '.jpeg', '.png', '.gif']
    file_extension = os.path.splitext(file.filename)[1].lower()
    if file_extension not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed types: {', '.join(allowed_extensions)}"
        )

    # S3 파일명 생성
    s3_file_name = f"scriptwriters/{scriptwriter_id}/profile-{uuid.uuid4()}{file_extension}"

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
            ACL='public-read'
        )
        logger.info(f"Profile image uploaded to S3: s3://{S3_BUCKET}/{s3_file_name}")

        # S3 URL 생성
        s3_url = f"https://{S3_BUCKET}.s3.{AWS_REGION}.amazonaws.com/{s3_file_name}"

        # DB 업데이트
        updated_data = schemas.ScriptwriterUpdate(profile_image=s3_url)
        scriptwriter.update(db=db, db_obj=db_scriptwriter, obj_in=updated_data)

        logger.info(f"Scriptwriter {scriptwriter_id} profile image URL updated in DB.")

        return {"profile_image": s3_url}

    except ClientError as e:
        logger.error(f"S3 upload failed for scriptwriter {scriptwriter_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to upload profile image.")
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error during profile image upload for scriptwriter {scriptwriter_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="An internal error occurred.")

# 크레딧(작업이력) 관련 엔드포인트
@router.get("/{scriptwriter_id}/credits", response_model=schemas.ScriptwriterCreditsResponse)
def get_scriptwriter_credits(
    *,
    db: Session = Depends(get_db),
    scriptwriter_id: int,
    page: int = Query(1, ge=1, description="페이지 번호"),
    limit: int = Query(20, ge=1, le=100, description="페이지당 항목 수"),
    accessType: Optional[str] = Query(None, description="접근성 미디어 타입 필터 (AD, CC)")
):
    """해설작가의 작업 이력(크레딧) 조회"""
    scriptwriter_obj = scriptwriter.get(db=db, id=scriptwriter_id)
    if not scriptwriter_obj:
        raise HTTPException(status_code=404, detail="Scriptwriter not found")
    
    try:
        skip = (page - 1) * limit
        
        # 접근성 미디어 타입 필터 파싱
        access_types = None
        if accessType:
            valid_types = ['AD', 'CC']
            if ',' in accessType:
                access_types = [t.strip().upper() for t in accessType.split(',') if t.strip().upper() in valid_types]
            else:
                access_type_upper = accessType.strip().upper()
                if access_type_upper in valid_types:
                    access_types = [access_type_upper]
        
        # 크레딧 조회
        credits, total_count = scriptwriter.get_credits(
            db=db,
            scriptwriter_id=scriptwriter_id,
            skip=skip,
            limit=limit,
            access_types=access_types
        )
        
        # 페이지네이션 메타데이터
        total_pages = (total_count + limit - 1) // limit
        
        return schemas.ScriptwriterCreditsResponse(
            data=credits,
            pagination=schemas.PaginationMeta(
                page=page,
                limit=limit,
                total=total_count,
                total_pages=total_pages,
                has_next=page < total_pages,
                has_prev=page > 1
            )
        )
        
    except Exception as e:
        logger.error(f"Error getting credits for scriptwriter {scriptwriter_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error while fetching credits.")

# 작업로그 관련 엔드포인트
@router.post("/{scriptwriter_id}/work-logs", response_model=schemas.ScriptwriterWorkLogInDB, status_code=201)
def create_scriptwriter_work_log(
    *,
    db: Session = Depends(get_db),
    scriptwriter_id: int,
    work_log_in: schemas.ScriptwriterWorkLogCreate
):
    """해설작가 작업로그 생성"""
    scriptwriter_obj = scriptwriter.get(db=db, id=scriptwriter_id)
    if not scriptwriter_obj:
        raise HTTPException(status_code=404, detail="Scriptwriter not found")
    
    try:
        work_log = scriptwriter.create_work_log(db=db, scriptwriter_id=scriptwriter_id, obj_in=work_log_in)
        logger.info(f"Work log created for scriptwriter {scriptwriter_id}: {work_log.id}")
        return work_log
    except Exception as e:
        logger.error(f"Error creating work log for scriptwriter {scriptwriter_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error while creating work log.")

@router.delete("/{scriptwriter_id}/work-logs/{work_log_id}", status_code=204)
def delete_scriptwriter_work_log(
    *,
    db: Session = Depends(get_db),
    scriptwriter_id: int,
    work_log_id: int
):
    """해설작가 작업로그 삭제"""
    success = scriptwriter.remove_work_log(db=db, scriptwriter_id=scriptwriter_id, work_log_id=work_log_id)
    if not success:
        raise HTTPException(status_code=404, detail="Work log not found")
    
    logger.info(f"Work log {work_log_id} deleted for scriptwriter {scriptwriter_id}")
    return None

# 대표해설 관련 엔드포인트
@router.post("/{scriptwriter_id}/samples", response_model=schemas.ScriptwriterSampleInDB, status_code=201)
def create_scriptwriter_sample(
    *,
    db: Session = Depends(get_db),
    scriptwriter_id: int,
    sample_in: schemas.ScriptwriterSampleCreate
):
    """해설작가 대표해설 생성"""
    scriptwriter_obj = scriptwriter.get(db=db, id=scriptwriter_id)
    if not scriptwriter_obj:
        raise HTTPException(status_code=404, detail="Scriptwriter not found")
    
    try:
        sample = scriptwriter.create_sample(db=db, scriptwriter_id=scriptwriter_id, obj_in=sample_in)
        logger.info(f"Sample created for scriptwriter {scriptwriter_id}: {sample.id}")
        return sample
    except Exception as e:
        logger.error(f"Error creating sample for scriptwriter {scriptwriter_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error while creating sample.")

@router.post("/{scriptwriter_id}/samples/{sample_id}/poster-image", response_model=schemas.PosterImageResponse)
async def upload_sample_poster_image(
    *,
    db: Session = Depends(get_db),
    scriptwriter_id: int,
    sample_id: int,
    file: UploadFile = File(...)
):
    """해설작가 대표해설 포스터 이미지 업로드 (S3 public)"""
    if not s3_client:
        raise HTTPException(status_code=503, detail="S3 service is unavailable.")
    
    sample = scriptwriter.get_sample(db=db, scriptwriter_id=scriptwriter_id, sample_id=sample_id)
    if not sample:
        raise HTTPException(status_code=404, detail="Sample not found")
    
    # 이미지 파일 검증
    allowed_extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
    file_extension = os.path.splitext(file.filename)[1].lower()
    if file_extension not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed types: {', '.join(allowed_extensions)}"
        )
    
    try:
        file_content = await file.read()
        
        # 파일 크기 제한 (10MB)
        if len(file_content) > 10 * 1024 * 1024:
            raise HTTPException(
                status_code=413, 
                detail="File size exceeds the limit of 10MB."
            )
        
        # S3 파일명 생성 (public)
        s3_file_name = f"scriptwriters/{scriptwriter_id}/samples/poster-{sample_id}-{uuid.uuid4()}{file_extension}"
        
        s3_client.put_object(
            Bucket=S3_BUCKET,
            Key=s3_file_name,
            Body=file_content,
            ContentType=file.content_type,
            ACL='public-read'
        )
        
        # S3 URL 생성
        s3_url = f"https://{S3_BUCKET}.s3.{AWS_REGION}.amazonaws.com/{s3_file_name}"
        
        # 대표해설 포스터 이미지 정보 업데이트
        updated_sample = scriptwriter.update_sample_images(
            db=db,
            db_obj=sample,
            poster_image=s3_url
        )
        
        logger.info(f"Poster image uploaded for scriptwriter {scriptwriter_id}, sample {sample_id}")
        return {"poster_image": s3_url}
        
    except Exception as e:
        logger.error(f"Error uploading poster image: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error while uploading poster image.")

@router.post("/{scriptwriter_id}/samples/{sample_id}/reference-image", response_model=schemas.ReferenceImageResponse)
async def upload_sample_reference_image(
    *,
    db: Session = Depends(get_db),
    scriptwriter_id: int,
    sample_id: int,
    file: UploadFile = File(...)
):
    """해설작가 대표해설 참고 이미지 업로드 (S3 private)"""
    if not s3_client:
        raise HTTPException(status_code=503, detail="S3 service is unavailable.")
    
    sample = scriptwriter.get_sample(db=db, scriptwriter_id=scriptwriter_id, sample_id=sample_id)
    if not sample:
        raise HTTPException(status_code=404, detail="Sample not found")
    
    # 이미지 파일 검증
    allowed_extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
    file_extension = os.path.splitext(file.filename)[1].lower()
    if file_extension not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed types: {', '.join(allowed_extensions)}"
        )
    
    try:
        file_content = await file.read()
        
        # 파일 크기 제한 (10MB)
        if len(file_content) > 10 * 1024 * 1024:
            raise HTTPException(
                status_code=413, 
                detail="File size exceeds the limit of 10MB."
            )
        
        # S3 파일명 생성 (private)
        s3_file_name = f"scriptwriters/{scriptwriter_id}/samples/reference-{sample_id}-{uuid.uuid4()}{file_extension}"
        
        s3_client.put_object(
            Bucket=S3_PRIVATE_BUCKET,
            Key=s3_file_name,
            Body=file_content,
            ContentType=file.content_type
            # ACL='private' (기본값)
        )
        
        # S3 URL 생성 (private bucket)
        s3_url = f"https://{S3_PRIVATE_BUCKET}.s3.{AWS_REGION}.amazonaws.com/{s3_file_name}"
        
        # 대표해설 참고 이미지 정보 업데이트
        updated_sample = scriptwriter.update_sample_images(
            db=db,
            db_obj=sample,
            reference_image=s3_url
        )
        
        logger.info(f"Reference image uploaded for scriptwriter {scriptwriter_id}, sample {sample_id}")
        return {"reference_image": s3_url}
        
    except Exception as e:
        logger.error(f"Error uploading reference image: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error while uploading reference image.")

@router.get("/{scriptwriter_id}/samples/{sample_id}/reference-image-url", response_model=dict)
def get_sample_reference_image_url(
    *,
    db: Session = Depends(get_db),
    scriptwriter_id: int,
    sample_id: int,
    expires_in: int = Query(3600, ge=300, le=86400, description="URL 유효시간(초)")
):
    """해설작가 대표해설 참고 이미지 접근을 위한 Presigned URL 생성"""
    from app.services.s3_service import S3Service
    
    sample = scriptwriter.get_sample(db=db, scriptwriter_id=scriptwriter_id, sample_id=sample_id)
    if not sample:
        raise HTTPException(status_code=404, detail="Sample not found")
    
    if not sample.reference_image:
        raise HTTPException(status_code=404, detail="Reference image not found")
    
    # S3 URL에서 키 추출
    # 예: https://tomato-app-storage.s3.ap-northeast-2.amazonaws.com/scriptwriters/1/samples/reference-2-720514ad.jpg
    # -> scriptwriters/1/samples/reference-2-720514ad.jpg
    try:
        # URL 파싱
        url_parts = sample.reference_image.split('.amazonaws.com/')
        if len(url_parts) != 2:
            raise ValueError("Invalid S3 URL format")
        
        s3_key = url_parts[1]
        
        # S3 서비스 인스턴스 생성
        s3_service = S3Service()
        
        # Presigned URL 생성 (private bucket)
        presigned_url = s3_service.generate_presigned_get(
            key=s3_key,
            expires_in=expires_in,
            is_public=False
        )
        
        logger.info(f"Generated presigned URL for reference image: scriptwriter {scriptwriter_id}, sample {sample_id}")
        
        return {
            "url": presigned_url,
            "expires_in": expires_in
        }
        
    except Exception as e:
        logger.error(f"Error generating presigned URL for reference image: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to generate access URL for reference image")

@router.delete("/{scriptwriter_id}/samples/{sample_id}", status_code=204)
def delete_scriptwriter_sample(
    *,
    db: Session = Depends(get_db),
    scriptwriter_id: int,
    sample_id: int
):
    """해설작가 대표해설 삭제"""
    success = scriptwriter.remove_sample(db=db, scriptwriter_id=scriptwriter_id, sample_id=sample_id)
    if not success:
        raise HTTPException(status_code=404, detail="Sample not found")
    
    logger.info(f"Sample {sample_id} deleted for scriptwriter {scriptwriter_id}")
    return None
