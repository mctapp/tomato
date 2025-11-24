from fastapi import APIRouter, UploadFile, File, HTTPException, Query, Depends
from sqlalchemy.orm import Session
from app.db import get_db
from app.models.movies import Movie
from app.models.image_renditions import ImageRendition
from app.config import settings
from uuid import uuid4
import boto3
import os
from PIL import Image
from io import BytesIO

router = APIRouter()

s3_client = boto3.client(
    "s3",
    aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
    aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
    region_name=settings.AWS_REGION
)

def get_image_dimensions(image_bytes: bytes) -> tuple[int, int]:
    image = Image.open(BytesIO(image_bytes))
    return image.width, image.height

@router.post("/upload-poster")
async def upload_poster(
    movie_id: int = Query(..., description="연결할 영화의 ID"),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    # 영화 존재 확인
    movie = db.query(Movie).filter(Movie.id == movie_id).first()
    if not movie:
        raise HTTPException(status_code=404, detail="해당 movie_id가 존재하지 않습니다.")

    # 파일 유효성 체크
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="이미지 파일만 업로드할 수 있습니다.")

    try:
        contents = await file.read()
        width, height = get_image_dimensions(contents)
        ext = os.path.splitext(file.filename)[-1]
        filename = f"{uuid4()}{ext}"
        s3_dir = "po/"
        s3_key = f"{s3_dir}{filename}"

        # S3 업로드
        s3_client.put_object(
            Bucket=settings.PUBLIC_BUCKET_NAME,
            Key=s3_key,
            Body=contents,
            ContentType=file.content_type,
            ACL="public-read"
        )

        # DB 저장 (ImageRendition)
        rendition = ImageRendition(
            movie_id=movie_id,
            rendition_type="poster_original",
            s3_directory=s3_dir,
            s3_filename=filename,
            width=width,
            height=height,
            file_size=len(contents),
            original_name=file.filename,
            mime_type=file.content_type,
            file_extension=ext,
            is_original=True,
            alt_text=movie.title
        )
        db.add(rendition)
        db.commit()
        db.refresh(rendition)

        # movie 테이블에 연결
        movie.poster_original_rendition_id = rendition.id
        db.commit()

        return {
            "poster_original_rendition_id": rendition.id,
            "s3_url": f"https://{settings.PUBLIC_BUCKET_NAME}.s3.{settings.AWS_REGION}.amazonaws.com/{s3_key}",
            "width": width,
            "height": height
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"포스터 업로드 실패: {str(e)}")

