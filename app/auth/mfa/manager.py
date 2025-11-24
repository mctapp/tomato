# app/auth/mfa/manager.py
from typing import Optional, Dict, Any
from app.auth.mfa.totp import TOTPProvider
from app.auth.mfa.sms import SMSService
from app.models.users import MFAType
from app.db import get_session
from app.models.users import User
from app.services.encryption.field_encryption import field_encryption_service
import secrets
import json

class MFAManager:
    def __init__(self):
        self.totp_provider = TOTPProvider()
        self.sms_provider = SMSService()
    
    async def initiate_mfa(self, user_id: int, mfa_type: MFAType) -> str:
        """MFA 프로세스 시작 및 임시 토큰 반환"""
        # 임시 MFA 토큰 생성
        mfa_token = secrets.token_urlsafe(32)
        return mfa_token
    
    async def verify_mfa(self, user_id: int, code: str) -> bool:
        """MFA 코드 검증"""
        # 사용자 정보 조회
        from sqlmodel import Session, select
        from app.db import engine
        
        with Session(engine) as session:
            user = session.exec(select(User).where(User.id == user_id)).first()
            if not user:
                return False
            
            if user.mfa_type == MFAType.TOTP:
                if not user.mfa_secret:
                    return False
                
                # 암호화된 시크릿 복호화
                decrypted_secret = await field_encryption_service.decrypt_field(user.mfa_secret)
                
                # TOTP 검증
                return self.totp_provider.verify_totp(decrypted_secret, code)
            
            elif user.mfa_type == MFAType.SMS:
                # SMS 검증 로직
                return await self.sms_provider.verify_code(user_id, code)
            
            # 백업 코드 확인
            if user.mfa_backup_codes:
                decrypted_codes = await field_encryption_service.decrypt_field(user.mfa_backup_codes)
                backup_codes = json.loads(decrypted_codes)
                
                if code in backup_codes:
                    # 사용된 백업 코드 제거
                    backup_codes.remove(code)
                    encrypted_codes = await field_encryption_service.encrypt_field(
                        json.dumps(backup_codes)
                    )
                    user.mfa_backup_codes = encrypted_codes
                    session.add(user)
                    session.commit()
                    return True
            
            return False
