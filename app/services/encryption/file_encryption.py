# app/services/encryption/file_encryption.py
"""파일 암호화 서비스"""

import os
import tempfile
import shutil
from pathlib import Path
from typing import BinaryIO, Optional, Dict, Tuple
import aiofiles
import hashlib
import logging
import json
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend

from app.config import settings
from app.services.s3_service import S3Service
from .factory import get_encryption_service

logger = logging.getLogger(__name__)

class FileEncryptionService:
    """파일 암호화 서비스 (KMS 데이터 키 사용)"""
    
    def __init__(self):
        self.encryption_service = get_encryption_service()
        self.s3_service = S3Service()
        self.chunk_size = 1024 * 1024  # 1MB chunks
    
    async def encrypt_file(self, 
                          input_file_path: str, 
                          output_file_path: Optional[str] = None,
                          delete_original: bool = False,
                          context: Optional[Dict[str, str]] = None) -> str:
        """파일 암호화 (KMS 데이터 키 사용)"""
        if output_file_path is None:
            output_file_path = f"{input_file_path}.encrypted"
        
        try:
            # KMS에서 데이터 키 생성
            data_key_plain, data_key_encrypted = await self.encryption_service.generate_data_key()
            
            # 파일 해시 계산 (무결성 검증용)
            file_hash = await self._calculate_file_hash(input_file_path)
            
            # 파일 컨텍스트 생성
            file_context = (context or {}).copy()
            file_context.update({
                "filename": os.path.basename(input_file_path),
                "file_hash": file_hash[:16]  # 해시의 일부만 컨텍스트에 포함
            })
            
            # 메타데이터 준비
            metadata = {
                "original_filename": os.path.basename(input_file_path),
                "file_size": os.path.getsize(input_file_path),
                "file_hash": file_hash,
                "encrypted_data_key": data_key_encrypted.hex(),
                "encryption_context": file_context,
                "kms_key_id": self.encryption_service.key_id
            }
            
            # AES-GCM으로 파일 암호화
            key = data_key_plain[:32]  # 256-bit key
            iv = os.urandom(12)  # 96-bit IV for GCM
            
            cipher = Cipher(
                algorithms.AES(key),
                modes.GCM(iv),
                backend=default_backend()
            )
            encryptor = cipher.encryptor()
            
            # 파일 암호화
            async with aiofiles.open(input_file_path, 'rb') as infile:
                async with aiofiles.open(output_file_path, 'wb') as outfile:
                    # 메타데이터를 파일 시작 부분에 작성
                    metadata_json = json.dumps(metadata).encode()
                    metadata_length = len(metadata_json)
                    await outfile.write(metadata_length.to_bytes(4, 'big'))
                    await outfile.write(metadata_json)
                    
                    # IV 저장
                    await outfile.write(iv)
                    
                    # 파일 내용 암호화
                    while chunk := await infile.read(self.chunk_size):
                        encrypted_chunk = encryptor.update(chunk)
                        await outfile.write(encrypted_chunk)
                    
                    # 최종화 및 태그 저장
                    encryptor.finalize()
                    tag = encryptor.tag
                    await outfile.write(tag)
            
            # 원본 파일 삭제 옵션
            if delete_original:
                # 안전한 삭제 (덮어쓰기 후 삭제)
                await self._secure_delete(input_file_path)
            
            logger.info(f"File encrypted: {input_file_path} -> {output_file_path}")
            return output_file_path
            
        except Exception as e:
            logger.error(f"File encryption error: {e}")
            if os.path.exists(output_file_path):
                os.remove(output_file_path)
            raise Exception(f"파일 암호화 실패: {str(e)}")
    
    async def decrypt_file(self,
                          input_file_path: str,
                          output_file_path: Optional[str] = None,
                          verify_hash: bool = True,
                          context: Optional[Dict[str, str]] = None) -> str:
        """파일 복호화"""
        if output_file_path is None:
            output_file_path = input_file_path.replace('.encrypted', '')
        
        try:
            async with aiofiles.open(input_file_path, 'rb') as infile:
                # 메타데이터 읽기
                metadata_length = int.from_bytes(await infile.read(4), 'big')
                metadata_json = await infile.read(metadata_length)
                metadata = json.loads(metadata_json.decode())
                
                # 암호화된 데이터 키 복호화
                encrypted_data_key = bytes.fromhex(metadata['encrypted_data_key'])
                
                # 컨텍스트 검증을 위해 메타데이터의 컨텍스트 사용
                decryption_context = metadata.get('encryption_context', {})
                if context:
                    decryption_context.update(context)
                
                # KMS로 데이터 키 복호화
                data_key_plain = await self.encryption_service.decrypt(
                    encrypted_data_key,
                    decryption_context
                )
                
                # IV 읽기
                iv = await infile.read(12)
                
                # AES-GCM 복호화 준비
                key = data_key_plain[:32]
                
                # 임시 파일에 복호화
                with tempfile.NamedTemporaryFile(delete=False) as temp_file:
                    temp_path = temp_file.name
                
                # 파일 끝에서 태그 읽기 (16 bytes)
                file_size = os.path.getsize(input_file_path)
                tag_position = file_size - 16
                
                async with aiofiles.open(input_file_path, 'rb') as infile:
                    await infile.seek(tag_position)
                    tag = await infile.read(16)
                
                # 암호화된 데이터 읽기 및 복호화
                cipher = Cipher(
                    algorithms.AES(key),
                    modes.GCM(iv, tag),
                    backend=default_backend()
                )
                decryptor = cipher.decryptor()
                
                async with aiofiles.open(input_file_path, 'rb') as infile:
                    # 메타데이터와 IV 건너뛰기
                    await infile.seek(4 + metadata_length + 12)
                    
                    async with aiofiles.open(temp_path, 'wb') as outfile:
                        # 태그 전까지 읽기
                        bytes_to_read = tag_position - infile.tell()
                        
                        while bytes_to_read > 0:
                            chunk_size = min(self.chunk_size, bytes_to_read)
                            chunk = await infile.read(chunk_size)
                            if not chunk:
                                break
                            
                            decrypted_chunk = decryptor.update(chunk)
                            await outfile.write(decrypted_chunk)
                            bytes_to_read -= len(chunk)
                        
                        # 최종화 (태그 검증 포함)
                        decryptor.finalize()
                
                # 해시 검증
                if verify_hash:
                    decrypted_hash = await self._calculate_file_hash(temp_path)
                    if decrypted_hash != metadata['file_hash']:
                        os.remove(temp_path)
                        raise Exception("파일 무결성 검증 실패")
                
                # 최종 위치로 이동
                shutil.move(temp_path, output_file_path)
                
                logger.info(f"File decrypted: {input_file_path} -> {output_file_path}")
                return output_file_path
                
        except Exception as e:
            logger.error(f"File decryption error: {e}")
            if 'temp_path' in locals() and os.path.exists(temp_path):
                os.remove(temp_path)
            raise Exception(f"파일 복호화 실패: {str(e)}")
    
    async def encrypt_and_upload_to_s3(self,
                                      file_path: str,
                                      s3_key: str,
                                      bucket_type: str = "private",
                                      delete_local: bool = True,
                                      metadata: Optional[Dict[str, str]] = None) -> Dict[str, str]:
        """파일을 암호화하고 S3에 업로드"""
        encrypted_file_path = None
        
        try:
            # 컨텍스트 생성
            context = {
                "s3_bucket": bucket_type,
                "s3_key": s3_key
            }
            
            # 파일 암호화
            encrypted_file_path = await self.encrypt_file(file_path, context=context)
            
            # S3 메타데이터 준비
            s3_metadata = metadata or {}
            s3_metadata.update({
                "encryption": "kms",
                "original_filename": os.path.basename(file_path),
                "encrypted": "true"
            })
            
            # S3 업로드
            with open(encrypted_file_path, 'rb') as file:
                s3_url = self.s3_service.upload_file(
                    file=file,
                    key=s3_key,
                    content_type='application/octet-stream',
                    is_public=(bucket_type == "public"),
                    metadata=s3_metadata
                )
            
            # 로컬 파일 정리
            if delete_local:
                os.remove(encrypted_file_path)
                if os.path.exists(file_path):
                    await self._secure_delete(file_path)
            
            return {
                "s3_url": s3_url,
                "s3_key": s3_key,
                "bucket": bucket_type,
                "encrypted": True,
                "original_filename": os.path.basename(file_path),
                "file_size": os.path.getsize(file_path) if os.path.exists(file_path) else None
            }
            
        except Exception as e:
            # 정리
            if encrypted_file_path and os.path.exists(encrypted_file_path):
                os.remove(encrypted_file_path)
            raise e
    
    async def download_and_decrypt_from_s3(self,
                                          s3_key: str,
                                          output_path: str,
                                          bucket_type: str = "private",
                                          verify_hash: bool = True) -> str:
        """S3에서 파일을 다운로드하고 복호화"""
        encrypted_file_path = None
        
        try:
            # S3에서 다운로드
            encrypted_file_path = f"{output_path}.encrypted"
            
            # Presigned URL 생성
            presigned_url = self.s3_service.generate_presigned_url(
                key=s3_key,
                is_public=(bucket_type == "public")
            )
            
            # 파일 다운로드
            import aiohttp
            async with aiohttp.ClientSession() as session:
                async with session.get(presigned_url) as response:
                    response.raise_for_status()
                    
                    async with aiofiles.open(encrypted_file_path, 'wb') as file:
                        async for chunk in response.content.iter_chunked(self.chunk_size):
                            await file.write(chunk)
            
            # 컨텍스트 생성
            context = {
                "s3_bucket": bucket_type,
                "s3_key": s3_key
            }
            
            # 복호화
            await self.decrypt_file(
                encrypted_file_path, 
                output_path,
                verify_hash=verify_hash,
                context=context
            )
            
            # 암호화된 파일 삭제
            os.remove(encrypted_file_path)
            
            return output_path
            
        except Exception as e:
            # 정리
            if encrypted_file_path and os.path.exists(encrypted_file_path):
                os.remove(encrypted_file_path)
            raise e
    
    async def _calculate_file_hash(self, file_path: str) -> str:
        """파일 해시 계산 (SHA-256)"""
        sha256_hash = hashlib.sha256()
        
        async with aiofiles.open(file_path, "rb") as f:
            while chunk := await f.read(self.chunk_size):
                sha256_hash.update(chunk)
        
        return sha256_hash.hexdigest()
    
    async def _secure_delete(self, file_path: str):
        """파일 안전 삭제 (덮어쓰기 후 삭제)"""
        file_size = os.path.getsize(file_path)
        
        async with aiofiles.open(file_path, "r+b") as file:
            # 랜덤 데이터로 3회 덮어쓰기
            for _ in range(3):
                await file.seek(0)
                
                remaining = file_size
                while remaining > 0:
                    chunk_size = min(self.chunk_size, remaining)
                    await file.write(os.urandom(chunk_size))
                    remaining -= chunk_size
                
                await file.flush()
                os.fsync(file.fileno())
        
        # 파일 삭제
        os.remove(file_path)

# 암호화가 필요한 파일 타입 설정
ENCRYPTED_FILE_TYPES = {
    "access_assets": {
        "extensions": [".srt", ".vtt", ".xml", ".json"],
        "description": "자막 및 접근성 파일"
    },
    "sensitive_documents": {
        "extensions": [".pdf", ".doc", ".docx", ".xls", ".xlsx"],
        "description": "민감한 문서"
    },
    "media_files": {
        "extensions": [".mp4", ".mov", ".avi", ".mp3", ".wav"],
        "description": "미디어 파일"
    },
    "personal_data": {
        "extensions": [".csv", ".txt", ".log"],
        "description": "개인정보가 포함될 수 있는 파일"
    }
}

def should_encrypt_file(filename: str) -> bool:
    """파일 암호화 필요 여부 판단"""
    ext = Path(filename).suffix.lower()
    
    for category, config in ENCRYPTED_FILE_TYPES.items():
        if ext in config["extensions"]:
            return True
    
    return False
