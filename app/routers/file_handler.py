import uuid
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from datetime import datetime
import traceback
from pydantic import BaseModel
from typing import Optional
import boto3
import os
from PIL import Image
from io import BytesIO
from botocore.exceptions import ClientError

# --- 필요한 모듈 임포트 ---
from app.db import get_db
from app.models.image_renditions import ImageRendition
from app.models.movies import Movie
from app.config import settings

# FastAPI 라우터 설정
router = APIRouter(
    prefix="/api/files",
    tags=["File Handling"]
)

# AWS S3 클라이언트 설정
s3_client = boto3.client(
    's3',
    aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
    aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
    region_name=settings.AWS_REGION
)

# --- 응답 모델 ---
class FileUploadResponse(BaseModel):
    message: str
    movie_id: int
    poster_original_rendition_id: Optional[int] = None
    signature_s3_full_key: Optional[str] = None


# --- 이미지 메타데이터 추출 함수 ---
def get_image_metadata(file: UploadFile) -> tuple[int, int, str]:
    """이미지 파일에서 너비, 높이, 포맷 정보 추출"""
    file.file.seek(0)
    image = Image.open(file.file)
    width, height = image.size
    format = image.format.lower()
    file.file.seek(0)
    return width, height, format


# --- S3 업로드 함수 ---
def upload_to_s3(file: UploadFile, bucket_name: str, key: str, is_public: bool = False) -> bool:
    """파일을 S3에 업로드"""
    try:
        file.file.seek(0)
        extra_args = {
            'ContentType': file.content_type or 'application/octet-stream'
        }
        if is_public:
            extra_args['ACL'] = 'public-read'
        
        s3_client.upload_fileobj(
            file.file,
            bucket_name,
            key,
            ExtraArgs=extra_args
        )
        return True
    except ClientError as e:
        print(f"S3 업로드 오류: {e}")
        return False


# --- Presigned URL 생성 함수 ---
def generate_presigned_url(bucket_name: str, key: str, expiration: int = 3600) -> str:
    """S3 객체의 Presigned URL 생성"""
    try:
        presigned_url = s3_client.generate_presigned_url(
            'get_object',
            Params={
                'Bucket': bucket_name,
                'Key': key,
            },
            ExpiresIn=expiration
        )
        return presigned_url
    except ClientError as e:
        print(f"Presigned URL 생성 오류: {e}")
        return None


# --- 통합 파일 업로드 엔드포인트 ---
@router.post("/upload-movie-assets", response_model=FileUploadResponse, status_code=status.HTTP_200_OK)
async def upload_movie_assets(
    *,
    movie_id: int = Form(...),
    poster: UploadFile = File(None),
    signature: UploadFile = File(None),
    db: Session = Depends(get_db)
):
    print(f"\n--- [{datetime.utcnow()}] /upload-movie-assets (POST) 파일 업로드 요청 시작 (Movie ID: {movie_id}) ---")
    if poster:
        print(f"포스터 파일: {poster.filename}, 사이즈: {poster.size}")
    if signature:
        print(f"시그니처 파일: {signature.filename}, 사이즈: {signature.size}")

    # 파일 체크
    if not poster and not signature:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="포스터 또는 시그니처 파일 중 하나 이상을 업로드해야 합니다."
        )

    # --- 단계 0: 대상 영화 존재 확인 ---
    db_movie = db.get(Movie, movie_id)
    if not db_movie:
        print(f"❌ 영화 ID {movie_id}를 찾을 수 없습니다.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Movie with id {movie_id} not found")
    print(f"  [0-1] 대상 영화 확인 완료: {db_movie.title} (ID: {db_movie.id})")

    original_rendition: ImageRendition | None = None
    poster_s3_key = None
    signature_s3_full_key = None
    signature_s3_directory = "signatures/"
    signature_s3_filename = None
    signature_size = 0

    try:
        # --- 단계 1: 포스터 파일 처리 및 S3 업로드 ---
        if poster:
            poster_unique_id = uuid.uuid4()
            poster_filename = f"{poster_unique_id}_{poster.filename}"
            poster_s3_directory = "posters/originals/"
            poster_s3_key = f"{poster_s3_directory}{poster_filename}"
            
            # 포스터 메타데이터 추출
            width, height, format = get_image_metadata(poster)
            print(f"  [1-1] 포스터 메타데이터 추출: {width}x{height}, {format}")
            
            # 포스터 S3 업로드 (public)
            if not upload_to_s3(poster, settings.PUBLIC_BUCKET_NAME, poster_s3_key, is_public=True):
                raise Exception("포스터 S3 업로드 실패")
            print(f"  [1-2] 포스터 S3 업로드 완료: {poster_s3_key}")

            # --- 단계 2: 원본 이미지 렌디션 DB 저장 ---
            original_rendition = ImageRendition(
                movie_id=movie_id,
                s3_directory=poster_s3_directory,
                s3_filename=poster_filename,
                width=width,
                height=height,
                format=format,
                rendition_type='original',
                file_size=poster.size,
                mime_type=poster.content_type,
                file_extension=os.path.splitext(poster.filename)[1],
                is_original=True,
                alt_text=db_movie.title
            )
            db.add(original_rendition)
            print(f"  [2-1] ImageRendition 객체 생성 및 db.add() 호출 완료 (Movie ID: {movie_id})")

            db.flush()
            if original_rendition.id is None:
                 raise Exception("ImageRendition ID가 생성되지 않았습니다.")
            print(f"  [2-2] db.flush() 완료. 생성된 Rendition ID: {original_rendition.id}")

        # --- 단계 3: 시그니처 파일 처리 및 S3 업로드 ---
        if signature:
            signature_unique_id = uuid.uuid4()
            signature_s3_filename = f"{signature_unique_id}_{signature.filename}"
            signature_s3_full_key = f"{signature_s3_directory}{signature_s3_filename}"
            
            # 시그니처 파일 크기 확인
            signature.file.seek(0, 2)
            signature_size = signature.file.tell()
            signature.file.seek(0)
            print(f"  [3-1] 시그니처 파일 크기 확인: {signature_size} bytes")
            
            # 시그니처 S3 업로드 (private)
            if not upload_to_s3(signature, settings.PRIVATE_BUCKET_NAME, signature_s3_full_key, is_public=False):
                raise Exception("시그니처 S3 업로드 실패")
            print(f"  [3-2] 시그니처 S3 업로드 완료: {signature_s3_full_key}")

        # --- 단계 4: Movie 레코드 업데이트 ---
        update_data = {}
        if poster and 'original_rendition' in locals():
            update_data["poster_original_rendition_id"] = original_rendition.id
        
        if signature:
            update_data.update({
                "signature_s3_directory": signature_s3_directory,
                "signature_s3_filename": signature_s3_filename,
                "original_signature_filename": signature.filename,
                "signature_upload_time": datetime.utcnow(),
                "signature_file_size": signature_size,
            })
        
        update_data["updated_at"] = datetime.utcnow()
        
        for key, value in update_data.items():
            if hasattr(db_movie, key):
                setattr(db_movie, key, value)
            else:
                print(f"  [Warning] Movie 모델에 '{key}' 필드가 없어 업데이트 건너뜁니다.")

        db.add(db_movie)
        print(f"  [4-1] Movie 레코드 업데이트 준비 완료 (ID: {movie_id})")

        # --- 단계 5: 모든 변경사항 DB Commit ---
        db.commit()
        print(f"✅ [5-1] DB Commit 성공! Rendition 및 Movie 업데이트 완료.")

        # --- 단계 6: 성공 응답 데이터 구성 및 반환 ---
        response_data = FileUploadResponse(
            message="파일 업로드 및 영화 정보 업데이트 성공",
            movie_id=movie_id,
            poster_original_rendition_id=original_rendition.id if poster and 'original_rendition' in locals() else None,
            signature_s3_full_key=signature_s3_full_key if signature else None
        )
        print(f"  [6-1] 성공 응답 데이터 준비 완료.")
        print(f"--- /upload-movie-assets (POST) 파일 업로드 요청 처리 완료 ---")
        return response_data

    except Exception as e:
        error_timestamp = datetime.utcnow()
        error_details = traceback.format_exc()
        print(f"❌ [{error_timestamp}] /upload-movie-assets (POST) 처리 중 오류 발생! (Movie ID: {movie_id})")
        print(f"  오류 타입: {type(e).__name__}")
        print(f"  오류 메시지: {e}")
        print(f"  상세 스택 트레이스:\n{error_details}")

        print(f"  [E-1] DB Rollback 시도...")
        db.rollback()
        print(f"  [E-2] DB Rollback 완료.")

        # S3에 업로드된 파일 정리 (롤백)
        try:
            if poster and 'poster_s3_key' in locals() and poster_s3_key:
                s3_client.delete_object(Bucket=settings.PUBLIC_BUCKET_NAME, Key=poster_s3_key)
                print(f"  [E-3] S3 포스터 파일 삭제 완료: {poster_s3_key}")
            if signature and 'signature_s3_full_key' in locals() and signature_s3_full_key:
                s3_client.delete_object(Bucket=settings.PRIVATE_BUCKET_NAME, Key=signature_s3_full_key)
                print(f"  [E-4] S3 시그니처 파일 삭제 완료: {signature_s3_full_key}")
        except Exception as cleanup_error:
            print(f"  [E-5] S3 파일 정리 중 오류 발생: {cleanup_error}")

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"파일 처리 중 서버 내부 오류 발생 ({type(e).__name__})"
        )


# --- Private 파일 접근을 위한 Presigned URL 생성 엔드포인트 ---
@router.get("/generate-presigned-url/{movie_id}/{file_type}")
def generate_file_access_url(
    movie_id: int,
    file_type: str,
    expiration: int = 3600,
    db: Session = Depends(get_db)
):
    """영화의 private 파일에 대한 presigned URL 생성"""
    
    # 지원하는 파일 타입 확인
    if file_type not in ['signature', 'audio_description', 'caption', 'sign_language']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"지원하지 않는 파일 타입입니다: {file_type}"
        )
    
    # 영화 정보 조회
    db_movie = db.get(Movie, movie_id)
    if not db_movie:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Movie with id {movie_id} not found"
        )
    
    # 파일 정보 확인
    s3_key = None
    if file_type == 'signature':
        if not db_movie.signature_s3_directory or not db_movie.signature_s3_filename:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Movie {movie_id} does not have a signature file"
            )
        s3_key = f"{db_movie.signature_s3_directory}{db_movie.signature_s3_filename}"
    
    # TODO: 접근성 파일 처리 (추후 구현)
    
    if not s3_key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"File not found for movie {movie_id} and type {file_type}"
        )
    
    # Presigned URL 생성
    presigned_url = generate_presigned_url(settings.PRIVATE_BUCKET_NAME, s3_key, expiration)
    if not presigned_url:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate presigned URL"
        )
    
    return {
        "url": presigned_url,
        "expires_in": expiration,
        "file_type": file_type,
        "movie_id": movie_id
    }


# --- 파일 삭제 엔드포인트 ---
@router.delete("/movies/{movie_id}/files/{file_type}")
def delete_movie_file(
    movie_id: int,
    file_type: str,
    db: Session = Depends(get_db)
):
    """영화의 특정 파일 삭제"""
    
    # 지원하는 파일 타입 확인
    if file_type not in ['poster', 'signature']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"지원하지 않는 파일 타입입니다: {file_type}"
        )
    
    # 영화 정보 조회
    db_movie = db.get(Movie, movie_id)
    if not db_movie:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Movie with id {movie_id} not found"
        )
    
    try:
        if file_type == 'poster':
            if db_movie.poster_original_rendition_id:
                # 이미지 렌디션 정보 조회
                rendition = db.get(ImageRendition, db_movie.poster_original_rendition_id)
                if rendition:
                    # S3에서 파일 삭제
                    s3_key = f"{rendition.s3_directory}{rendition.s3_filename}"
                    try:
                        s3_client.delete_object(Bucket=settings.PUBLIC_BUCKET_NAME, Key=s3_key)
                    except ClientError as e:
                        print(f"S3 파일 삭제 실패: {e}")
                    
                    # DB에서 렌디션 정보 삭제
                    db.delete(rendition)
                    
                # Movie 레코드 업데이트
                db_movie.poster_original_rendition_id = None
                
        elif file_type == 'signature':
            if db_movie.signature_s3_filename:
                # S3에서 파일 삭제
                s3_key = f"{db_movie.signature_s3_directory}{db_movie.signature_s3_filename}"
                try:
                    s3_client.delete_object(Bucket=settings.PRIVATE_BUCKET_NAME, Key=s3_key)
                except ClientError as e:
                    print(f"S3 파일 삭제 실패: {e}")
                
                # Movie 레코드 업데이트
                db_movie.signature_s3_directory = None
                db_movie.signature_s3_filename = None
                db_movie.original_signature_filename = None
                db_movie.signature_upload_time = None
                db_movie.signature_file_size = None
        
        db.commit()
        return {"message": f"{file_type} 파일이 성공적으로 삭제되었습니다."}
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"파일 삭제 중 오류 발생: {str(e)}"
        )
