# app/monitoring/threat_detection/detector.py
from typing import Dict, List, Optional, Any
from datetime import datetime
from fastapi import Request
import asyncio
from app.monitoring.threat_detection.rules_engine import rules_engine
from app.monitoring.threat_detection.response import auto_response
from app.monitoring.threat_detection.patterns import AttackType
from app.monitoring.logging.security import security_logger
from app.monitoring.logging.structured import logger
from app.core.redis import redis_client

class ThreatDetector:
    """통합 위협 탐지 시스템"""
    
    def __init__(self):
        self.is_running = False
        self.detection_task: Optional[asyncio.Task] = None
        self.ml_model = None  # ML 모델은 나중에 구현
        self.threat_history: List[Dict] = []
    
    async def start(self):
        """위협 탐지 시스템 시작"""
        if not self.is_running:
            self.is_running = True
            logger.info("Threat detection system started")
    
    async def stop(self):
        """위협 탐지 시스템 중지"""
        if self.is_running:
            self.is_running = False
            if self.detection_task:
                self.detection_task.cancel()
                try:
                    await self.detection_task
                except asyncio.CancelledError:
                    pass
            logger.info("Threat detection system stopped")
    
    async def analyze_request(
        self,
        request: Request,
        response_status: Optional[int] = None,
        user_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """요청 분석 및 위협 탐지"""
        
        if not self.is_running:
            return {"threats": [], "risk_score": 0}
        
        # 컨텍스트 정보 수집
        context = {
            "ip_address": self._get_client_ip(request),
            "user_agent": request.headers.get("user-agent", ""),
            "request_id": getattr(request.state, "request_id", None),
            "user_id": user_id,
            "path": str(request.url.path),
            "method": request.method,
            "status_code": response_status,
            "timestamp": datetime.utcnow()
        }
        
        # Request body 가져오기 (가능한 경우)
        if hasattr(request.state, "body"):
            context["request_body"] = request.state.body
        
        # 1. 규칙 기반 탐지
        rule_threats = await rules_engine.evaluate(request, context)
        
        # 2. ML 기반 탐지 (구현 예정)
        ml_threats = await self._ml_detection(request, context)
        
        # 3. 행동 분석
        behavior_threats = await self._analyze_behavior(context)
        
        # 모든 위협 통합
        all_threats = rule_threats + ml_threats + behavior_threats
        
        # 위험도 점수 계산
        risk_score = self._calculate_risk_score(all_threats)
        
        # 위협이 감지되면 대응
        if all_threats:
            await self._handle_threats(all_threats, context)
        
        # 결과 저장
        result = {
            "threats": all_threats,
            "risk_score": risk_score,
            "context": context
        }
        
        # 히스토리에 추가
        self.threat_history.append(result)
        if len(self.threat_history) > 1000:
            self.threat_history.pop(0)
        
        return result
    
    async def _ml_detection(self, request: Request, context: Dict) -> List[Dict]:
        """ML 기반 탐지 (향후 구현)"""
        # TODO: ML 모델 통합
        return []
    
    async def _analyze_behavior(self, context: Dict) -> List[Dict]:
        """행동 패턴 분석"""
        threats = []
        ip = context.get("ip_address")
        
        # 1. 요청 빈도 분석
        request_count = await redis_client.increment_counter(
            f"request_count:{ip}",
            60  # 1분
        )
        
        if request_count > 100:  # 분당 100개 이상
            threats.append({
                "type": "high_request_rate",
                "severity": "MEDIUM",
                "description": f"High request rate: {request_count}/min",
                "timestamp": datetime.utcnow()
            })
        
        # 2. 지리적 이상 감지
        # TODO: GeoIP 통합
        
        return threats
    
    def _calculate_risk_score(self, threats: List[Dict]) -> float:
        """위험도 점수 계산"""
        if not threats:
            return 0.0
        
        severity_scores = {
            "LOW": 0.2,
            "MEDIUM": 0.5,
            "HIGH": 0.8,
            "CRITICAL": 1.0
        }
        
        total_score = sum(
            severity_scores.get(threat.get("severity", "LOW"), 0.2)
            for threat in threats
        )
        
        # 0-1 범위로 정규화
        return min(total_score, 1.0)
    
    async def _handle_threats(self, threats: List[Dict], context: Dict):
        """탐지된 위협 처리"""
        for threat in threats:
            # 자동 대응 시스템 호출
            actions = await auto_response.respond_to_threat(
                threat_type=threat.get("type", "unknown"),
                severity=threat.get("severity", "LOW"),
                context=context
            )
            
            # 보안 이벤트 로깅
            await security_logger.log_security_event(
                event_type="threat_detected",
                severity=threat.get("severity", "LOW"),
                description=threat.get("description", ""),
                user_id=context.get("user_id"),
                ip_address=context.get("ip_address"),
                details={
                    "threat": threat,
                    "actions_taken": actions
                }
            )
    
    def _get_client_ip(self, request: Request) -> str:
        """클라이언트 IP 추출"""
        # X-Forwarded-For 헤더 확인
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        
        # 직접 연결
        return request.client.host if request.client else "unknown"
    
    async def get_threat_stats(self) -> Dict[str, Any]:
        """위협 통계 조회"""
        # 최근 24시간 통계
        stats = {
            "total_threats": len(self.threat_history),
            "threats_by_type": {},
            "threats_by_severity": {
                "LOW": 0,
                "MEDIUM": 0,
                "HIGH": 0,
                "CRITICAL": 0
            },
            "top_ips": {},
            "recent_threats": self.threat_history[-10:]  # 최근 10개
        }
        
        # 통계 집계
        for record in self.threat_history:
            for threat in record.get("threats", []):
                # 유형별
                threat_type = threat.get("type", "unknown")
                stats["threats_by_type"][threat_type] = \
                    stats["threats_by_type"].get(threat_type, 0) + 1
                
                # 심각도별
                severity = threat.get("severity", "LOW")
                stats["threats_by_severity"][severity] += 1
                
                # IP별
                ip = record["context"].get("ip_address", "unknown")
                stats["top_ips"][ip] = stats["top_ips"].get(ip, 0) + 1
        
        return stats


# 전역 위협 탐지기 인스턴스
threat_detector = ThreatDetector()
