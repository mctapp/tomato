# app/routes/file_server.py
from fastapi import APIRouter, HTTPException, Response, Depends, Path
from fastapi.responses import StreamingResponse
from sqlmodel import Session
from app.db import get_session
from app.models.file_assets import FileAsset
import io
import logging
import os
from datetime import datetime
import boto3
from botocore.exceptions import ClientError

router = APIRouter(
    prefix="/api/files",
    tags=["Files"]
)

# S3 클라이언트 설정
S3_BUCKET = os.getenv("PUBLIC_BUCKET_NAME", "tomato-public")
PRIVATE_BUCKET = os.getenv("PRIVATE_BUCKET_NAME", "tomato-private")
AWS_REGION = os.getenv("AWS_REGION", "ap-northeast-2")

try:
    s3_client = boto3.client('s3',
        aws_access_key_id=os.environ.get("AWS_ACCESS_KEY_ID"),
        aws_secret_access_key=os.environ.get("AWS_SECRET_ACCESS_KEY"),
        region_name=AWS_REGION
    )
    logging.info(f"S3 client created for region {AWS_REGION}.")
except Exception as e:
    logging.error(f"Failed to create S3 client: {e}")
    s3_client = None

logger = logging.getLogger(__name__)

@router.get("/by-id/{file_id}")
async def serve_file_by_id(
    file_id: int = Path(..., description="파일 ID"),
    db: Session = Depends(get_session)
):
    """파일 ID로 파일을 조회하여 스트리밍합니다."""
    if not s3_client:
        raise HTTPException(status_code=503, detail="S3 service is unavailable.")
    
    # FileAsset 조회
    file_asset = db.get(FileAsset, file_id)
    if not file_asset:
        raise HTTPException(status_code=404, detail=f"File not found with id: {file_id}")
    
    # 활성 상태 확인
    if file_asset.status != "active":
        raise HTTPException(status_code=404, detail=f"File is not active: {file_id}")
    
    # S3 key와 bucket 결정
    s3_key = file_asset.s3_key
    bucket = S3_BUCKET if file_asset.is_public else PRIVATE_BUCKET
    
    try:
        logger.info(f"Serving file by ID {file_id}: {s3_key} from bucket {bucket}")
        
        # S3에서 파일 가져오기
        response = s3_client.get_object(Bucket=bucket, Key=s3_key)
        content = response['Body'].read()
        content_type = file_asset.content_type or response.get('ContentType', 'application/octet-stream')
        
        # 미디어 타입에 따른 적절한 처리
        headers = {
            'Accept-Ranges': 'bytes',
            'Content-Disposition': f'inline; filename="{file_asset.original_filename or os.path.basename(s3_key)}"',
            'Content-Length': str(file_asset.file_size or len(content))
        }
        
        # 오디오/비디오/자막 파일 처리
        if content_type.startswith(('audio/', 'video/')) or \
           s3_key.endswith(('.mp3', '.m4a', '.wav', '.mp4', '.webm')):
            # 오디오/비디오 파일은 전체 콘텐츠로 응답
            return Response(
                content=content,
                media_type=content_type,
                headers=headers
            )
        else:
            # 기타 파일은 스트리밍 응답으로 처리
            return StreamingResponse(
                io.BytesIO(content),
                media_type=content_type,
                headers=headers
            )
            
    except ClientError as e:
        error_code = e.response.get('Error', {}).get('Code', '')
        if error_code == 'NoSuchKey':
            logger.error(f"File not found in S3: {s3_key}")
            raise HTTPException(status_code=404, detail=f"File not found in storage: {s3_key}")
        else:
            logger.error(f"S3 client error: {e}")
            raise HTTPException(status_code=500, detail=f"S3 error: {str(e)}")
    except Exception as e:
        logger.error(f"Error serving file by ID: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/{path:path}")
async def serve_s3_file(path: str):
    """S3 경로로 직접 파일을 가져와 스트리밍합니다. (레거시 지원)"""
    if not s3_client:
        raise HTTPException(status_code=503, detail="S3 service is unavailable.")
    
    try:
        logger.info(f"Serving S3 file: {path}")
        try:
            # S3에서 파일 가져오기
            response = s3_client.get_object(Bucket=S3_BUCKET, Key=path)
            content = response['Body'].read()
            content_type = response.get('ContentType', 'application/octet-stream')
            
            # 미디어 타입에 따른 적절한 처리
            headers = {
                'Accept-Ranges': 'bytes',
                'Content-Disposition': f'inline; filename="{os.path.basename(path)}"'
            }
            
            # 오디오/비디오/자막 파일 처리
            if content_type.startswith(('audio/', 'video/')) or \
               path.endswith(('.mp3', '.m4a', '.wav', '.mp4', '.webm')):
                # 오디오/비디오 파일은 전체 콘텐츠로 응답
                return Response(
                    content=content,
                    media_type=content_type,
                    headers=headers
                )
            else:
                # 기타 파일은 스트리밍 응답으로 처리
                return StreamingResponse(
                    io.BytesIO(content),
                    media_type=content_type,
                    headers=headers
                )
                
        except ClientError as e:
            error_code = e.response.get('Error', {}).get('Code', '')
            if error_code == 'NoSuchKey':
                logger.error(f"File not found: {path}")
                raise HTTPException(status_code=404, detail=f"File not found: {path}")
            else:
                logger.error(f"S3 client error: {e}")
                raise HTTPException(status_code=500, detail=f"S3 error: {str(e)}")
    except Exception as e:
        logger.error(f"Error serving S3 file: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")
