# app/monitoring/logging/security.py
from typing import Dict, Any, Optional, Union
from datetime import datetime
from app.core.security.constants import SecurityEventType
from app.monitoring.logging.audit import audit_logger
from app.core.redis import redis_client
import json

class SecurityLogger:
    """보안 특화 로깅"""
    
    def __init__(self):
        self.critical_events = {
            SecurityEventType.ACCOUNT_LOCKED,
            SecurityEventType.SUSPICIOUS_ACTIVITY,
            SecurityEventType.PERMISSION_DENIED,
        }
    
    # 추가: log_security_event 메서드 (래퍼)
    async def log_security_event(
        self,
        event_type: Union[SecurityEventType, str],
        severity: str,
        description: str,
        user_id: Optional[int] = None,
        ip_address: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        action_taken: Optional[str] = None
    ):
        """보안 이벤트 기록 (audit_logger로 위임)"""
        # event_type이 문자열인 경우 SecurityEventType으로 변환 시도
        if isinstance(event_type, str):
            try:
                event_type = SecurityEventType(event_type)
            except ValueError:
                # 변환 실패 시 그대로 사용
                pass
        
        await audit_logger.log_security_event(
            event_type=event_type,
            severity=severity,
            description=description,
            user_id=user_id,
            ip_address=ip_address,
            details=details,
            action_taken=action_taken
        )
    
    async def log_login_attempt(
        self,
        user_id: Optional[int],
        email: str,
        ip_address: str,
        success: bool,
        failure_reason: Optional[str] = None,
        mfa_used: bool = False
    ):
        """로그인 시도 기록"""
        event_type = SecurityEventType.LOGIN_SUCCESS if success else SecurityEventType.LOGIN_FAILED
        severity = "INFO" if success else "WARNING"
        
        details = {
            "email": email,
            "mfa_used": mfa_used,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        if not success:
            details["failure_reason"] = failure_reason
            
            # 실패 횟수 추적
            fail_count = await self._increment_failed_attempts(email, ip_address)
            details["failed_attempts"] = fail_count
            
            if fail_count >= 5:
                severity = "CRITICAL"
                await self._lock_account(user_id, email, ip_address)
        
        await self.log_security_event(
            event_type=event_type,
            severity=severity,
            description=f"Login {'succeeded' if success else 'failed'} for {email}",
            user_id=user_id,
            ip_address=ip_address,
            details=details
        )
    
    async def log_permission_denied(
        self,
        user_id: int,
        resource: str,
        action: str,
        ip_address: str,
        required_permission: str
    ):
        """권한 거부 기록"""
        await self.log_security_event(
            event_type=SecurityEventType.PERMISSION_DENIED,
            severity="WARNING",
            description=f"Permission denied: {action} on {resource}",
            user_id=user_id,
            ip_address=ip_address,
            details={
                "resource": resource,
                "action": action,
                "required_permission": required_permission
            }
        )
        
        # 연속된 권한 거부 추적
        key = f"permission_denied:{user_id}"
        count = await redis_client.increment_counter(key, 300)  # 5분
        
        if count > 10:
            await self._flag_suspicious_activity(user_id, ip_address, "Excessive permission denials")
    
    async def log_data_access(
        self,
        user_id: int,
        resource_type: str,
        resource_id: str,
        action: str,
        ip_address: str,
        data_classification: str = "normal"  # normal, sensitive, pii
    ):
        """데이터 접근 기록 (규정 준수)"""
        # context import를 함수 내에서 처리
        try:
            from app.core.context import context
            request_id = context.get_request_id()
        except:
            request_id = "unknown"
        
        compliance_tags = {}
        
        if data_classification in ["sensitive", "pii"]:
            compliance_tags["gdpr"] = True
            compliance_tags["data_protection"] = True
        
        if action == "export":
            compliance_tags["data_export"] = True
            await self.log_security_event(
                event_type=SecurityEventType.DATA_EXPORT,
                severity="INFO",
                description=f"Data export: {resource_type}/{resource_id}",
                user_id=user_id,
                ip_address=ip_address,
                details={
                    "resource_type": resource_type,
                    "resource_id": resource_id,
                    "data_classification": data_classification
                }
            )
        
        # 감사 로그에도 기록
        await audit_logger.log_action(
            request_id=request_id,
            action=f"data_{action}",
            user_id=user_id,
            resource_type=resource_type,
            resource_id=resource_id,
            compliance_tags=compliance_tags,
            ip_address=ip_address
        )
    
    async def log_api_key_event(
        self,
        user_id: int,
        event_type: Union[SecurityEventType, str],
        api_key_id: str,
        ip_address: str
    ):
        """API 키 이벤트 기록"""
        # event_type 처리
        if isinstance(event_type, str):
            description = f"API key {event_type.replace('api_key_', '')}"
        else:
            description = f"API key {event_type.value.replace('api_key_', '')}"
        
        await self.log_security_event(
            event_type=event_type,
            severity="INFO",
            description=description,
            user_id=user_id,
            ip_address=ip_address,
            details={
                "api_key_id": api_key_id,
                "timestamp": datetime.utcnow().isoformat()
            }
        )
    
    async def _increment_failed_attempts(self, email: str, ip_address: str) -> int:
        """실패한 로그인 시도 카운트"""
        key = f"login_failed:{email}:{ip_address}"
        return await redis_client.increment_counter(key, 3600)  # 1시간
    
    async def _lock_account(self, user_id: Optional[int], email: str, ip_address: str):
        """계정 잠금"""
        await self.log_security_event(
            event_type=SecurityEventType.ACCOUNT_LOCKED,
            severity="CRITICAL",
            description=f"Account locked due to multiple failed login attempts: {email}",
            user_id=user_id,
            ip_address=ip_address,
            details={
                "email": email,
                "lock_duration_minutes": 30
            },
            action_taken="account_locked"
        )
        
        # Redis에 잠금 상태 저장
        key = f"account_locked:{email}"
        await redis_client.set_with_expiry(key, "locked", 1800)  # 30분
    
    async def _flag_suspicious_activity(self, user_id: int, ip_address: str, reason: str):
        """의심스러운 활동 플래그"""
        await self.log_security_event(
            event_type=SecurityEventType.SUSPICIOUS_ACTIVITY,
            severity="CRITICAL",
            description=reason,
            user_id=user_id,
            ip_address=ip_address,
            details={
                "reason": reason,
                "timestamp": datetime.utcnow().isoformat()
            },
            action_taken="flagged_for_review"
        )

# 전역 보안 로거
security_logger = SecurityLogger()
