# app/auth/mfa/sms.py
import random
import string
import logging
from datetime import datetime, timedelta
from typing import Optional
import httpx

logger = logging.getLogger(__name__)

class SMSService:
    """SMS OTP 서비스"""
    
    def __init__(self):
        # config import를 try-except로 처리
        try:
            from app.core.config import settings
            self.settings = settings
            self.client = httpx.AsyncClient()
            self.api_key = settings.SMS_API_KEY
            self.sender = settings.SMS_SENDER or settings.TWILIO_FROM_NUMBER
            self.provider = settings.SMS_PROVIDER
        except ImportError:
            # config가 없으면 더미 모드로 동작
            logger.warning("Config not found, running in dummy mode")
            self.settings = None
            self.client = None
            self.api_key = None
            self.sender = None
            self.provider = "dummy"
    
    def generate_code(self, length: int = 6) -> str:
        """SMS 인증 코드 생성"""
        return ''.join(random.choices(string.digits, k=length))
    
    async def send_code(self, phone_number: str, code: str) -> bool:
        """SMS 발송"""
        # 더미 모드
        if self.provider == "dummy" or not self.settings:
            logger.info(f"[SMS Dummy] Sending OTP {code} to {phone_number}")
            print(f"[SMS Dummy] 인증 코드 {code}를 {phone_number}로 발송 (더미)")
            return True
        
        # Twilio 구현
        if self.provider == "twilio":
            return await self._send_twilio(phone_number, code)
        
        # AWS SNS 구현 (추후 구현)
        if self.provider == "aws_sns":
            return await self._send_aws_sns(phone_number, code)
        
        logger.error(f"Unknown SMS provider: {self.provider}")
        return False
    
    async def _send_twilio(self, phone_number: str, code: str) -> bool:
        """Twilio를 통한 SMS 발송"""
        try:
            if not all([self.settings.TWILIO_ACCOUNT_SID, self.settings.TWILIO_AUTH_TOKEN]):
                logger.error("Twilio credentials not configured")
                return False
            
            response = await self.client.post(
                f"https://api.twilio.com/2010-04-01/Accounts/{self.settings.TWILIO_ACCOUNT_SID}/Messages.json",
                auth=(self.settings.TWILIO_ACCOUNT_SID, self.settings.TWILIO_AUTH_TOKEN),
                data={
                    "From": self.sender,
                    "To": phone_number,
                    "Body": f"토마토 시스템 인증 코드: {code}\n5분 내에 입력해주세요."
                }
            )
            
            if response.status_code == 201:
                logger.info(f"SMS sent successfully to {phone_number}")
                return True
            else:
                logger.error(f"Twilio API error: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            logger.error(f"SMS 발송 실패: {e}")
            return False
    
    async def _send_aws_sns(self, phone_number: str, code: str) -> bool:
        """AWS SNS를 통한 SMS 발송 (추후 구현)"""
        # TODO: AWS SNS 구현
        logger.info(f"[AWS SNS] Would send OTP {code} to {phone_number}")
        return True
    
    def format_phone_number(self, phone_number: str) -> str:
        """전화번호 형식 정규화"""
        # 숫자만 추출
        numbers_only = ''.join(filter(str.isdigit, phone_number))
        
        # 한국 번호인 경우
        if numbers_only.startswith('82'):
            return '+' + numbers_only
        elif numbers_only.startswith('010'):
            return '+82' + numbers_only[1:]
        elif numbers_only.startswith('10'):  # 0 빠진 경우
            return '+8210' + numbers_only[2:]
        
        # 기본적으로 + 추가
        if not phone_number.startswith('+'):
            return '+' + numbers_only
        
        return phone_number
    
    async def verify_phone_number(self, phone_number: str) -> bool:
        """전화번호 유효성 검증 (실제 발송 테스트)"""
        try:
            test_code = self.generate_code()
            return await self.send_code(phone_number, test_code)
        except Exception as e:
            logger.error(f"Phone verification failed: {e}")
            return False
    
    async def close(self):
        """리소스 정리"""
        if self.client:
            await self.client.aclose()
