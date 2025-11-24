# app/auth/mfa/totp.py
import pyotp
import qrcode
import io
import base64
from typing import Optional
from pydantic import BaseModel

class TOTPSetup(BaseModel):
    secret: str
    qr_code: str
    provisioning_uri: str

class TOTPProvider:
    def __init__(self, issuer_name: str = "Tomato System"):
        self.issuer_name = issuer_name
    
    async def setup_totp(self, user_id: int, user_email: Optional[str] = None) -> TOTPSetup:
        """TOTP 설정을 위한 시크릿과 QR 코드 생성"""
        # 32자 시크릿 생성 (Base32 인코딩)
        secret = pyotp.random_base32()
        
        # TOTP 객체 생성
        totp = pyotp.TOTP(secret)
        
        # Provisioning URI 생성
        # 사용자 이메일이나 ID를 label로 사용
        label = user_email if user_email else f"user_{user_id}"
        provisioning_uri = totp.provisioning_uri(
            name=label,
            issuer_name=self.issuer_name
        )
        
        # QR 코드 생성
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        qr.add_data(provisioning_uri)
        qr.make(fit=True)
        
        # QR 코드를 이미지로 변환
        img = qr.make_image(fill_color="black", back_color="white")
        
        # 이미지를 Base64로 인코딩
        buffered = io.BytesIO()
        img.save(buffered, format="PNG")
        img_str = base64.b64encode(buffered.getvalue()).decode()
        qr_code_data_url = f"data:image/png;base64,{img_str}"
        
        return TOTPSetup(
            secret=secret,
            qr_code=provisioning_uri,  # URI를 직접 전달
            provisioning_uri=provisioning_uri
        )
    
    def verify_totp(self, secret: str, token: str) -> bool:
        """TOTP 토큰 검증"""
        try:
            totp = pyotp.TOTP(secret)
            # 시간 오차를 고려하여 valid_window 설정
            return totp.verify(token, valid_window=1)
        except Exception:
            return False
