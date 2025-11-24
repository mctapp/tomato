# app/routes/admin_moviefiles.py
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, status
from sqlmodel import Session
from typing import Optional
from datetime import datetime
import uuid
import os
import boto3
import logging

from app.db import get_db
from app.models.movie_files import MovieFile
from app.config import settings

router = APIRouter(
    prefix="/admin/moviefiles",
    tags=["Movie Files Upload"]
)

# 로거 설정
logger = logging.getLogger(__name__)

# S3 클라이언트 초기화
try:
    s3_client = boto3.client(
        's3',
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        region_name=settings.AWS_REGION,
    )
    logger.info("S3 client initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize S3 client: {e}")
    s3_client = None

@router.post("/", status_code=status.HTTP_201_CREATED)
async def upload_accessibility_file(
    movie_id: int,
    file_type: str,
    language_code: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    접근성 파일 업로드
    - movie_id: 영화 ID
    - file_type: 파일 유형 (ad, cc, sl, intro_audio, intro_text 등)
    - language_code: 언어 코드 (ko, en 등)
    """
    if not s3_client:
        raise HTTPException(status_code=503, detail="S3 service is unavailable")
    
    try:
        # 파일 확장자 추출
        ext = os.path.splitext(file.filename)[1]
        filename = f"{uuid.uuid4()}{ext}"
        s3_directory = f"accessibility/{file_type}/"
        s3_key = f"{s3_directory}{filename}"

        # 파일 크기 계산 (선택적)
        file_size = None
        if hasattr(file, "size"):
            file_size = file.size

        # S3 업로드
        await file.seek(0)
        s3_client.upload_fileobj(
            file.file,
            settings.PUBLIC_BUCKET_NAME,
            s3_key,
            ExtraArgs={"ContentType": file.content_type, "ACL": "public-read"}
        )
        logger.info(f"File uploaded to S3: {s3_key}")

        # DB 저장
        moviefile = MovieFile(
            movie_id=movie_id,
            file_type=file_type,
            language_code=language_code,
            original_filename=file.filename,
            s3_directory=s3_directory,
            s3_filename=filename,
            file_size=file_size,
            upload_time=datetime.utcnow(),
            order_column=1
        )
        db.add(moviefile)
        db.commit()
        db.refresh(moviefile)
        logger.info(f"File record created in DB with ID: {moviefile.id}")

        # 응답 생성
        s3_url = f"https://{settings.PUBLIC_BUCKET_NAME}.s3.{settings.AWS_REGION}.amazonaws.com/{s3_key}"
        return {
            "id": moviefile.id,
            "s3_url": s3_url
        }

    except Exception as e:
        logger.error(f"Error during file upload: {e}")
        raise HTTPException(status_code=500, detail=str(e))
