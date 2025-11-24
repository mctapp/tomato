# app/monitoring/__init__.py
from typing import Optional
from app.monitoring.logging.structured import logger
from app.monitoring.logging.audit import audit_logger
from app.monitoring.logging.security import security_logger

# 아직 구현되지 않은 모듈들은 try-except로 처리
try:
    from app.monitoring.threat_detection.detector import threat_detector
    from app.monitoring.threat_detection.response import auto_response
    from app.monitoring.threat_detection.rules_engine import rules_engine  # 추가
    THREAT_DETECTION_AVAILABLE = True
except ImportError as e:
    logger.warning(f"Threat detection modules not available: {e}")
    threat_detector = None
    auto_response = None
    rules_engine = None  # 추가
    THREAT_DETECTION_AVAILABLE = False

from app.monitoring.metrics.collectors import metrics_collector
from app.monitoring.metrics.aggregators import metrics_aggregator
from app.monitoring.metrics.alerts import alert_system

async def initialize_monitoring():
    """모니터링 시스템 초기화"""
    try:
        # 1. 로깅 시스템 초기화
        logger.info("Initializing monitoring system")
        
        # 2. 위협 탐지 시스템 시작 (사용 가능한 경우)
        if THREAT_DETECTION_AVAILABLE and threat_detector:
            await threat_detector.start()
        
        # 3. 메트릭 수집 시작
        await metrics_collector.start_collection()
        
        # 4. 알림 시스템 초기화
        await alert_system.configure_alert_rules([
            {
                "title": "High CPU Usage",
                "metric": "cpu.usage_percent",
                "operator": ">",
                "threshold": 90,
                "severity": "warning",
                "channels": ["dashboard"]
            },
            {
                "title": "High Memory Usage",
                "metric": "memory.percent",
                "operator": ">",
                "threshold": 85,
                "severity": "warning",
                "channels": ["dashboard"]
            },
            {
                "title": "API Error Rate High",
                "metric": "api.error_rate",
                "operator": ">",
                "threshold": 5,
                "severity": "error",
                "channels": ["dashboard", "email"]
            }
        ])
        
        logger.info("Monitoring system initialized")
        
    except Exception as e:
        logger.error(f"Failed to initialize monitoring: {e}")
        # 모니터링 실패해도 애플리케이션은 계속 실행
        pass

async def shutdown_monitoring():
    """모니터링 시스템 종료"""
    try:
        logger.info("Shutting down monitoring system")
        
        # 1. 메트릭 수집 중지
        await metrics_collector.stop_collection()
        
        # 2. 위협 탐지 중지 (사용 가능한 경우)
        if THREAT_DETECTION_AVAILABLE and threat_detector:
            await threat_detector.stop()
        
        logger.info("Monitoring system shut down")
        
    except Exception as e:
        logger.error(f"Error during monitoring shutdown: {e}")

__all__ = [
    "initialize_monitoring",
    "shutdown_monitoring",
    "logger",
    "audit_logger",
    "security_logger",
    "metrics_collector",
    "metrics_aggregator",
    "alert_system",
    "rules_engine"  # 기본 export에 추가
]

# 선택적으로 export
if THREAT_DETECTION_AVAILABLE:
    __all__.extend(["threat_detector", "auto_response"])
