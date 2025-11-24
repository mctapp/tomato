
# app/monitoring/threat_detection/response.py
from typing import Dict, List, Optional
from datetime import datetime, timedelta
from app.core.redis import redis_client
from app.monitoring.logging.security import security_logger
from app.monitoring.logging.structured import logger
from enum import Enum
import json

class ResponseAction(Enum):
    """대응 조치 유형"""
    BLOCK_IP = "block_ip"
    RATE_LIMIT = "rate_limit"
    REQUIRE_MFA = "require_mfa"
    NOTIFY_ADMIN = "notify_admin"
    LOG_ONLY = "log_only"
    TERMINATE_SESSION = "terminate_session"
    LOCK_ACCOUNT = "lock_account"
    CHALLENGE_REQUEST = "challenge_request"

class AutoResponse:
    """자동 위협 대응 시스템"""
    
    def __init__(self):
        self.response_config = self._load_response_config()
        self.escalation_thresholds = {
            "LOW": 10,
            "MEDIUM": 5,
            "HIGH": 2,
            "CRITICAL": 1
        }
    
    def _load_response_config(self) -> Dict[str, List[ResponseAction]]:
        """위협별 대응 조치 설정"""
        return {
            "sql_injection": [
                ResponseAction.BLOCK_IP,
                ResponseAction.NOTIFY_ADMIN,
                ResponseAction.TERMINATE_SESSION
            ],
            "xss": [
                ResponseAction.RATE_LIMIT,
                ResponseAction.LOG_ONLY
            ],
            "brute_force": [
                ResponseAction.RATE_LIMIT,
                ResponseAction.REQUIRE_MFA,
                ResponseAction.LOCK_ACCOUNT
            ],
            "scanner": [
                ResponseAction.BLOCK_IP,
                ResponseAction.LOG_ONLY
            ],
            "dos": [
                ResponseAction.BLOCK_IP,
                ResponseAction.NOTIFY_ADMIN
            ],
            "suspicious_activity": [
                ResponseAction.REQUIRE_MFA,
                ResponseAction.LOG_ONLY,
                ResponseAction.NOTIFY_ADMIN
            ]
        }
    
    async def respond_to_threat(
        self,
        threat_type: str,
        severity: str,
        context: Dict[str, any]
    ) -> List[str]:
        """위협에 대한 자동 대응"""
        actions_taken = []
        
        # 위협별 대응 조치 실행
        actions = self.response_config.get(threat_type, [ResponseAction.LOG_ONLY])
        
        for action in actions:
            try:
                result = await self._execute_action(action, context, severity)
                if result:
                    actions_taken.append(result)
            except Exception as e:
                # 지연 import로 안전하게 처리
                try:
                    from app.monitoring.logging.structured import logger as exc_logger
                    exc_logger.error(f"Failed to execute response action: {action}", error=str(e))
                except:
                    print(f"Failed to execute response action: {action}, error: {str(e)}")
        
        # 에스컬레이션 확인
        if await self._check_escalation(threat_type, context, severity):
            await self._escalate_response(threat_type, context)
            actions_taken.append("escalated")
        
        return actions_taken
    
    async def _execute_action(
        self,
        action: ResponseAction,
        context: Dict[str, any],
        severity: str
    ) -> Optional[str]:
        """개별 대응 조치 실행"""
        
        if action == ResponseAction.BLOCK_IP:
            return await self._block_ip(context)
        
        elif action == ResponseAction.RATE_LIMIT:
            return await self._apply_rate_limit(context)
        
        elif action == ResponseAction.REQUIRE_MFA:
            return await self._require_mfa(context)
        
        elif action == ResponseAction.NOTIFY_ADMIN:
            return await self._notify_admin(context, severity)
        
        elif action == ResponseAction.TERMINATE_SESSION:
            return await self._terminate_session(context)
        
        elif action == ResponseAction.LOCK_ACCOUNT:
            return await self._lock_account(context)
        
        elif action == ResponseAction.CHALLENGE_REQUEST:
            return await self._challenge_request(context)
        
        elif action == ResponseAction.LOG_ONLY:
            return "logged"
        
        return None
    
    async def _block_ip(self, context: Dict) -> str:
        """IP 차단"""
        ip = context.get("ip_address")
        duration = 86400  # 24시간
        
        # 심각도에 따라 차단 기간 조정
        if context.get("repeat_offender"):
            duration *= 7  # 반복 공격자는 7일
        
        await redis_client.set_with_expiry(f"blocked_ip:{ip}", "1", duration)
        
        # 차단 이유 저장
        await redis_client.set_with_expiry(
            f"block_reason:{ip}",
            json.dumps({
                "reason": context.get("threat_type"),
                "timestamp": datetime.utcnow().isoformat(),
                "duration": duration
            }),
            duration
        )
        
        return f"ip_blocked_{duration}s"
    
    async def _apply_rate_limit(self, context: Dict) -> str:
        """Rate Limiting 적용"""
        ip = context.get("ip_address")
        
        # 더 엄격한 제한 적용
        await redis_client.set_with_expiry(
            f"strict_rate_limit:{ip}",
            "10",  # 분당 10개 요청으로 제한
            3600   # 1시간
        )
        
        return "strict_rate_limit_applied"
    
    async def _require_mfa(self, context: Dict) -> str:
        """MFA 요구"""
        user_id = context.get("user_id")
        if user_id:
            await redis_client.set_with_expiry(
                f"require_mfa:{user_id}",
                "1",
                86400  # 24시간
            )
        return "mfa_required"
    
    async def _notify_admin(self, context: Dict, severity: str) -> str:
        """관리자 알림"""
        from app.services.notifications import send_admin_alert
        
        await send_admin_alert({
            "type": "security_threat",
            "severity": severity,
            "threat": context.get("threat_type"),
            "ip": context.get("ip_address"),
            "user_id": context.get("user_id"),
            "timestamp": datetime.utcnow().isoformat(),
            "details": context
        })
        
        return "admin_notified"
    
    async def _terminate_session(self, context: Dict) -> str:
        """세션 종료"""
        session_id = context.get("session_id")
        if session_id:
            await redis_client.delete(f"session:{session_id}")
            
            # 모든 관련 토큰 무효화
            user_id = context.get("user_id")
            if user_id:
                await redis_client.delete(f"refresh_token:{user_id}")
        
        return "session_terminated"
    
    async def _lock_account(self, context: Dict) -> str:
        """계정 잠금"""
        user_id = context.get("user_id")
        if user_id:
            await redis_client.set_with_expiry(
                f"account_locked:{user_id}",
                json.dumps({
                    "reason": context.get("threat_type"),
                    "locked_at": datetime.utcnow().isoformat(),
                    "ip": context.get("ip_address")
                }),
                1800  # 30분
            )
            
            # 보안 이벤트 로깅
            from app.core.security.constants import SecurityEventType
            await security_logger.log_security_event(
                event_type=SecurityEventType.ACCOUNT_LOCKED,
                severity="HIGH",
                description=f"Account locked due to {context.get('threat_type')}",
                user_id=user_id,
                ip_address=context.get("ip_address"),
                action_taken="account_locked"
            )
        
        return "account_locked"
    
    async def _challenge_request(self, context: Dict) -> str:
        """추가 인증 요구 (CAPTCHA 등)"""
        ip = context.get("ip_address")
        await redis_client.set_with_expiry(
            f"require_challenge:{ip}",
            "1",
            300  # 5분
        )
        return "challenge_required"
    
    async def _check_escalation(
        self,
        threat_type: str,
        context: Dict,
        severity: str
    ) -> bool:
        """에스컬레이션 필요 여부 확인"""
        ip = context.get("ip_address")
        
        # 최근 위협 카운트
        key = f"threat_count:{ip}:{threat_type}"
        count = await redis_client.increment_counter(key, 3600)  # 1시간
        
        threshold = self.escalation_thresholds.get(severity, 5)
        return count >= threshold
    
    async def _escalate_response(self, threat_type: str, context: Dict):
        """대응 수준 에스컬레이션"""
        # 더 강력한 조치 적용
        ip = context.get("ip_address")
        
        # 영구 차단 고려
        threat_history = await self._get_threat_history(ip)
        if len(threat_history) > 10:
            # 영구 차단 (수동 해제 필요)
            await redis_client.set(f"permanent_block:{ip}", "1")
            
            # 중요 알림
            await self._notify_admin(
                {**context, "escalation": "permanent_block"},
                "CRITICAL"
            )
    
    async def _get_threat_history(self, ip: str) -> List[Dict]:
        """IP의 위협 기록 조회"""
        # 실제로는 데이터베이스에서 조회
        history = []
        pattern = f"threat_count:{ip}:*"
        # Redis에서 패턴 매칭으로 조회
        return history

# 전역 자동 대응 시스템
auto_response = AutoResponse()
