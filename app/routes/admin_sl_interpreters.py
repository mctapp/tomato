# app/routes/admin_sl_interpreters.py
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from sqlmodel import Session
from typing import List, Optional
from app.db import get_db
from app.crud.crud_sl_interpreter import sl_interpreter
from app.schemas import sl_interpreter as schemas
import boto3
from botocore.exceptions import ClientError
import os
import uuid
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/admin/api/slinterpreters",
    tags=["Admin - SL Interpreters"]
)

# S3 설정
S3_BUCKET = os.getenv("PUBLIC_BUCKET_NAME")
AWS_REGION = os.getenv("AWS_REGION", "ap-northeast-2")

try:
    s3_client = boto3.client('s3', region_name=AWS_REGION)
    logger.info(f"S3 client created successfully for region {AWS_REGION}.")
except Exception as e:
    logger.error(f"Failed to create S3 client: {e}")
    s3_client = None

@router.get("", response_model=schemas.PaginatedResponse[schemas.SLInterpreterSummary])
def read_sl_interpreters(
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1, description="페이지 번호 (1부터 시작)"),
    limit: int = Query(20, ge=1, le=100, description="페이지당 항목 수"),
    keyword: Optional[str] = Query(None, description="검색 키워드 (이름, 메모)"),
    skillLevels: Optional[str] = Query(None, description="스킬 레벨 (콤마로 구분: 1,2,3)"),
    signLanguages: Optional[str] = Query(None, description="사용수어 (콤마로 구분: KSL,ASL)"),
    locations: Optional[str] = Query(None, description="지역 (콤마로 구분)"),
    genders: Optional[str] = Query(None, description="성별 (콤마로 구분)"),
    orderBy: str = Query("created_at", description="정렬 기준 필드"),
    orderDesc: bool = Query(True, description="내림차순 정렬 여부")
):
    """수어통역사 목록 조회 (페이지네이션 및 필터링 지원)"""
    try:
        # 페이지네이션 계산
        skip = (page - 1) * limit
        
        # 필터 파라미터 파싱 - 단순화
        filters = schemas.SLInterpreterSearchFilters()
        
        if keyword:
            filters.keyword = keyword.strip()
        
        # 스킬 레벨 필터 - 올바른 필드명 사용
        if skillLevels:
            try:
                if ',' in skillLevels:
                    # 여러 값 처리
                    skill_levels_list = []
                    for level_str in skillLevels.split(','):
                        level_str = level_str.strip()
                        if level_str.isdigit():
                            level = int(level_str)
                            if 1 <= level <= 9:
                                skill_levels_list.append(level)
                    filters.skill_levels = skill_levels_list if skill_levels_list else None
                else:
                    # 단일 값 처리
                    level_str = skillLevels.strip()
                    if level_str.isdigit():
                        level = int(level_str)
                        if 1 <= level <= 9:
                            filters.skill_levels = [level]
            except (ValueError, AttributeError) as e:
                logger.warning(f"Invalid skill levels format: {skillLevels}, error: {e}")
                filters.skill_levels = None
        
        # 수어 필터 - 올바른 필드명 사용
        if signLanguages:
            try:
                if ',' in signLanguages:
                    # 여러 값 처리
                    sign_languages_list = []
                    valid_codes = ['KSL', 'ASL', 'VSL', 'JSL', 'CSL', 'BSL', 'FSL', 'GSL', 'ISL', 'SSL', 'RSL']
                    for code in signLanguages.split(','):
                        code = code.strip().upper()
                        if code in valid_codes:
                            sign_languages_list.append(code)
                    filters.sign_languages = sign_languages_list if sign_languages_list else None
                else:
                    # 단일 값 처리
                    code = signLanguages.strip().upper()
                    valid_codes = ['KSL', 'ASL', 'VSL', 'JSL', 'CSL', 'BSL', 'FSL', 'GSL', 'ISL', 'SSL', 'RSL']
                    if code in valid_codes:
                        filters.sign_languages = [code]
            except AttributeError as e:
                logger.warning(f"Invalid sign languages format: {signLanguages}, error: {e}")
                filters.sign_languages = None
        
        # 성별 필터 - 추가
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
        
        # 데이터 조회
        summaries, pagination_meta = sl_interpreter.get_multi_with_pagination(
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
        logger.error(f"Error reading SL interpreters: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/search", response_model=schemas.PaginatedResponse[schemas.SLInterpreterSummary])
def search_sl_interpreters(
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    keyword: Optional[str] = Query(None, description="검색 키워드"),
    skillLevels: Optional[str] = Query(None, description="스킬 레벨 필터"),
    signLanguages: Optional[str] = Query(None, description="사용수어 필터"),
    locations: Optional[str] = Query(None, description="지역 필터")
):
    """고급 검색 기능"""
    try:
        skip = (page - 1) * limit
        
        # 필터 객체 생성
        filters = schemas.SLInterpreterSearchFilters()
        
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
                filters.skillLevels = skill_levels_list if skill_levels_list else None
            except (ValueError, AttributeError):
                filters.skillLevels = None
        
        if signLanguages:
            try:
                sign_languages_list = []
                valid_codes = ['KSL', 'ASL', 'VSL', 'JSL', 'CSL', 'BSL', 'FSL', 'GSL', 'ISL', 'SSL', 'RSL']
                for code in signLanguages.split(','):
                    code = code.strip().upper()
                    if code in valid_codes:
                        sign_languages_list.append(code)
                filters.signLanguages = sign_languages_list if sign_languages_list else None
            except AttributeError:
                filters.signLanguages = None
        
        if locations:
            try:
                filters.locations = [x.strip() for x in locations.split(',') if x.strip()]
            except AttributeError:
                filters.locations = None
        
        summaries, pagination_meta = sl_interpreter.search_optimized(
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
        logger.error(f"Error searching SL interpreters: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Search error occurred.")

@router.get("/stats", response_model=dict)
def get_sl_interpreter_stats(db: Session = Depends(get_db)):
    """수어통역사 통계 정보"""
    try:
        stats = sl_interpreter.get_stats(db)
        return stats
    except Exception as e:
        logger.error(f"Error getting stats: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error retrieving statistics.")

@router.post("", response_model=schemas.SLInterpreter, status_code=201)
def create_sl_interpreter(
    *,
    db: Session = Depends(get_db),
    interpreter_in: schemas.SLInterpreterCreate
):
    """수어통역사 생성"""
    try:
        interpreter = sl_interpreter.create_with_relations(db=db, obj_in=interpreter_in)
        logger.info(f"SL interpreter created with ID: {interpreter.id}")
        return interpreter
    except Exception as e:
        logger.error(f"Error creating SL interpreter: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error while creating SL interpreter.")

@router.get("/{interpreter_id}", response_model=schemas.SLInterpreter)
def read_sl_interpreter(
    *,
    db: Session = Depends(get_db),
    interpreter_id: int
):
    """특정 수어통역사 상세 정보 조회"""
    interpreter = sl_interpreter.get_with_relations(db=db, id=interpreter_id)
    if not interpreter:
        logger.warning(f"SL interpreter with id {interpreter_id} not found.")
        raise HTTPException(status_code=404, detail="SL interpreter not found")
    return interpreter

@router.put("/{interpreter_id}", response_model=schemas.SLInterpreter)
def update_sl_interpreter(
    *,
    db: Session = Depends(get_db),
    interpreter_id: int,
    interpreter_in: schemas.SLInterpreterUpdate
):
    """수어통역사 정보 수정"""
    db_interpreter = sl_interpreter.get(db=db, id=interpreter_id)
    if not db_interpreter:
        logger.warning(f"SL interpreter with id {interpreter_id} not found for update.")
        raise HTTPException(status_code=404, detail="SL interpreter not found")

    try:
        interpreter = sl_interpreter.update_with_relations(db=db, db_obj=db_interpreter, obj_in=interpreter_in)
        logger.info(f"SL interpreter {interpreter_id} updated successfully.")
        return interpreter
    except Exception as e:
        logger.error(f"Error updating SL interpreter {interpreter_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error while updating SL interpreter.")

@router.delete("/{interpreter_id}", status_code=204)
def delete_sl_interpreter(
    *,
    db: Session = Depends(get_db),
    interpreter_id: int
):
    """수어통역사 삭제"""
    interpreter = sl_interpreter.get(db=db, id=interpreter_id)
    if not interpreter:
        logger.warning(f"SL interpreter with id {interpreter_id} not found for deletion.")
        raise HTTPException(status_code=404, detail="SL interpreter not found")

    try:
        sl_interpreter.remove(db=db, id=interpreter_id)
        logger.info(f"SL interpreter with id {interpreter_id} deleted successfully.")
        return None
    except Exception as e:
        logger.error(f"Error deleting SL interpreter {interpreter_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error while deleting SL interpreter.")

@router.post("/{interpreter_id}/profile-image", response_model=schemas.ProfileImageResponse)
async def upload_profile_image(
    *,
    db: Session = Depends(get_db),
    interpreter_id: int,
    file: UploadFile = File(...)
):
    """수어통역사 프로필 이미지 업로드"""
    if not s3_client:
        logger.error("S3 client is not available.")
        raise HTTPException(status_code=503, detail="S3 service is unavailable.")

    db_interpreter = sl_interpreter.get(db=db, id=interpreter_id)
    if not db_interpreter:
        logger.warning(f"SL interpreter with id {interpreter_id} not found for profile image upload.")
        raise HTTPException(status_code=404, detail="SL interpreter not found")

    # 파일 확장자 및 크기 제한
    allowed_extensions = ['.jpg', '.jpeg', '.png', '.gif']
    file_extension = os.path.splitext(file.filename)[1].lower()
    if file_extension not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed types: {', '.join(allowed_extensions)}"
        )

    # S3 파일명 생성
    s3_file_name = f"sl-interpreters/{interpreter_id}/profile-{uuid.uuid4()}{file_extension}"

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
        updated_data = schemas.SLInterpreterUpdate(profileImage=s3_url)
        sl_interpreter.update(db=db, db_obj=db_interpreter, obj_in=updated_data)

        logger.info(f"SL interpreter {interpreter_id} profile image URL updated in DB.")

        return {"profileImage": s3_url}

    except ClientError as e:
        logger.error(f"S3 upload failed for SL interpreter {interpreter_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to upload profile image.")
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error during profile image upload for SL interpreter {interpreter_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="An internal error occurred.")

@router.post("/{interpreter_id}/samples", response_model=schemas.SLInterpreterSampleInDB, status_code=201)
def create_sl_interpreter_sample(
    *,
    db: Session = Depends(get_db),
    interpreter_id: int,
    sample_in: schemas.SLInterpreterSampleCreate
):
    """수어통역사 샘플 생성"""
    interpreter = sl_interpreter.get(db=db, id=interpreter_id)
    if not interpreter:
        raise HTTPException(status_code=404, detail="SL interpreter not found")
    
    try:
        sample = sl_interpreter.create_sample(db=db, sl_interpreter_id=interpreter_id, obj_in=sample_in)
        logger.info(f"Sample created for SL interpreter {interpreter_id}: {sample.id}")
        return sample
    except Exception as e:
        logger.error(f"Error creating sample for SL interpreter {interpreter_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error while creating sample.")

@router.post("/{interpreter_id}/samples/{sample_id}/file", response_model=schemas.SLInterpreterSampleInDB)
async def upload_sample_file(
    *,
    db: Session = Depends(get_db),
    interpreter_id: int,
    sample_id: int,
    file: UploadFile = File(...)
):
    """수어통역사 샘플 파일 업로드"""
    if not s3_client:
        raise HTTPException(status_code=503, detail="S3 service is unavailable.")
    
    sample = sl_interpreter.get_sample(db=db, sl_interpreter_id=interpreter_id, sample_id=sample_id)
    if not sample:
        raise HTTPException(status_code=404, detail="Sample not found")
    
    # 샘플 타입에 따른 파일 검증
    if sample.sample_type == "video":
        allowed_extensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm']
        max_size = 50 * 1024 * 1024  # 50MB
    else:  # image
        allowed_extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
        max_size = 10 * 1024 * 1024  # 10MB
    
    file_extension = os.path.splitext(file.filename)[1].lower()
    if file_extension not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type for {sample.sample_type}. Allowed types: {', '.join(allowed_extensions)}"
        )
    
    try:
        file_content = await file.read()
        
        if len(file_content) > max_size:
            raise HTTPException(
                status_code=413, 
                detail=f"File size exceeds the limit of {max_size // (1024*1024)}MB for {sample.sample_type}."
            )
        
        # S3 파일명 생성
        s3_file_name = f"sl-interpreters/{interpreter_id}/samples/{sample.sample_type}-{sample_id}-{uuid.uuid4()}{file_extension}"
        
        s3_client.put_object(
            Bucket=S3_BUCKET,
            Key=s3_file_name,
            Body=file_content,
            ContentType=file.content_type,
            ACL='public-read'
        )
        
        # S3 URL 생성
        s3_url = f"https://{S3_BUCKET}.s3.{AWS_REGION}.amazonaws.com/{s3_file_name}"
        
        # 샘플 파일 정보 업데이트
        updated_sample = sl_interpreter.update_sample_file(
            db=db,
            db_obj=sample,
            file_path=s3_url,
            file_size=len(file_content),
            file_type=file_extension[1:]  # 점(.) 제거
        )
        
        logger.info(f"Sample file uploaded for interpreter {interpreter_id}, sample {sample_id}")
        return updated_sample
        
    except Exception as e:
        logger.error(f"Error uploading sample file: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error while uploading sample file.")

@router.delete("/{interpreter_id}/samples/{sample_id}", status_code=204)
def delete_sl_interpreter_sample(
    *,
    db: Session = Depends(get_db),
    interpreter_id: int,
    sample_id: int
):
    """수어통역사 샘플 삭제"""
    success = sl_interpreter.remove_sample(db=db, sl_interpreter_id=interpreter_id, sample_id=sample_id)
    if not success:
        raise HTTPException(status_code=404, detail="Sample not found")
    
    logger.info(f"Sample {sample_id} deleted for interpreter {interpreter_id}")
    return None
# 크레딧(작업이력) 관련 엔드포인트
@router.get("/{interpreter_id}/credits", response_model=dict)
def get_sl_interpreter_credits(
    *,
    db: Session = Depends(get_db),
    interpreter_id: int,
    page: int = Query(1, ge=1, description="페이지 번호"),
    limit: int = Query(20, ge=1, le=100, description="페이지당 항목 수"),
    mediaType: Optional[str] = Query(None, description="접근성 미디어 타입 필터 (SL, SI, SR)")
):
    """수어통역사의 작업 이력(크레딧) 조회"""
    interpreter = sl_interpreter.get(db=db, id=interpreter_id)
    if not interpreter:
        raise HTTPException(status_code=404, detail="SL interpreter not found")
    
    try:
        skip = (page - 1) * limit
        
        # 접근성 미디어 타입 필터 파싱
        media_types = None
        if mediaType:
            valid_types = ['SL', 'SI', 'SR']
            if ',' in mediaType:
                media_types = [t.strip().upper() for t in mediaType.split(',') if t.strip().upper() in valid_types]
            else:
                media_type_upper = mediaType.strip().upper()
                if media_type_upper in valid_types:
                    media_types = [media_type_upper]
        
        # 크레딧 조회
        credits, total_count = sl_interpreter.get_credits(
            db=db,
            sl_interpreter_id=interpreter_id,
            skip=skip,
            limit=limit,
            media_types=media_types
        )
        
        # 페이지네이션 메타데이터
        total_pages = (total_count + limit - 1) // limit
        
        return {
            "data": credits,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total_count,
                "totalPages": total_pages,
                "hasNext": page < total_pages,
                "hasPrev": page > 1
            }
        }
        
    except Exception as e:
        logger.error(f"Error getting credits for SL interpreter {interpreter_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error while fetching credits.")
