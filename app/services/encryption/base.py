# app/services/encryption/base.py
"""암호화 서비스 베이스 클래스"""

from abc import ABC, abstractmethod
from typing import Optional, Dict, Any, List
from datetime import datetime
import json

class EncryptionService(ABC):
    """암호화 서비스 추상 클래스"""
    
    @abstractmethod
    async def encrypt(self, data: bytes, context: Optional[Dict[str, str]] = None) -> bytes:
        """데이터 암호화"""
        pass
    
    @abstractmethod
    async def decrypt(self, data: bytes, context: Optional[Dict[str, str]] = None) -> bytes:
        """데이터 복호화"""
        pass
    
    @abstractmethod
    async def encrypt_string(self, data: str, context: Optional[Dict[str, str]] = None) -> str:
        """문자열 암호화 (Base64 인코딩된 결과 반환)"""
        pass
    
    @abstractmethod
    async def decrypt_string(self, data: str, context: Optional[Dict[str, str]] = None) -> str:
        """문자열 복호화 (Base64 인코딩된 입력)"""
        pass
    
    @abstractmethod
    async def generate_data_key(self) -> tuple[bytes, bytes]:
        """데이터 암호화 키 생성 (plaintext, encrypted)"""
        pass
    
    @abstractmethod
    async def rotate_keys(self) -> None:
        """암호화 키 로테이션"""
        pass
    
    @abstractmethod
    async def get_key_info(self) -> Dict[str, Any]:
        """현재 키 정보 조회"""
        pass

class EncryptionMetadata:
    """암호화 메타데이터"""
    
    def __init__(self, 
                 key_id: str,
                 algorithm: str,
                 encrypted_at: datetime,
                 context: Optional[Dict[str, str]] = None):
        self.key_id = key_id
        self.algorithm = algorithm
        self.encrypted_at = encrypted_at
        self.context = context or {}
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "key_id": self.key_id,
            "algorithm": self.algorithm,
            "encrypted_at": self.encrypted_at.isoformat(),
            "context": self.context
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'EncryptionMetadata':
        return cls(
            key_id=data["key_id"],
            algorithm=data["algorithm"],
            encrypted_at=datetime.fromisoformat(data["encrypted_at"]),
            context=data.get("context", {})
        )
    
    def to_json(self) -> str:
        return json.dumps(self.to_dict())
    
    @classmethod
    def from_json(cls, json_str: str) -> 'EncryptionMetadata':
        return cls.from_dict(json.loads(json_str))
