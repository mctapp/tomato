# app/monitoring/threat_detection/rules_engine.py
from typing import Dict, List, Optional, Any
from fastapi import Request
from app.monitoring.threat_detection.patterns import AttackType, AttackPattern
from app.core.redis import redis_client
from datetime import datetime, timedelta
import re
import os
import traceback
from app.monitoring.logging.structured import logger

class ThreatRule:
    """위협 탐지 규칙"""
    
    def __init__(
        self,
        name: str,
        description: str,
        condition: callable,
        action: callable,
        severity: str = "MEDIUM"
    ):
        self.name = name
        self.description = description
        self.condition = condition
        self.action = action
        self.severity = severity

class RulesEngine:
    """규칙 기반 위협 탐지 엔진"""
    
    def __init__(self):
        self.rules: List[ThreatRule] = []
        self.compiled_patterns = AttackPattern.compile_patterns()
        self._initialize_rules()
    
    def _initialize_rules(self):
        """기본 규칙 초기화"""
        
        # SQL Injection 탐지
        self.add_rule(ThreatRule(
            name="sql_injection_detection",
            description="Detect SQL injection attempts",
            condition=self._check_sql_injection,
            action=self._block_and_alert,
            severity="CRITICAL"
        ))
        
        # 반복된 404 에러
        self.add_rule(ThreatRule(
            name="excessive_404_errors",
            description="Detect directory scanning",
            condition=self._check_excessive_404,
            action=self._rate_limit_ip,
            severity="MEDIUM"
        ))
        
        # 비정상적인 요청 크기
        self.add_rule(ThreatRule(
            name="abnormal_request_size",
            description="Detect abnormally large requests",
            condition=self._check_request_size,
            action=self._reject_request,
            severity="LOW"
        ))
        
        # 의심스러운 User-Agent
        self.add_rule(ThreatRule(
            name="suspicious_user_agent",
            description="Detect known attack tools",
            condition=self._check_user_agent,
            action=self._block_scanner,
            severity="HIGH"
        ))
        
        # Brute Force 탐지
        self.add_rule(ThreatRule(
            name="brute_force_detection",
            description="Detect brute force attacks",
            condition=self._check_brute_force,
            action=self._temporary_ban,
            severity="HIGH"
        ))
    
    def add_rule(self, rule: ThreatRule):
        """규칙 추가"""
        self.rules.append(rule)
    
    async def evaluate(self, request: Request, context: Dict[str, Any]) -> List[Dict[str, Any]]:
        """모든 규칙 평가"""
        threats_detected = []
        
        for rule in self.rules:
            try:
                if await rule.condition(request, context):
                    # 위협 탐지됨
                    threat_info = {
                        "rule": rule.name,
                        "severity": rule.severity,
                        "description": rule.description,
                        "timestamp": datetime.utcnow(),
                        "request_id": context.get("request_id"),
                        "ip_address": context.get("ip_address"),
                    }
                    
                    # 대응 조치 실행
                    action_result = await rule.action(request, context, threat_info)
                    threat_info["action_taken"] = action_result
                    
                    threats_detected.append(threat_info)
                    
            except Exception as e:
                print(f"ACTUAL ERROR in {rule.name}: {type(e).__name__}: {str(e)}")
                print(f"TRACEBACK:\n{traceback.format_exc()}")
                try:
                    from app.monitoring.logging.structured import logger as exc_logger
                    exc_logger.error(f"Rule evaluation failed: {rule.name}", error=str(e))
                except Exception as log_err:
                    print(f"LOGGING ERROR: {type(log_err).__name__}: {str(log_err)}")
        
        return threats_detected
    
    # 조건 확인 메서드들
    async def _check_sql_injection(self, request: Request, context: Dict) -> bool:
        """SQL Injection 패턴 확인"""
        # URL 파라미터 확인
        query_string = str(request.url.query)
        
        # Request body 확인 (있는 경우)
        body = context.get("request_body", "")
        
        content_to_check = f"{query_string} {body}"
        
        for pattern in self.compiled_patterns[AttackType.SQL_INJECTION]:
            if pattern.search(content_to_check):
                return True
        
        return False
    
    async def _check_excessive_404(self, request: Request, context: Dict) -> bool:
        """과도한 404 에러 확인"""
        if context.get("status_code") != 404:
            return False
        
        ip = context.get("ip_address")
        key = f"404_count:{ip}"
        count = await redis_client.increment_counter(key, 300)  # 5분
        
        return count > 50
    
    async def _check_request_size(self, request: Request, context: Dict) -> bool:
        """비정상적인 요청 크기 확인"""
        content_length = request.headers.get("content-length", 0)
        try:
            size_mb = int(content_length) / (1024 * 1024)
            return size_mb > 100  # 100MB 이상
        except:
            return False
    
    async def _check_user_agent(self, request: Request, context: Dict) -> bool:
        """의심스러운 User-Agent 확인"""
        user_agent = request.headers.get("user-agent", "").lower()
        
        for scanner in AttackPattern.SCANNER_USER_AGENTS:
            if scanner in user_agent:
                return True
        
        return False
    
    async def _check_brute_force(self, request: Request, context: Dict) -> bool:
        """Brute Force 공격 확인"""
        # 🚨 개발 환경에서는 비활성화
        if os.getenv("ENVIRONMENT", "production") == "development":
            return False
        
        if request.url.path not in ["/api/auth/login", "/api/auth/token"]:
            return False
        
        ip = context.get("ip_address")
        key = f"login_attempts:{ip}"
        count = await redis_client.increment_counter(key, 60)  # 1분
        
        return count > 10
    
    # 대응 조치 메서드들
    async def _block_and_alert(self, request: Request, context: Dict, threat_info: Dict) -> str:
        """차단 및 알림"""
        ip = context.get("ip_address")
        
        # IP 차단
        await redis_client.set_with_expiry(f"blocked_ip:{ip}", "1", 86400)  # 24시간
        
        # 보안 이벤트 로깅
        from app.monitoring.logging.security import security_logger
        await security_logger._flag_suspicious_activity(
            user_id=context.get("user_id"),
            ip_address=ip,
            reason=f"Attack detected: {threat_info['rule']}"
        )
        
        return "blocked_and_alerted"
    
    async def _rate_limit_ip(self, request: Request, context: Dict, threat_info: Dict) -> str:
        """IP Rate Limiting 적용"""
        ip = context.get("ip_address")
        await redis_client.set_with_expiry(f"rate_limited:{ip}", "1", 3600)  # 1시간
        return "rate_limited"
    
    async def _reject_request(self, request: Request, context: Dict, threat_info: Dict) -> str:
        """요청 거부"""
        from app.monitoring.logging.structured import logger as req_logger
        req_logger.warning(
            "Request rejected",
            rule=threat_info['rule'],
            ip=context.get("ip_address"),
            path=request.url.path
        )
        return "request_rejected"
    
    async def _block_scanner(self, request: Request, context: Dict, threat_info: Dict) -> str:
        """스캐너 차단"""
        ip = context.get("ip_address")
        user_agent = request.headers.get("user-agent", "")
        
        # IP 차단 (더 긴 시간)
        await redis_client.set_with_expiry(f"blocked_scanner:{ip}", "1", 172800)  # 48시간
        
        # 로깅
        from app.monitoring.logging.security import security_logger
        await security_logger._flag_suspicious_activity(
            user_id=context.get("user_id"),
            ip_address=ip,
            reason=f"Scanner detected: {user_agent}"
        )
        
        return "scanner_blocked"
    
    async def _temporary_ban(self, request: Request, context: Dict, threat_info: Dict) -> str:
        """임시 차단"""
        # 🚨 개발 환경에서는 로깅만
        if os.getenv("ENVIRONMENT", "production") == "development":
            logger.warning(
                "Brute force detected (not banned in development)",
                ip=context.get("ip_address"),
                rule=threat_info['rule']
            )
            return "logged_only_dev"
        
        ip = context.get("ip_address")
        
        # 임시 차단 (30분)
        await redis_client.set_with_expiry(f"temp_banned:{ip}", "1", 1800)
        
        # 로깅
        from app.monitoring.logging.security import security_logger
        await security_logger._flag_suspicious_activity(
            user_id=context.get("user_id"),
            ip_address=ip,
            reason=f"Temporary ban: {threat_info['rule']}"
        )
        
        return "temporarily_banned"

# 싱글톤 인스턴스
rules_engine = RulesEngine()
