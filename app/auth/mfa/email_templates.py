# app/auth/mfa/email_templates.py
from datetime import datetime
from typing import List

class EmailTemplates:
    """이메일 템플릿 관리"""
    
    @staticmethod
    def get_base_html_template() -> str:
        """기본 HTML 템플릿"""
        return """
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body {{
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    margin: 0;
                    padding: 0;
                    background-color: #f5f5f5;
                }}
                .wrapper {{
                    width: 100%;
                    background-color: #f5f5f5;
                    padding: 20px 0;
                }}
                .container {{
                    max-width: 600px;
                    margin: 0 auto;
                    background-color: #ffffff;
                    border-radius: 10px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    overflow: hidden;
                }}
                .header {{
                    background-color: #ff6246;
                    color: white;
                    padding: 30px 20px;
                    text-align: center;
                }}
                .header h1 {{
                    margin: 0;
                    font-size: 28px;
                    font-weight: 600;
                }}
                .content {{
                    padding: 40px 30px;
                }}
                .code-box {{
                    background-color: #f8f9fa;
                    font-size: 36px;
                    font-weight: bold;
                    text-align: center;
                    padding: 25px;
                    margin: 30px 0;
                    border-radius: 8px;
                    letter-spacing: 8px;
                    color: #ff6246;
                    border: 2px dashed #ff6246;
                }}
                .button {{
                    display: inline-block;
                    padding: 12px 30px;
                    background-color: #ff6246;
                    color: white;
                    text-decoration: none;
                    border-radius: 5px;
                    font-weight: bold;
                    margin: 20px 0;
                }}
                .security-tips {{
                    background-color: #fff3cd;
                    border-left: 4px solid #ffc107;
                    padding: 15px 20px;
                    margin: 30px 0;
                    border-radius: 4px;
                }}
                .security-tips h3 {{
                    margin: 0 0 10px 0;
                    color: #856404;
                }}
                .security-tips ul {{
                    margin: 0;
                    padding-left: 20px;
                }}
                .footer {{
                    background-color: #f8f9fa;
                    text-align: center;
                    padding: 20px;
                    font-size: 12px;
                    color: #6c757d;
                }}
                .footer p {{
                    margin: 5px 0;
                }}
                code {{
                    background-color: #f0f0f0;
                    padding: 3px 8px;
                    border-radius: 3px;
                    font-family: 'Courier New', monospace;
                    font-size: 14px;
                    display: inline-block;
                    margin: 2px;
                }}
                .backup-codes {{
                    background-color: #f8f9fa;
                    padding: 20px;
                    border-radius: 8px;
                    margin: 20px 0;
                }}
                .backup-codes-grid {{
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 10px;
                    margin-top: 15px;
                }}
            </style>
        </head>
        <body>
            <div class="wrapper">
                <div class="container">
                    {content}
                </div>
            </div>
        </body>
        </html>
        """
    
    @staticmethod
    def otp_email(code: str) -> dict:
        """OTP 인증 이메일"""
        html_content = f"""
        <div class="header">
            <h1>🍅 토마토 시스템</h1>
        </div>
        <div class="content">
            <h2 style="margin-bottom: 10px;">2단계 인증</h2>
            <p style="color: #6c757d; margin-top: 0;">Two-Factor Authentication</p>
            
            <p>안녕하세요,</p>
            <p>토마토 시스템 로그인을 위한 인증 코드입니다:</p>
            
            <div class="code-box">{code}</div>
            
            <p style="text-align: center; color: #6c757d;">
                이 코드는 <strong>5분</strong> 동안 유효합니다.
            </p>
            
            <div class="security-tips">
                <h3>🔒 보안 안내</h3>
                <ul>
                    <li>이 코드를 타인과 공유하지 마세요</li>
                    <li>토마토 시스템은 전화로 코드를 요청하지 않습니다</li>
                    <li>의심스러운 활동이 있다면 즉시 비밀번호를 변경하세요</li>
                </ul>
            </div>
            
            <p style="color: #6c757d; font-size: 14px;">
                본인이 요청하지 않았다면 이 메일을 무시하고, 계정 보안을 확인해주세요.
            </p>
        </div>
        <div class="footer">
            <p>© {datetime.now().year} 토마토 시스템. All rights reserved.</p>
            <p>이 메일은 자동으로 발송되었습니다. 회신하지 마세요.</p>
            <p>문의사항: contact@tomorrow.or.kr</p>
        </div>
        """
        
        text_content = f"""
토마토 시스템 2단계 인증

인증 코드: {code}

이 코드는 5분 동안 유효합니다.

보안 안내:
- 이 코드를 타인과 공유하지 마세요
- 토마토 시스템은 전화로 코드를 요청하지 않습니다
- 의심스러운 활동이 있다면 즉시 비밀번호를 변경하세요

본인이 요청하지 않았다면 이 메일을 무시하고, 계정 보안을 확인해주세요.

© {datetime.now().year} 토마토 시스템
문의: contact@tomorrow.or.kr
        """
        
        return {
            "subject": "토마토 시스템 - 2단계 인증 코드",
            "html": EmailTemplates.get_base_html_template().format(content=html_content),
            "text": text_content
        }
    
    @staticmethod
    def backup_codes_email(backup_codes: List[str]) -> dict:
        """백업 코드 이메일"""
        # HTML에서 백업 코드 그리드 생성
        codes_html = "\n".join([f'<code>{code}</code>' for code in backup_codes])
        
        html_content = f"""
        <div class="header">
            <h1>🍅 토마토 시스템</h1>
        </div>
        <div class="content">
            <h2 style="margin-bottom: 10px;">MFA 백업 코드</h2>
            <p style="color: #6c757d; margin-top: 0;">Multi-Factor Authentication Backup Codes</p>
            
            <p>안녕하세요,</p>
            <p>다음은 귀하의 MFA 백업 코드입니다. 이 코드는 휴대폰을 분실했거나 인증 앱에 접근할 수 없을 때 사용할 수 있습니다.</p>
            
            <div class="backup-codes">
                <h3 style="margin-top: 0;">백업 코드</h3>
                <div class="backup-codes-grid">
                    {codes_html}
                </div>
            </div>
            
            <div class="security-tips">
                <h3>⚠️ 중요 안내</h3>
                <ul>
                    <li>각 코드는 <strong>한 번만</strong> 사용할 수 있습니다</li>
                    <li>이 코드들을 안전한 장소에 보관하세요</li>
                    <li>이 이메일을 인쇄하거나 안전한 곳에 저장하세요</li>
                    <li>코드를 모두 사용하면 새로운 코드를 생성해야 합니다</li>
                </ul>
            </div>
            
            <p style="background-color: #d1ecf1; border-left: 4px solid #17a2b8; padding: 15px; margin: 20px 0; border-radius: 4px;">
                <strong>💡 팁:</strong> 비밀번호 관리자나 안전한 메모 앱에 이 코드들을 저장하는 것을 권장합니다.
            </p>
        </div>
        <div class="footer">
            <p>© {datetime.now().year} 토마토 시스템. All rights reserved.</p>
            <p>이 메일은 자동으로 발송되었습니다. 회신하지 마세요.</p>
            <p>문의사항: contact@tomorrow.or.kr</p>
        </div>
        """
        
        # 텍스트 버전에서 백업 코드 목록
        codes_text = "\n".join([f"  - {code}" for code in backup_codes])
        
        text_content = f"""
토마토 시스템 MFA 백업 코드

다음은 귀하의 MFA 백업 코드입니다. 
휴대폰을 분실했거나 인증 앱에 접근할 수 없을 때 사용할 수 있습니다.

백업 코드:
{codes_text}

중요 안내:
- 각 코드는 한 번만 사용할 수 있습니다
- 이 코드들을 안전한 장소에 보관하세요
- 이 이메일을 인쇄하거나 안전한 곳에 저장하세요
- 코드를 모두 사용하면 새로운 코드를 생성해야 합니다

팁: 비밀번호 관리자나 안전한 메모 앱에 이 코드들을 저장하는 것을 권장합니다.

© {datetime.now().year} 토마토 시스템
문의: contact@tomorrow.or.kr
        """
        
        return {
            "subject": "토마토 시스템 - MFA 백업 코드 (중요)",
            "html": EmailTemplates.get_base_html_template().format(content=html_content),
            "text": text_content
        }
    
    @staticmethod
    def mfa_enabled_email(mfa_type: str) -> dict:
        """MFA 활성화 알림 이메일"""
        mfa_type_korean = {
            "TOTP": "인증 앱 (Google Authenticator 등)",
            "SMS": "SMS 문자 메시지",
            "EMAIL": "이메일"
        }.get(mfa_type, mfa_type)
        
        html_content = f"""
        <div class="header">
            <h1>🍅 토마토 시스템</h1>
        </div>
        <div class="content">
            <h2 style="color: #28a745;">✅ 2단계 인증이 활성화되었습니다</h2>
            
            <p>안녕하세요,</p>
            <p>귀하의 계정에 2단계 인증이 성공적으로 활성화되었습니다.</p>
            
            <div style="background-color: #d4edda; border-left: 4px solid #28a745; padding: 15px; margin: 20px 0; border-radius: 4px;">
                <strong>인증 방법:</strong> {mfa_type_korean}
            </div>
            
            <p>이제부터 로그인 시 다음과 같은 추가 단계가 필요합니다:</p>
            <ol>
                <li>평소와 같이 이메일과 비밀번호로 로그인</li>
                <li>{mfa_type_korean}을(를) 통해 받은 인증 코드 입력</li>
            </ol>
            
            <p><strong>백업 코드를 안전한 곳에 보관하셨나요?</strong><br>
            백업 코드는 기본 인증 방법을 사용할 수 없을 때 매우 중요합니다.</p>
            
            <div class="security-tips">
                <h3>🔒 계정이 더 안전해졌습니다!</h3>
                <p>2단계 인증은 비밀번호가 유출되더라도 계정을 보호합니다.</p>
            </div>
        </div>
        <div class="footer">
            <p>© {datetime.now().year} 토마토 시스템. All rights reserved.</p>
            <p>본인이 이 설정을 하지 않았다면 즉시 contact@tomorrow.or.kr로 연락주세요.</p>
        </div>
        """
        
        text_content = f"""
토마토 시스템 - 2단계 인증이 활성화되었습니다

귀하의 계정에 2단계 인증이 성공적으로 활성화되었습니다.

인증 방법: {mfa_type_korean}

이제부터 로그인 시 다음과 같은 추가 단계가 필요합니다:
1. 평소와 같이 이메일과 비밀번호로 로그인
2. {mfa_type_korean}을(를) 통해 받은 인증 코드 입력

백업 코드를 안전한 곳에 보관하셨나요?
백업 코드는 기본 인증 방법을 사용할 수 없을 때 매우 중요합니다.

계정이 더 안전해졌습니다!
2단계 인증은 비밀번호가 유출되더라도 계정을 보호합니다.

© {datetime.now().year} 토마토 시스템
본인이 이 설정을 하지 않았다면 즉시 contact@tomorrow.or.kr로 연락주세요.
        """
        
        return {
            "subject": "토마토 시스템 - 2단계 인증 활성화 완료",
            "html": EmailTemplates.get_base_html_template().format(content=html_content),
            "text": text_content
        }
