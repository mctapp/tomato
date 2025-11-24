from pydantic import BaseModel
from typing import Optional, List
from app.models.users import MFAType

class MFASetupRequest(BaseModel):
    mfa_type: MFAType
    phone_number: Optional[str] = None  # SMS인 경우 필요

class MFASetupResponse(BaseModel):
    mfa_type: MFAType
    qr_code: Optional[str] = None  # TOTP인 경우 QR 코드
    secret: Optional[str] = None   # TOTP 수동 입력용
    backup_codes: List[str]        # 백업 코드
    message: str

class MFAVerifyRequest(BaseModel):
    code: str
    mfa_token: Optional[str] = None  # 로그인 시 받은 임시 토큰

class MFALoginResponse(BaseModel):
    requires_mfa: bool
    mfa_token: Optional[str] = None
    mfa_type: Optional[MFAType] = None
    message: str

class MFAStatusResponse(BaseModel):
    mfa_enabled: bool
    mfa_type: MFAType
    backup_codes_count: int
