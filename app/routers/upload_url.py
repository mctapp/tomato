from fastapi import APIRouter, HTTPException
import boto3
from botocore.exceptions import ClientError
from app.config import settings

router = APIRouter()

s3_client = boto3.client(
    's3',
    aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
    aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
    region_name=settings.AWS_REGION
)

@router.get("/upload-url")
def get_presigned_upload_url(key: str):
    bucket_name = settings.PRIVATE_BUCKET_NAME

    try:
        presigned_url = s3_client.generate_presigned_url(
            'put_object',
            Params={
                'Bucket': bucket_name,
                'Key': key,
                'ContentType': 'application/octet-stream'
            },
            ExpiresIn=3600
        )

        return {"url": presigned_url}

    except ClientError as e:
        raise HTTPException(status_code=500, detail=str(e))
