# app/services/encryption/field_encryption.py
"""필드 레벨 암호화 서비스"""

import json
from typing import Any, Dict, List, Optional, Type, Union
from sqlalchemy import event, Column, String
from sqlalchemy.ext.hybrid import hybrid_property
from sqlalchemy.orm import Session
from sqlmodel import SQLModel, Field
import logging
import asyncio
from functools import wraps

from .factory import get_encryption_service

logger = logging.getLogger(__name__)

def run_async(coro):
    """비동기 함수를 동기적으로 실행"""
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    
    return loop.run_until_complete(coro)

class EncryptedField:
    """암호화된 필드를 위한 디스크립터"""
    
    def __init__(self, field_name: str, context_fields: Optional[List[str]] = None):
        self.field_name = field_name
        # 언더스코어 없이 _encrypted 접미사만 추가
        self._encrypted_field_name = f"{field_name}_encrypted"
        self.context_fields = context_fields or []
        self._encryption_service = None
    
    @property
    def encryption_service(self):
        if self._encryption_service is None:
            self._encryption_service = get_encryption_service()
        return self._encryption_service
    
    def __get__(self, obj, type=None):
        if obj is None:
            return self
        
        encrypted_value = getattr(obj, self._encrypted_field_name, None)
        if encrypted_value is None:
            return None
        
        try:
            # 컨텍스트 생성
            context = self._build_context(obj)
            
            # 비동기 함수를 동기적으로 실행
            decrypted = run_async(
                self.encryption_service.decrypt_string(encrypted_value, context)
            )
            return decrypted
        except Exception as e:
            logger.error(f"Decryption error for field {self.field_name}: {e}")
            return None
    
    def __set__(self, obj, value):
        if value is None:
            setattr(obj, self._encrypted_field_name, None)
            return
        
        try:
            # 컨텍스트 생성
            context = self._build_context(obj)
            
            # 비동기 함수를 동기적으로 실행
            encrypted = run_async(
                self.encryption_service.encrypt_string(str(value), context)
            )
            setattr(obj, self._encrypted_field_name, encrypted)
        except Exception as e:
            logger.error(f"Encryption error for field {self.field_name}: {e}")
            raise
    
    def _build_context(self, obj) -> Dict[str, str]:
        """암호화 컨텍스트 생성"""
        context = {}
        
        # 기본 컨텍스트
        context['table'] = obj.__tablename__ if hasattr(obj, '__tablename__') else 'unknown'
        context['field'] = self.field_name
        
        # 추가 컨텍스트 필드
        for field in self.context_fields:
            value = getattr(obj, field, None)
            if value is not None:
                context[field] = str(value)
        
        return context

class FieldEncryptionService:
    """필드 레벨 암호화 서비스"""
    
    def __init__(self):
        self.encryption_service = get_encryption_service()
    
    async def encrypt_field(self, data: str) -> str:
        """단일 필드 암호화 (간단한 인터페이스)"""
        if not data:
            return data
        return await self.encryption_service.encrypt_string(data, {})
    
    async def decrypt_field(self, data: str) -> str:
        """단일 필드 복호화 (간단한 인터페이스)"""
        if not data:
            return data
        return await self.encryption_service.decrypt_string(data, {})
    
    async def encrypt_dict(self, data: Dict[str, Any], 
                          fields_to_encrypt: List[str],
                          context: Optional[Dict[str, str]] = None) -> Dict[str, Any]:
        """딕셔너리의 특정 필드 암호화"""
        encrypted_data = data.copy()
        
        for field in fields_to_encrypt:
            if field in encrypted_data and encrypted_data[field] is not None:
                # 필드별 컨텍스트 생성
                field_context = (context or {}).copy()
                field_context['field'] = field
                
                # 암호화
                encrypted_value = await self.encryption_service.encrypt_string(
                    str(encrypted_data[field]),
                    field_context
                )
                
                # 암호화된 값 저장
                encrypted_data[f"{field}_encrypted"] = encrypted_value
                # 원본 필드는 마스킹
                encrypted_data[field] = "***ENCRYPTED***"
        
        return encrypted_data
    
    async def decrypt_dict(self, data: Dict[str, Any], 
                          fields_to_decrypt: List[str],
                          context: Optional[Dict[str, str]] = None) -> Dict[str, Any]:
        """딕셔너리의 특정 필드 복호화"""
        decrypted_data = data.copy()
        
        for field in fields_to_decrypt:
            encrypted_field = f"{field}_encrypted"
            if encrypted_field in decrypted_data and decrypted_data[encrypted_field] is not None:
                # 필드별 컨텍스트 생성
                field_context = (context or {}).copy()
                field_context['field'] = field
                
                # 복호화
                decrypted_value = await self.encryption_service.decrypt_string(
                    decrypted_data[encrypted_field],
                    field_context
                )
                
                # 복호화된 값 저장
                decrypted_data[field] = decrypted_value
                # 암호화된 필드는 제거
                del decrypted_data[encrypted_field]
        
        return decrypted_data
    
    async def encrypt_model_fields(self, model_instance: SQLModel, 
                                  fields: List[str],
                                  context: Optional[Dict[str, str]] = None) -> SQLModel:
        """모델 인스턴스의 특정 필드 암호화"""
        base_context = (context or {}).copy()
        base_context['table'] = model_instance.__tablename__
        
        for field in fields:
            value = getattr(model_instance, field, None)
            if value is not None:
                # 필드별 컨텍스트
                field_context = base_context.copy()
                field_context['field'] = field
                
                # 암호화
                encrypted_value = await self.encryption_service.encrypt_string(
                    str(value), field_context
                )
                
                # 암호화된 값을 별도 필드에 저장
                setattr(model_instance, f"{field}_encrypted", encrypted_value)
                # 원본 필드는 None으로 설정
                setattr(model_instance, field, None)
        
        return model_instance
    
    async def decrypt_model_fields(self, model_instance: SQLModel, 
                                  fields: List[str],
                                  context: Optional[Dict[str, str]] = None) -> SQLModel:
        """모델 인스턴스의 특정 필드 복호화"""
        base_context = (context or {}).copy()
        base_context['table'] = model_instance.__tablename__
        
        for field in fields:
            encrypted_field = f"{field}_encrypted"
            encrypted_value = getattr(model_instance, encrypted_field, None)
            if encrypted_value is not None:
                # 필드별 컨텍스트
                field_context = base_context.copy()
                field_context['field'] = field
                
                # 복호화
                decrypted_value = await self.encryption_service.decrypt_string(
                    encrypted_value, field_context
                )
                setattr(model_instance, field, decrypted_value)
        
        return model_instance
    
    async def rotate_field_encryption(self, model_class: Type[SQLModel],
                                     fields: List[str],
                                     db_session: Session,
                                     batch_size: int = 100):
        """특정 모델의 암호화된 필드 재암호화 (키 로테이션)"""
        offset = 0
        
        while True:
            # 배치 단위로 처리
            instances = db_session.query(model_class).offset(offset).limit(batch_size).all()
            if not instances:
                break
            
            for instance in instances:
                # 각 필드 재암호화
                for field in fields:
                    encrypted_field = f"{field}_encrypted"
                    encrypted_value = getattr(instance, encrypted_field, None)
                    
                    if encrypted_value:
                        # 복호화 후 재암호화
                        context = {'table': model_class.__tablename__, 'field': field}
                        decrypted = await self.encryption_service.decrypt_string(
                            encrypted_value, context
                        )
                        new_encrypted = await self.encryption_service.encrypt_string(
                            decrypted, context
                        )
                        setattr(instance, encrypted_field, new_encrypted)
            
            db_session.commit()
            offset += batch_size
            
            logger.info(f"Rotated encryption for {len(instances)} {model_class.__name__} records")

# 암호화가 필요한 필드 설정
ENCRYPTED_FIELDS_CONFIG = {
    "User": {
        "fields": ["phone_number", "address", "social_security_number"],
        "context_fields": ["id", "email"]
    },
    "AccessAsset": {
        "fields": ["sensitive_notes", "internal_comments"],
        "context_fields": ["id", "movie_id"]
    },
    "DistributorContact": {
        "fields": ["phone", "mobile", "personal_email"],
        "context_fields": ["id", "distributor_id"]
    }
}

def create_encrypted_model_mixin(fields: List[str], context_fields: Optional[List[str]] = None):
    """암호화 필드를 가진 Mixin 클래스 생성"""
    
    class EncryptedFieldsMixin:
        pass
    
    # 각 필드에 대해 암호화된 저장 필드와 property 생성
    for field in fields:
        # 암호화된 데이터를 저장할 실제 컬럼 (언더스코어 없이)
        setattr(
            EncryptedFieldsMixin, 
            f"{field}_encrypted", 
            Column(String, nullable=True)
        )
        
        # 암호화/복호화를 처리하는 디스크립터
        setattr(
            EncryptedFieldsMixin, 
            field, 
            EncryptedField(field, context_fields)
        )
    
    return EncryptedFieldsMixin

# 사용 예제: 암호화된 사용자 모델
def create_encrypted_user_model():
    """암호화 필드가 포함된 User 모델 예제"""
    
    from app.models.users import User as BaseUser
    from sqlalchemy import Column, String
    
    # 암호화 필드 Mixin 생성
    EncryptedMixin = create_encrypted_model_mixin(
        fields=["phone_number", "address"],
        context_fields=["id", "email"]
    )
    
    class UserWithEncryption(BaseUser, EncryptedMixin):
        __tablename__ = "users"  # 기존 테이블 사용
        
        # 암호화된 데이터 저장용 컬럼 추가 (언더스코어 없이)
        phone_number_encrypted = Column(String, nullable=True)
        address_encrypted = Column(String, nullable=True)
    
    return UserWithEncryption

# 전역 인스턴스 생성
field_encryption_service = FieldEncryptionService()
