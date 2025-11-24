# app/auth/devices/fingerprint.py
import hashlib
import json
from typing import Dict, Optional
from pydantic import BaseModel

class DeviceFingerprint(BaseModel):
    """디바이스 핑거프린트 데이터"""
    # 브라우저 정보
    user_agent: str
    language: str
    platform: str
    screen_resolution: str
    timezone_offset: int
    
    # 하드웨어 정보
    hardware_concurrency: int
    device_memory: Optional[int]
    
    # Canvas 핑거프린트
    canvas_fingerprint: str
    
    # WebGL 정보
    webgl_vendor: Optional[str]
    webgl_renderer: Optional[str]
    
    # 오디오 컨텍스트
    audio_fingerprint: Optional[str]
    
    # 폰트 목록
    fonts_hash: Optional[str]

class FingerprintService:
    def generate_device_id(self, fingerprint: DeviceFingerprint) -> str:
        """핑거프린트로부터 디바이스 ID 생성"""
        # 안정적인 속성만 사용
        stable_components = {
            "user_agent": fingerprint.user_agent,
            "platform": fingerprint.platform,
            "canvas": fingerprint.canvas_fingerprint,
            "webgl": f"{fingerprint.webgl_vendor}|{fingerprint.webgl_renderer}",
            "hardware": fingerprint.hardware_concurrency
        }
        
        # JSON 정렬하여 일관성 보장
        fingerprint_str = json.dumps(stable_components, sort_keys=True)
        
        # SHA256 해시
        return hashlib.sha256(fingerprint_str.encode()).hexdigest()
    
    def calculate_similarity(self, fp1: DeviceFingerprint, fp2: DeviceFingerprint) -> float:
        """두 핑거프린트 간 유사도 계산 (0.0 ~ 1.0)"""
        score = 0.0
        weights = {
            "user_agent": 0.2,
            "canvas_fingerprint": 0.3,
            "webgl": 0.2,
            "platform": 0.1,
            "screen_resolution": 0.1,
            "hardware": 0.1
        }
        
        # 각 속성 비교
        if fp1.user_agent == fp2.user_agent:
            score += weights["user_agent"]
        
        if fp1.canvas_fingerprint == fp2.canvas_fingerprint:
            score += weights["canvas_fingerprint"]
        
        if (fp1.webgl_vendor == fp2.webgl_vendor and 
            fp1.webgl_renderer == fp2.webgl_renderer):
            score += weights["webgl"]
        
        if fp1.platform == fp2.platform:
            score += weights["platform"]
        
        if fp1.screen_resolution == fp2.screen_resolution:
            score += weights["screen_resolution"]
        
        if fp1.hardware_concurrency == fp2.hardware_concurrency:
            score += weights["hardware"]
        
        return score
