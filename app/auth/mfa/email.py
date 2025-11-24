# app/auth/mfa/email.py
import random
import string
import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional, List
import asyncio
from datetime import datetime
import os

from app.auth.mfa.email_templates import EmailTemplates

logger = logging.getLogger(__name__)

class EmailService:
    """Email OTP 서비스 (Gmail 구현)"""
    
    def __init__(self):
        # 환경 변수에서 설정 읽기
        self.smtp_server = os.getenv('MAIL_SERVER', 'smtp.gmail.com')
        self.smtp_port = int(os.getenv('MAIL_PORT', '587'))
        self.smtp_user = os.getenv('MAIL_USERNAME', '')
        self.smtp_password = os.getenv('MAIL_PASSWORD', '')
        self.from_email = os.getenv('MAIL_FROM', 'noreply@tomorrow.or.kr')
        self.from_name = os.getenv('MAIL_FROM_NAME', '토마토 시스템')
        self.use_tls = os.getenv('MAIL_TLS', 'true').lower() == 'true'
        
        # 템플릿 매니저
        self.templates = EmailTemplates()
        
        # 설정 검증
        if not all([self.smtp_server, self.smtp_user, self.smtp_password]):
            logger.warning("Email configuration incomplete, running in dummy mode")
            self.dummy_mode = True
        else:
            self.dummy_mode = False
            logger.info(f"Email service initialized with server: {self.smtp_server}")
    
    def generate_code(self, length: int = 6) -> str:
        """이메일 인증 코드 생성 (숫자만)"""
        return ''.join(random.choices(string.digits, k=length))
    
    async def send_otp(self, email: str, code: str) -> bool:
        """이메일 OTP 발송"""
        # 더미 모드
        if self.dummy_mode:
            logger.info(f"[Email Dummy] OTP {code} would be sent to {email}")
            print(f"\n[더미 모드] 이메일 OTP: {code} (실제로는 {email}로 발송됨)\n")
            return True
        
        # 템플릿에서 이메일 내용 가져오기
        email_data = self.templates.otp_email(code)
        
        # 비동기로 이메일 발송
        return await self._send_email_async(
            to_email=email,
            subject=email_data['subject'],
            html_body=email_data['html'],
            text_body=email_data['text']
        )
    
    async def send_backup_codes(self, email: str, backup_codes: List[str]) -> bool:
        """백업 코드 이메일 발송"""
        if self.dummy_mode:
            logger.info(f"[Email Dummy] Backup codes would be sent to {email}")
            print(f"\n[더미 모드] 백업 코드가 {email}로 발송됨\n")
            return True
        
        # 템플릿에서 이메일 내용 가져오기
        email_data = self.templates.backup_codes_email(backup_codes)
        
        return await self._send_email_async(
            to_email=email,
            subject=email_data['subject'],
            html_body=email_data['html'],
            text_body=email_data['text']
        )
    
    async def send_mfa_enabled_notification(self, email: str, mfa_type: str) -> bool:
        """MFA 활성화 알림 이메일 발송"""
        if self.dummy_mode:
            logger.info(f"[Email Dummy] MFA enabled notification would be sent to {email}")
            return True
        
        # 템플릿에서 이메일 내용 가져오기
        email_data = self.templates.mfa_enabled_email(mfa_type)
        
        return await self._send_email_async(
            to_email=email,
            subject=email_data['subject'],
            html_body=email_data['html'],
            text_body=email_data['text']
        )
    
    async def _send_email_async(self, to_email: str, subject: str, html_body: str, text_body: str) -> bool:
        """비동기 이메일 발송 (내부 메서드)"""
        try:
            # 동기 함수를 비동기로 실행
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(
                None, 
                self._send_email_sync, 
                to_email, 
                subject, 
                html_body, 
                text_body
            )
            return result
        except Exception as e:
            logger.error(f"Email sending failed: {e}")
            return False
    
    def _send_email_sync(self, to_email: str, subject: str, html_body: str, text_body: str) -> bool:
        """동기식 이메일 발송 (내부 사용)"""
        try:
            # 이메일 메시지 생성
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = f"{self.from_name} <{self.from_email}>"
            msg['To'] = to_email
            msg['Reply-To'] = self.from_email
            
            # 텍스트와 HTML 파트 추가
            part1 = MIMEText(text_body, 'plain', 'utf-8')
            part2 = MIMEText(html_body, 'html', 'utf-8')
            
            msg.attach(part1)
            msg.attach(part2)
            
            # Gmail SMTP 서버 연결 및 발송
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                # 디버그 모드 (개발 시에만)
                # server.set_debuglevel(1)
                
                # TLS 시작
                if self.use_tls:
                    server.starttls()
                
                # Gmail 로그인
                try:
                    server.login(self.smtp_user, self.smtp_password)
                except smtplib.SMTPAuthenticationError:
                    logger.error("Gmail authentication failed. Check if:")
                    logger.error("1. Username and password are correct")
                    logger.error("2. 2-factor authentication is enabled (use app password)")
                    logger.error("3. Less secure app access is allowed")
                    return False
                
                # 이메일 발송
                server.send_message(msg)
                
            logger.info(f"Email sent successfully to {to_email}")
            return True
            
        except smtplib.SMTPException as e:
            logger.error(f"SMTP error: {e}")
            return False
        except Exception as e:
            logger.error(f"Unexpected error sending email: {e}")
            return False
    
    def validate_email(self, email: str) -> bool:
        """이메일 주소 유효성 검증"""
        import re
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return bool(re.match(pattern, email))
    
    async def send_test_email(self, email: str) -> bool:
        """테스트 이메일 발송"""
        test_code = self.generate_code()
        logger.info(f"Sending test email to {email} with code {test_code}")
        return await self.send_otp(email, test_code)
