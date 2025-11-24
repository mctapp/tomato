# app/routes/upload.py
from fastapi import APIRouter, UploadFile, File, Form, Query
from fastapi.responses import JSONResponse
from uuid import uuid4
import boto3
import os

router = APIRouter()

s3 = boto3.client(
    "s3",
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
    aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
    region_name=os.getenv("AWS_REGION"),
)
BUCKET = os.getenv("AWS_BUCKET_NAME")

@router.get("/upload-url")
def get_presigned_url(key: str = Query(...)):
    url = s3.generate_presigned_url(
        ClientMethod="put_object",
        Params={"Bucket": BUCKET, "Key": key},
        ExpiresIn=3600,
    )
    return {"url": url}

@router.post("/upload-poster")
async def upload_poster(file: UploadFile = File(...), filename: str = Form(...)):
    s3_key = f"po/{uuid4().hex}_{filename}"
    contents = await file.read()
    s3.put_object(
        Bucket=BUCKET,
        Key=s3_key,
        Body=contents,
        ACL="public-read",
        ContentType=file.content_type
    )
    return JSONResponse({"filename": s3_key})
