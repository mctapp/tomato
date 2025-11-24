# app/services/encryption/factory.py
"""암호화 서비스 팩토리"""

from typing import Optional
import logging

from .base import EncryptionService
from .kms import KMSEncryptionService

logger = logging.getLogger(__name__)

_encryption_service: Optional[EncryptionService] = None

def get_encryption_service() -> EncryptionService:
    """암호화 서비스 인스턴스 반환 (싱글톤)"""
    global _encryption_service
    
    if _encryption_service is None:
        logger.info("Initializing AWS KMS encryption service")
        _encryption_service = KMSEncryptionService()
    
    return _encryption_service

def reset_encryption_service():
    """암호화 서비스 리셋 (테스트용)"""
    global _encryption_service
    _encryption_service = None

def validate_encryption_service() -> bool:
    """암호화 서비스 검증"""
    try:
        service = get_encryption_service()
        # 간단한 테스트 수행
        import asyncio
        
        async def test():
            test_data = "test"
            encrypted = await service.encrypt_string(test_data)
            decrypted = await service.decrypt_string(encrypted)
            return test_data == decrypted
        
        loop = asyncio.new_event_loop()
        result = loop.run_until_complete(test())
        loop.close()
        
        if result:
            logger.info("Encryption service validation successful")
        else:
            logger.error("Encryption service validation failed")
        
        return result
        
    except Exception as e:
        logger.error(f"Encryption service validation error: {e}")
        return False
