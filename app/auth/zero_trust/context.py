# app/auth/zero_trust/context.py
from pydantic import BaseModel
from typing import Optional, Dict, List  # List 추가
from datetime import datetime
from enum import Enum

class RiskLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class AuthContext(BaseModel):
    """인증 컨텍스트"""
    # 사용자 정보
    user_id: int
    user_role: str
    user_history: Dict  # 과거 행동 패턴
    
    # 디바이스 정보
    device_id: str
    device_trusted: bool
    device_risk_score: float
    
    # 위치 정보
    ip_address: str
    country: str
    city: Optional[str]
    is_vpn: bool
    is_tor: bool
    
    # 시간 정보
    timestamp: datetime
    time_of_day: int  # 0-23
    day_of_week: int  # 0-6
    is_working_hours: bool
    
    # 요청 정보
    resource: str
    action: str
    data_sensitivity: str
    
    # 환경 정보
    network_type: str  # corporate, home, public
    browser_plugins: List[str]
    
    # 행동 정보
    typing_pattern: Optional[Dict]  # 키보드 입력 패턴
    mouse_pattern: Optional[Dict]   # 마우스 움직임 패턴

class ContextAnalyzer:
    def __init__(self):
        self.ml_model = self._load_model()
        
    async def analyze_context(self, context: AuthContext) -> Dict:
        """컨텍스트 분석"""
        risk_factors = []
        risk_score = 0.0
        
        # 1. 위치 위험도
        location_risk = self._analyze_location(context)
        risk_score += location_risk["score"] * 0.3
        if location_risk["factors"]:
            risk_factors.extend(location_risk["factors"])
        
        # 2. 시간 위험도
        time_risk = self._analyze_time(context)
        risk_score += time_risk["score"] * 0.2
        if time_risk["factors"]:
            risk_factors.extend(time_risk["factors"])
        
        # 3. 디바이스 위험도
        device_risk = self._analyze_device(context)
        risk_score += device_risk["score"] * 0.3
        if device_risk["factors"]:
            risk_factors.extend(device_risk["factors"])
        
        # 4. 행동 위험도
        behavior_risk = await self._analyze_behavior(context)
        risk_score += behavior_risk["score"] * 0.2
        if behavior_risk["factors"]:
            risk_factors.extend(behavior_risk["factors"])
        
        # 위험 수준 결정
        if risk_score >= 0.8:
            risk_level = RiskLevel.CRITICAL
        elif risk_score >= 0.6:
            risk_level = RiskLevel.HIGH
        elif risk_score >= 0.4:
            risk_level = RiskLevel.MEDIUM
        else:
            risk_level = RiskLevel.LOW
        
        return {
            "risk_score": risk_score,
            "risk_level": risk_level,
            "risk_factors": risk_factors,
            "recommended_action": self._get_recommended_action(risk_level, context)
        }
    
    def _analyze_location(self, context: AuthContext) -> Dict:
        """위치 기반 위험도 분석"""
        score = 0.0
        factors = []
        
        # VPN/Tor 사용
        if context.is_vpn:
            score += 0.4
            factors.append("VPN detected")
        
        if context.is_tor:
            score += 0.6
            factors.append("Tor network detected")
        
        # 국가 위험도 (블랙리스트)
        high_risk_countries = ["XX", "YY"]  # 예시
        if context.country in high_risk_countries:
            score += 0.5
            factors.append(f"High-risk country: {context.country}")
        
        # 과거 위치와 비교
        if self._is_unusual_location(context):
            score += 0.3
            factors.append("Unusual location")
        
        return {"score": min(1.0, score), "factors": factors}
    
    def _analyze_time(self, context: AuthContext) -> Dict:
        """시간 기반 위험도 분석"""
        score = 0.0
        factors = []
        
        # 비정상 시간대
        if not context.is_working_hours and context.user_role == "ADMIN":
            score += 0.3
            factors.append("Admin access outside working hours")
        
        # 새벽 시간대 (현지 시간)
        if 0 <= context.time_of_day <= 5:
            score += 0.2
            factors.append("Late night access")
        
        return {"score": min(1.0, score), "factors": factors}
    
    def _analyze_device(self, context: AuthContext) -> Dict:
        """디바이스 기반 위험도 분석"""
        score = context.device_risk_score
        factors = []
        
        if not context.device_trusted:
            score += 0.4
            factors.append("Untrusted device")
        
        # 의심스러운 브라우저 플러그인
        suspicious_plugins = ["automation", "selenium", "puppeteer"]
        for plugin in context.browser_plugins:
            if any(sus in plugin.lower() for sus in suspicious_plugins):
                score += 0.3
                factors.append(f"Suspicious plugin: {plugin}")
        
        return {"score": min(1.0, score), "factors": factors}
    
    async def _analyze_behavior(self, context: AuthContext) -> Dict:
        """행동 패턴 분석"""
        score = 0.0
        factors = []
        
        # ML 모델로 이상 행동 탐지
        if context.typing_pattern or context.mouse_pattern:
            anomaly_score = await self._detect_behavioral_anomaly(context)
            if anomaly_score > 0.7:
                score += anomaly_score * 0.5
                factors.append("Abnormal behavior pattern")
        
        # 과거 행동과 비교
        if self._is_unusual_behavior(context):
            score += 0.3
            factors.append("Unusual user behavior")
        
        return {"score": min(1.0, score), "factors": factors}
    
    def _load_model(self):
        """ML 모델 로드 (더미 구현)"""
        # 실제로는 훈련된 모델을 로드
        return None
    
    def _is_unusual_location(self, context: AuthContext) -> bool:
        """비정상적인 위치 확인 (더미 구현)"""
        # 실제로는 사용자의 과거 위치 히스토리와 비교
        return False
    
    def _is_unusual_behavior(self, context: AuthContext) -> bool:
        """비정상적인 행동 확인 (더미 구현)"""
        # 실제로는 사용자의 과거 행동 패턴과 비교
        return False
    
    async def _detect_behavioral_anomaly(self, context: AuthContext) -> float:
        """행동 이상 탐지 (더미 구현)"""
        # 실제로는 ML 모델 사용
        return 0.0
    
    def _get_recommended_action(self, risk_level: RiskLevel, context: AuthContext) -> str:
        """위험 수준에 따른 권장 조치"""
        if risk_level == RiskLevel.CRITICAL:
            return "BLOCK"
        elif risk_level == RiskLevel.HIGH:
            return "REQUIRE_MFA"
        elif risk_level == RiskLevel.MEDIUM:
            return "MONITOR"
        else:
            return "ALLOW"
