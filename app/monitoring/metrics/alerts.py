# app/monitoring/metrics/alerts.py
from typing import Dict, Any, List, Optional
from datetime import datetime
from enum import Enum
import json  # json 모듈 import 추가
from app.monitoring.logging.structured import logger
from app.core.redis import redis_client

class AlertSeverity(Enum):
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"

class AlertChannel(Enum):
    EMAIL = "email"
    SLACK = "slack"
    WEBHOOK = "webhook"
    DASHBOARD = "dashboard"

class AlertSystem:
    """알림 시스템"""
    
    def __init__(self):
        self.alert_rules: List[Dict[str, Any]] = []
        self.alert_history: List[Dict[str, Any]] = []
    
    async def configure_alert_rules(self, rules: List[Dict[str, Any]]):
        """알림 규칙 설정"""
        self.alert_rules = rules
        logger.info(f"Configured {len(rules)} alert rules")
    
    async def check_thresholds(self, metrics: Dict[str, Any]):
        """임계값 확인 및 알림 발송"""
        for rule in self.alert_rules:
            try:
                if self._evaluate_rule(rule, metrics):
                    await self.send_alert(
                        title=rule.get("title", "System Alert"),
                        message=rule.get("message", "Threshold exceeded"),
                        severity=AlertSeverity(rule.get("severity", "warning")),
                        details={"rule": rule, "metrics": metrics},
                        channels=rule.get("channels", [AlertChannel.DASHBOARD])
                    )
            except Exception as e:
                logger.error(f"Failed to evaluate alert rule: {e}")
    
    def _evaluate_rule(self, rule: Dict[str, Any], metrics: Dict[str, Any]) -> bool:
        """규칙 평가"""
        try:
            metric_path = rule["metric"].split(".")
            value = metrics
            
            for key in metric_path:
                value = value.get(key)
                if value is None:
                    return False
            
            operator = rule["operator"]
            threshold = rule["threshold"]
            
            if operator == ">":
                return value > threshold
            elif operator == ">=":
                return value >= threshold
            elif operator == "<":
                return value < threshold
            elif operator == "<=":
                return value <= threshold
            elif operator == "==":
                return value == threshold
            elif operator == "!=":
                return value != threshold
            
            return False
        except Exception:
            return False
    
    async def send_alert(
        self,
        title: str,
        message: str,
        severity: AlertSeverity,
        details: Optional[Dict[str, Any]] = None,
        channels: Optional[List[AlertChannel]] = None
    ):
        """알림 발송"""
        alert = {
            "id": datetime.utcnow().isoformat(),
            "timestamp": datetime.utcnow(),
            "title": title,
            "message": message,
            "severity": severity.value,
            "details": details or {},
            "channels": [ch.value if isinstance(ch, AlertChannel) else ch for ch in (channels or [])]
        }
        
        # 알림 히스토리 저장
        self.alert_history.append(alert)
        if len(self.alert_history) > 1000:
            self.alert_history.pop(0)
        
        # Redis에 저장
        await self._save_to_redis(alert)
        
        # 각 채널로 발송
        for channel in channels or [AlertChannel.DASHBOARD]:
            await self._send_to_channel(alert, channel)
        
        logger.warning(
            f"Alert sent: {title}",
            severity=severity.value,
            channels=[ch.value if isinstance(ch, AlertChannel) else ch for ch in (channels or [])]
        )
    
    async def _send_to_channel(self, alert: Dict[str, Any], channel: AlertChannel):
        """특정 채널로 알림 발송"""
        try:
            if channel == AlertChannel.EMAIL:
                # 이메일 서비스가 구현되면 사용
                logger.info("Email service not implemented yet")
            elif channel == AlertChannel.SLACK:
                await self._send_to_slack(alert)
            elif channel == AlertChannel.WEBHOOK:
                await self._send_to_webhook(alert)
            elif channel == AlertChannel.DASHBOARD:
                await self._send_to_dashboard(alert)
        except Exception as e:
            logger.error(f"Failed to send alert via {channel.value}", error=str(e))
    
    async def _send_to_slack(self, alert: Dict[str, Any]):
        """Slack으로 알림 발송"""
        # Slack 웹훅 구현
        pass
    
    async def _send_to_webhook(self, alert: Dict[str, Any]):
        """웹훅으로 알림 발송"""
        # 일반 웹훅 구현
        pass
    
    async def _send_to_dashboard(self, alert: Dict[str, Any]):
        """대시보드로 알림 발송"""
        try:
            # Redis 채널로 실시간 알림
            alert_json = json.dumps(self._make_serializable(alert))
            await redis_client.redis.publish("dashboard:alerts", alert_json)
            
            # 대시보드용 알림 저장
            await redis_client.redis.lpush("dashboard:alert_queue", alert_json)
            await redis_client.redis.ltrim("dashboard:alert_queue", 0, 99)  # 최대 100개
        except Exception as e:
            logger.error("Failed to send alert to dashboard", error=str(e))
    
    async def _save_to_redis(self, alert: Dict[str, Any]):
        """Redis에 알림 저장"""
        try:
            alert_json = json.dumps(self._make_serializable(alert))
            
            # 시계열 데이터로 저장
            await redis_client.redis.zadd(
                "alerts:history",
                {alert_json: alert["timestamp"].timestamp()}
            )
            
            # 심각도별 카운터 증가
            await redis_client.redis.hincrby(
                "alerts:counts",
                alert["severity"],
                1
            )
        except Exception as e:
            logger.error("Failed to save alert to Redis", error=str(e))
    
    def _make_serializable(self, obj: Any) -> Any:
        """객체를 JSON 직렬화 가능한 형태로 변환"""
        if isinstance(obj, datetime):
            return obj.isoformat()
        elif isinstance(obj, AlertSeverity):
            return obj.value
        elif isinstance(obj, AlertChannel):
            return obj.value
        elif isinstance(obj, dict):
            return {k: self._make_serializable(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [self._make_serializable(item) for item in obj]
        else:
            return obj
    
    async def get_recent_alerts(self, limit: int = 50) -> List[Dict[str, Any]]:
        """최근 알림 조회"""
        try:
            alerts = await redis_client.redis.lrange("dashboard:alert_queue", 0, limit - 1)
            return [json.loads(alert) for alert in alerts]
        except Exception as e:
            logger.error("Failed to get recent alerts", error=str(e))
            return []
    
    def manage_alert_fatigue(self):
        """알림 피로도 관리"""
        # 중복 알림 제거, 알림 그룹화 등 구현
        pass


# 전역 알림 시스템
alert_system = AlertSystem()
