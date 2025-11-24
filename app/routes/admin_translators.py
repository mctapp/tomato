# app/routes/admin_translators.py
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query # Query 추가
# sqlalchemy.orm.Session 대신 sqlmodel.Session 임포트
from sqlmodel import Session
from typing import List, Optional
from app import crud, schemas # schemas 임포트 방식 확인
from app.db import get_db
import boto3
from botocore.exceptions import ClientError
import os
import uuid
import logging # 로깅 추가

# 로거 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/admin/api/translators",
    tags=["Admin - Translators"] # API 문서용 태그 추가
)

# --- S3 설정 ---
S3_BUCKET = os.getenv("PUBLIC_BUCKET_NAME")
AWS_REGION = os.getenv("AWS_REGION", "ap-northeast-2")

# S3 클라이언트 생성 (시작 시 한번 또는 의존성 주입 사용 권장)
try:
    s3_client = boto3.client('s3', region_name=AWS_REGION)
    logger.info(f"S3 client created successfully for region {AWS_REGION}.")
except Exception as e:
    logger.error(f"Failed to create S3 client: {e}")
    s3_client = None

# --- API 엔드포인트 ---

@router.get("", response_model=List[schemas.TranslatorSummary])
def read_translators(
    # 타입 힌트를 sqlmodel.Session으로 변경
    db: Session = Depends(get_db),
    skip: int = Query(0, ge=0, description="Number of records to skip for pagination"),
    limit: int = Query(100, ge=1, le=200, description="Maximum number of records to return"), # 최대 limit 제한
    keyword: Optional[str] = Query(None, description="Search keyword for translator name"),
    specialty: Optional[str] = Query(None, pattern="^(AD|CC|SL)$", description="Filter by specialty type (AD, CC, SL)") # 패턴 추가
):
    """
    번역가 목록 조회 (요약 정보).
    - 키워드(이름) 검색 또는 전문능력 필터링 지원.
    - 동시 사용 시 키워드 우선.
    """
    try:
        if keyword:
            # 키워드 검색 (Summary 반환) - crud 모듈에 search_summary 구현 필요
            # summaries = crud.translator.search_summary(db, keyword=keyword, skip=skip, limit=limit)
            # 임시: 전체 조회 후 변환
            translators = crud.translator.search(db, keyword=keyword) # 전체 객체 조회
            summaries = crud.translator.convert_to_summary_list(db, translators[skip : skip + limit]) # 변환 및 슬라이싱
        elif specialty:
            # 전문능력 필터링 (Summary 반환) - crud 모듈에 get_by_specialty_summary 구현 필요
            # summaries = crud.translator.get_by_specialty_summary(db, specialty_type=specialty, skip=skip, limit=limit)
            # 임시: 전체 조회 후 변환
            translators = crud.translator.get_by_specialty(db, specialty_type=specialty) # 전체 객체 조회
            summaries = crud.translator.convert_to_summary_list(db, translators[skip : skip + limit]) # 변환 및 슬라이싱
        else:
            # 전체 목록 조회 (Summary 반환)
            summaries = crud.translator.get_multi_summary(db, skip=skip, limit=limit)

        return summaries
    except Exception as e:
        logger.error(f"Error reading translators: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error while reading translators.")


@router.post("", response_model=schemas.Translator, status_code=201) # 상태 코드 201 명시
def create_translator(
    *,
    # 타입 힌트를 sqlmodel.Session으로 변경
    db: Session = Depends(get_db),
    translator_in: schemas.TranslatorCreate
):
    """
    번역가 생성 (기본 정보, 전문능력, 전문영역, 대표작품 포함).
    """
    try:
        # crud 함수가 대표작품 처리 로직 포함 (crud_translator.py 수정 완료 가정)
        translator = crud.translator.create_with_relations(db=db, obj_in=translator_in)
        return translator
    except Exception as e: # 좀 더 구체적인 예외 처리 고려 (예: IntegrityError)
        logger.error(f"Error creating translator: {e}", exc_info=True)
        # 중복 등의 DB 오류는 4xx 코드로 변환 가능
        raise HTTPException(status_code=500, detail="Internal server error while creating translator.")


@router.get("/{translator_id}", response_model=schemas.Translator) # 경로 파라미터 이름 변경
def read_translator(
    *,
    # 타입 힌트를 sqlmodel.Session으로 변경
    db: Session = Depends(get_db),
    translator_id: int # 파라미터 이름 일치
):
    """
    특정 번역가 상세 정보 조회 (연관 정보 포함).
    """
    # crud 함수가 연관 정보 eager loading 포함 (crud_translator.py 수정 완료 가정)
    translator = crud.translator.get(db=db, id=translator_id)
    if not translator:
        logger.warning(f"Translator with id {translator_id} not found.")
        raise HTTPException(status_code=404, detail="Translator not found")
    return translator


@router.put("/{translator_id}", response_model=schemas.Translator) # 경로 파라미터 이름 변경
def update_translator(
    *,
    # 타입 힌트를 sqlmodel.Session으로 변경
    db: Session = Depends(get_db),
    translator_id: int, # 파라미터 이름 일치
    translator_in: schemas.TranslatorUpdate
):
    """
    번역가 정보 수정 (연관 정보 포함).
    - Request body에 포함된 필드만 업데이트.
    - 연관 정보(specialties, expertise, representative_works)는 전체 교체 방식.
    """
    db_translator = crud.translator.get(db=db, id=translator_id) # 먼저 조회
    if not db_translator:
        logger.warning(f"Translator with id {translator_id} not found for update.")
        raise HTTPException(status_code=404, detail="Translator not found")

    try:
        # crud 함수가 대표작품 처리 로직 포함 (crud_translator.py 수정 완료 가정)
        translator = crud.translator.update_with_relations(db=db, db_obj=db_translator, obj_in=translator_in)
        return translator
    except Exception as e: # 좀 더 구체적인 예외 처리 고려
        logger.error(f"Error updating translator {translator_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error while updating translator.")


@router.delete("/{translator_id}", status_code=204) # 성공 시 204 No Content, 응답 본문 없음
def delete_translator(
    *,
    # 타입 힌트를 sqlmodel.Session으로 변경
    db: Session = Depends(get_db),
    translator_id: int # 파라미터 이름 일치
):
    """
    번역가 삭제.
    - 연관된 데이터(specialties, expertise, representative_works)도 함께 삭제되어야 함 (CASCADE 또는 명시적 삭제).
    """
    translator = crud.translator.get(db=db, id=translator_id) # 삭제 전 조회 (로깅 등 목적)
    if not translator:
        logger.warning(f"Translator with id {translator_id} not found for deletion.")
        raise HTTPException(status_code=404, detail="Translator not found")

    try:
        # crud.translator.remove 에서 연관 데이터 삭제를 처리한다고 가정
        # 또는 별도 함수 crud.translator.remove_with_relations(db=db, id=translator_id) 호출
        crud.translator.remove(db=db, id=translator_id)
        logger.info(f"Translator with id {translator_id} deleted successfully.")
        # 성공 시 204 No Content 반환 (response_model 없음)
        return None # FastAPI가 자동으로 204 응답 생성
    except Exception as e: # DB 제약 조건 위반 등 고려
        logger.error(f"Error deleting translator {translator_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error while deleting translator.")


@router.post("/{translator_id}/profile-image", response_model=schemas.TranslatorProfileImageResponse) # 경로 파라미터 이름 변경
async def upload_profile_image(
    *,
    # 타입 힌트를 sqlmodel.Session으로 변경
    db: Session = Depends(get_db),
    translator_id: int, # 파라미터 이름 일치
    file: UploadFile = File(...)
):
    """
    번역가 프로필 이미지 업로드 (S3).
    - 성공 시 새 이미지 URL 반환 ({ "profileImage": "url" }).
    """
    if not s3_client:
        logger.error("S3 client is not available.")
        raise HTTPException(status_code=503, detail="S3 service is unavailable.")

    db_translator = crud.translator.get(db=db, id=translator_id)
    if not db_translator:
        logger.warning(f"Translator with id {translator_id} not found for profile image upload.")
        raise HTTPException(status_code=404, detail="Translator not found")

    # 파일 확장자 및 크기 제한 등 추가 고려 가능
    allowed_extensions = ['.jpg', '.jpeg', '.png', '.gif']
    file_extension = os.path.splitext(file.filename)[1].lower()
    if file_extension not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed types: {', '.join(allowed_extensions)}"
        )

    # S3 파일명 생성
    s3_file_name = f"translators/{translator_id}/profile-{uuid.uuid4()}{file_extension}"

    try:
        file_content = await file.read()

        # 파일 크기 제한 (예: 5MB)
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

        # S3 URL 생성 (리전/버킷 설정 확인 필요)
        s3_url = f"https://{S3_BUCKET}.s3.{AWS_REGION}.amazonaws.com/{s3_file_name}"

        # DB 업데이트 (profile_image 필드만)
        # crud.translator.update 사용 또는 특정 필드 업데이트 함수 사용
        updated_data = schemas.TranslatorUpdate(profile_image=s3_url)
        crud.translator.update(db=db, db_obj=db_translator, obj_in=updated_data)

        logger.info(f"Translator {translator_id} profile image URL updated in DB.")

        # 스키마에 맞는 응답 반환 ({ "profileImage": "url" }) - 자동 케이스 변환 가정
        return {"profile_image": s3_url}

    except ClientError as e:
        logger.error(f"S3 upload failed for translator {translator_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to upload profile image.")
    except HTTPException as e:
        # 파일 크기 제한 등 여기서 발생한 HTTPException은 그대로 전달
        raise e
    except Exception as e:
        logger.error(f"Error during profile image upload for translator {translator_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="An internal error occurred.")

