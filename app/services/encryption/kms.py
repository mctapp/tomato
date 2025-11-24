# app/services/encryption/kms.py
"""AWS KMS 암호화 서비스"""

import boto3
from botocore.exceptions import ClientError
import base64
import json
from typing import Optional, Dict, Any
from datetime import datetime
import logging

from app.core.config import settings
from .base import EncryptionService, EncryptionMetadata

logger = logging.getLogger(__name__)

class KMSEncryptionService(EncryptionService):
    """AWS KMS를 사용한 암호화 서비스"""
    
    def __init__(self, key_id: Optional[str] = None):
        # KMS 클라이언트 초기화
        self.kms_client = boto3.client(
            'kms',
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,  # .get_secret_value() 제거
            region_name=getattr(settings, 'AWS_KMS_KEY_REGION', settings.AWS_REGION)
        )
        
        # KMS 키 ID 설정
        self.key_id = key_id or getattr(settings, 'AWS_KMS_KEY_ID', 'alias/tomato-encryption')
        
        # 키 유효성 검증
        self._validate_key()
    
    def _validate_key(self):
        """KMS 키 유효성 검증"""
        try:
            response = self.kms_client.describe_key(KeyId=self.key_id)
            if not response['KeyMetadata']['Enabled']:
                raise Exception(f"KMS key {self.key_id} is not enabled")
            logger.info(f"KMS key validated: {self.key_id}")
        except ClientError as e:
            logger.error(f"KMS key validation error: {e}")
            raise Exception(f"KMS 키 검증 실패: {str(e)}")
    
    async def encrypt(self, data: bytes, context: Optional[Dict[str, str]] = None) -> bytes:
        """KMS를 사용한 데이터 암호화"""
        try:
            kwargs = {
                'KeyId': self.key_id,
                'Plaintext': data
            }
            
            # 암호화 컨텍스트 추가 (추가 보안)
            if context:
                kwargs['EncryptionContext'] = context
            
            # KMS 암호화 실행
            response = self.kms_client.encrypt(**kwargs)
            
            # 메타데이터 생성
            metadata = EncryptionMetadata(
                key_id=self.key_id,
                algorithm="AWS_KMS",
                encrypted_at=datetime.utcnow(),
                context=context
            )
            
            # 메타데이터와 암호화된 데이터 결합
            result = {
                "metadata": metadata.to_dict(),
                "ciphertext": base64.b64encode(response['CiphertextBlob']).decode('utf-8')
            }
            
            return json.dumps(result).encode('utf-8')
            
        except ClientError as e:
            logger.error(f"KMS encryption error: {e}")
            raise Exception(f"암호화 실패: {str(e)}")
    
    async def decrypt(self, data: bytes, context: Optional[Dict[str, str]] = None) -> bytes:
        """KMS를 사용한 데이터 복호화"""
        try:
            # JSON 파싱
            data_dict = json.loads(data.decode('utf-8'))
            
            # 메타데이터 추출
            metadata = EncryptionMetadata.from_dict(data_dict['metadata'])
            
            # 암호문 디코딩
            ciphertext_blob = base64.b64decode(data_dict['ciphertext'])
            
            kwargs = {
                'CiphertextBlob': ciphertext_blob
            }
            
            # 컨텍스트 검증 (제공된 경우)
            if metadata.context or context:
                kwargs['EncryptionContext'] = metadata.context or context
            
            # KMS 복호화 실행
            response = self.kms_client.decrypt(**kwargs)
            
            return response['Plaintext']
            
        except ClientError as e:
            logger.error(f"KMS decryption error: {e}")
            raise Exception(f"복호화 실패: {str(e)}")
        except (json.JSONDecodeError, KeyError) as e:
            logger.error(f"Invalid encrypted data format: {e}")
            raise Exception(f"잘못된 암호화 데이터 형식")
    
    async def encrypt_string(self, data: str, context: Optional[Dict[str, str]] = None) -> str:
        """문자열 암호화"""
        encrypted = await self.encrypt(data.encode('utf-8'), context)
        return base64.b64encode(encrypted).decode('utf-8')
    
    async def decrypt_string(self, data: str, context: Optional[Dict[str, str]] = None) -> str:
        """문자열 복호화"""
        encrypted_bytes = base64.b64decode(data)
        decrypted = await self.decrypt(encrypted_bytes, context)
        return decrypted.decode('utf-8')
    
    async def generate_data_key(self) -> tuple[bytes, bytes]:
        """데이터 암호화 키 생성"""
        try:
            response = self.kms_client.generate_data_key(
                KeyId=self.key_id,
                KeySpec='AES_256'  # 256비트 AES 키
            )
            return response['Plaintext'], response['CiphertextBlob']
        except ClientError as e:
            logger.error(f"KMS generate data key error: {e}")
            raise Exception(f"데이터 키 생성 실패: {str(e)}")
    
    async def generate_data_key_without_plaintext(self) -> bytes:
        """평문 없이 암호화된 데이터 키만 생성"""
        try:
            response = self.kms_client.generate_data_key_without_plaintext(
                KeyId=self.key_id,
                KeySpec='AES_256'
            )
            return response['CiphertextBlob']
        except ClientError as e:
            logger.error(f"KMS generate data key without plaintext error: {e}")
            raise Exception(f"암호화된 데이터 키 생성 실패: {str(e)}")
    
    async def rotate_keys(self) -> None:
        """KMS 키 로테이션 활성화"""
        try:
            # KMS 키의 자동 로테이션 활성화
            self.kms_client.enable_key_rotation(KeyId=self.key_id)
            logger.info(f"Key rotation enabled for {self.key_id}")
        except ClientError as e:
            logger.error(f"KMS key rotation error: {e}")
            raise Exception(f"키 로테이션 실패: {str(e)}")
    
    async def get_key_info(self) -> Dict[str, Any]:
        """현재 키 정보 조회"""
        try:
            response = self.kms_client.describe_key(KeyId=self.key_id)
            key_metadata = response['KeyMetadata']
            
            # 로테이션 상태 확인
            rotation_status = self.kms_client.get_key_rotation_status(KeyId=self.key_id)
            
            return {
                "key_id": key_metadata['KeyId'],
                "arn": key_metadata['Arn'],
                "creation_date": key_metadata['CreationDate'].isoformat(),
                "enabled": key_metadata['Enabled'],
                "key_state": key_metadata['KeyState'],
                "key_usage": key_metadata['KeyUsage'],
                "key_spec": key_metadata.get('KeySpec', 'SYMMETRIC_DEFAULT'),
                "origin": key_metadata['Origin'],
                "key_manager": key_metadata['KeyManager'],
                "multi_region": key_metadata.get('MultiRegion', False),
                "rotation_enabled": rotation_status['KeyRotationEnabled']
            }
        except ClientError as e:
            logger.error(f"KMS describe key error: {e}")
            raise Exception(f"키 정보 조회 실패: {str(e)}")
    
    async def re_encrypt(self, ciphertext_blob: bytes, 
                        new_key_id: Optional[str] = None,
                        new_context: Optional[Dict[str, str]] = None) -> bytes:
        """다른 키로 재암호화"""
        try:
            kwargs = {
                'CiphertextBlob': ciphertext_blob,
                'DestinationKeyId': new_key_id or self.key_id
            }
            
            if new_context:
                kwargs['DestinationEncryptionContext'] = new_context
            
            response = self.kms_client.re_encrypt(**kwargs)
            return response['CiphertextBlob']
            
        except ClientError as e:
            logger.error(f"KMS re-encrypt error: {e}")
            raise Exception(f"재암호화 실패: {str(e)}")
