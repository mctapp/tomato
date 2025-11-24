# app/middleware/anomaly_detection.py
from fastapi import Request, Response, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
import numpy as np
from sklearn.ensemble import IsolationForest
import joblib
import asyncio
import os
from typing import Dict, List, Optional
from collections import deque
from datetime import datetime, timedelta
from app.monitoring.logging.structured import logger
from app.core.redis import redis_client
import hashlib

class AnomalyDetectionMiddleware(BaseHTTPMiddleware):
    """ML 기반 이상 행위 탐지 (개선된 버전)"""
    
    def __init__(self, app, model_path: str = None, enable_ml: bool = False):
        super().__init__(app)
        self.enable_ml = enable_ml  # ML 모델 사용 여부
        self.model = self._load_or_create_model(model_path) if enable_ml else None
        self.feature_buffer = deque(maxlen=1000)  # 최근 1000개 요청
        self.anomaly_threshold = 0.85  # 더 관대한 임계값
        self.blocked_sessions: Dict[str, datetime] = {}
        self.learning_mode = True  # 학습 모드 (초기에는 차단하지 않음)
        self.min_training_samples = 5000  # 최소 학습 샘플 수
        self.total_requests = 0
        
    async def dispatch(self, request: Request, call_next):
        # 헬스체크, 정적 파일 등은 스킵
        skip_paths = ["/health", "/docs", "/redoc", "/openapi.json", "/_next", "/public"]
        if any(request.url.path.startswith(path) for path in skip_paths):
            return await call_next(request)
        
        self.total_requests += 1
        
        # 세션 ID 가져오기
        session_id = self._get_session_id(request)
        
        # 세션 차단 확인
        if session_id in self.blocked_sessions:
            if datetime.utcnow() < self.blocked_sessions[session_id]:
                raise HTTPException(
                    status_code=403,
                    detail="Anomalous behavior detected. Access temporarily blocked."
                )
            else:
                # 차단 해제
                del self.blocked_sessions[session_id]
        
        # 특징 추출
        features = await self._extract_features(request)
        
        # 이상 탐지
        anomaly_score = 0.0
        if self.enable_ml and self.model and not self.learning_mode:
            try:
                anomaly_score = self._detect_anomaly(features)
                request.state.anomaly_score = anomaly_score
            except Exception as e:
                logger.warning(f"Anomaly detection failed: {e}")
                anomaly_score = 0.0
        else:
            # 규칙 기반 간단한 체크
            anomaly_score = await self._rule_based_check(request)
        
        request.state.anomaly_score = anomaly_score
        
        # 응답 처리
        response = await call_next(request)
        
        # 사후 분석
        await self._post_analysis(request, response, features, anomaly_score)
        
        # 학습 모드 자동 해제 체크
        if self.learning_mode and self.total_requests >= self.min_training_samples:
            self.learning_mode = False
            logger.info("Anomaly detection switched to active mode")
        
        return response
    
    async def _rule_based_check(self, request: Request) -> float:
        """규칙 기반 간단한 이상 탐지"""
        score = 0.0
        session_id = self._get_session_id(request)
        
        try:
            # 1. 빠른 요청 체크 (1초에 10번 이상)
            request_key = f"rapid_requests:{session_id}"
            rapid_count = await redis_client.increment_counter(request_key, 1)
            if rapid_count > 10:
                score += 0.3
            
            # 2. 에러율 체크
            error_count = await redis_client.get_count(f"session_errors:{session_id}")
            request_count = await redis_client.get_count(f"session_requests:{session_id}")
            if request_count > 10 and error_count > request_count * 0.5:
                score += 0.3
            
            # 3. 의심스러운 패턴
            path = request.url.path.lower()
            suspicious_patterns = [
                "/../", "/..", "/etc/", "/passwd", "cmd=", "exec=",
                "<script", "javascript:", "onload=", "onerror="
            ]
            if any(pattern in path or pattern in str(request.url.query) for pattern in suspicious_patterns):
                score += 0.4
            
            # 4. 비정상적인 헤더
            headers = request.headers
            if len(headers) > 50:  # 너무 많은 헤더
                score += 0.2
            
            # 5. User-Agent 체크
            user_agent = headers.get("User-Agent", "").lower()
            suspicious_agents = ["bot", "crawler", "spider", "scraper", "curl", "wget"]
            if any(agent in user_agent for agent in suspicious_agents):
                score += 0.1  # 봇은 약간의 페널티만
            
            return min(score, 1.0)  # 최대 1.0
            
        except Exception as e:
            logger.error(f"Rule-based check failed: {e}")
            return 0.0
    
    def _load_or_create_model(self, model_path: str = None):
        """모델 로드 또는 생성"""
        if model_path and os.path.exists(model_path):
            try:
                model = joblib.load(model_path)
                logger.info(f"Model loaded from {model_path}")
                return model
            except Exception as e:
                logger.error(f"Failed to load model: {e}")
        
        # 새 모델 생성
        model = IsolationForest(
            contamination=0.05,  # 5%만 이상치로 간주
            random_state=42,
            n_estimators=100
        )
        
        # 정상 트래픽 패턴으로 초기 학습
        normal_features = self._generate_normal_traffic_features(1000)
        model.fit(normal_features)
        logger.info("New model created and fitted with normal traffic patterns")
        
        # 모델 저장
        if model_path:
            try:
                os.makedirs(os.path.dirname(model_path) or '.', exist_ok=True)
                joblib.dump(model, model_path)
                logger.info(f"Model saved to {model_path}")
            except Exception as e:
                logger.error(f"Failed to save model: {e}")
        
        return model
    
    def _generate_normal_traffic_features(self, n_samples: int) -> np.ndarray:
        """정상 트래픽 패턴 생성"""
        features = []
        
        for _ in range(n_samples):
            # 정상적인 시간대 (9-18시)
            hour = np.random.choice(range(9, 19), p=[0.1]*10)
            weekday = np.random.choice(range(5))  # 평일
            
            # 정상적인 요청 특징
            url_length = np.random.normal(30, 10)
            query_length = np.random.normal(20, 10)
            url_depth = np.random.choice([2, 3, 4], p=[0.3, 0.5, 0.2])
            
            # 정상적인 헤더
            user_agent_length = np.random.normal(100, 20)
            header_count = np.random.normal(15, 3)
            
            # 정상적인 페이로드
            content_length = np.random.exponential(1000)
            
            # 정상적인 세션 특징
            request_count = np.random.exponential(50)
            error_count = np.random.exponential(2)
            unique_paths = np.random.exponential(10)
            
            features.append([
                hour, weekday, 0,  # 시간 특징
                max(10, url_length), max(0, query_length), url_depth, 0,  # 요청 특징
                max(50, user_agent_length), 1, 1, max(5, header_count),  # 헤더 특징
                min(content_length, 10000), 0,  # 페이로드 특징
                request_count, error_count, unique_paths, error_count/(request_count+1)  # 세션 특징
            ])
        
        return np.array(features)
    
    def _get_session_id(self, request: Request) -> str:
        """세션 ID 생성"""
        ip = request.client.host if request.client else "unknown"
        user_agent = request.headers.get("User-Agent", "")
        
        # X-Forwarded-For 헤더 확인
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            ip = forwarded_for.split(",")[0].strip()
        
        session_string = f"{ip}:{user_agent}"
        return hashlib.md5(session_string.encode()).hexdigest()
    
    async def _extract_features(self, request: Request) -> np.ndarray:
        """요청에서 특징 추출"""
        features = []
        
        # 1. 시간 기반 특징
        now = datetime.utcnow()
        features.extend([
            now.hour,
            now.weekday(),
            1 if now.weekday() in [5, 6] else 0,
        ])
        
        # 2. 요청 특징
        features.extend([
            len(request.url.path),
            len(str(request.url.query)),
            request.url.path.count("/"),
            1 if request.method in ["POST", "PUT", "DELETE"] else 0,
        ])
        
        # 3. 헤더 특징
        headers = request.headers
        features.extend([
            len(headers.get("User-Agent", "")),
            1 if "Referer" in headers else 0,
            1 if "Accept-Language" in headers else 0,
            len(headers),
        ])
        
        # 4. 페이로드 특징
        content_length = int(headers.get("Content-Length", 0))
        features.extend([
            min(content_length, 10000),
            1 if content_length > 1000000 else 0,
        ])
        
        # 5. 세션 기반 특징
        session_features = await self._get_session_features(request)
        features.extend(session_features)
        
        return np.array(features).reshape(1, -1)
    
    async def _get_session_features(self, request: Request) -> List[float]:
        """세션 기반 특징 추출"""
        session_id = self._get_session_id(request)
        
        try:
            # Redis에서 세션 정보 가져오기
            request_count = await redis_client.get_count(f"session_requests:{session_id}")
            error_count = await redis_client.get_count(f"session_errors:{session_id}")
            unique_paths = await redis_client.scard(f"session_paths:{session_id}")
            
            # 세션 정보 업데이트
            await redis_client.increment_counter(f"session_requests:{session_id}", 3600)
            await redis_client.sadd(f"session_paths:{session_id}", request.url.path)
            await redis_client.expire(f"session_paths:{session_id}", 3600)
            
            return [
                float(request_count or 0),
                float(error_count or 0),
                float(unique_paths or 0),
                float(error_count) / float(request_count + 1)
            ]
        except Exception as e:
            logger.error(f"Failed to get session features: {e}")
            return [0.0, 0.0, 0.0, 0.0]
    
    def _detect_anomaly(self, features: np.ndarray) -> float:
        """이상 점수 계산 (0: 정상, 1: 이상)"""
        if not self.model:
            return 0.0
        
        # Isolation Forest 예측
        anomaly = self.model.predict(features)[0]
        score = self.model.score_samples(features)[0]
        
        # 점수 정규화 (0-1 범위)
        # score가 음수일수록 이상함
        normalized_score = 1 / (1 + np.exp(score * 2))
        
        return normalized_score
    
    async def _post_analysis(self, request: Request, response: Response, 
                           features: np.ndarray, anomaly_score: float):
        """요청 처리 후 분석"""
        
        # 에러 응답 기록
        if response.status_code >= 400:
            session_id = self._get_session_id(request)
            await redis_client.increment_counter(f"session_errors:{session_id}", 3600)
        
        # 학습 모드에서는 데이터만 수집
        if self.learning_mode:
            if response.status_code < 400:  # 정상 응답
                self.feature_buffer.append({
                    "features": features,
                    "label": 0,  # 정상
                    "timestamp": datetime.utcnow()
                })
            
            # 주기적 모델 재학습 (비동기)
            if len(self.feature_buffer) >= 1000 and self.enable_ml:
                asyncio.create_task(self._retrain_model())
            
            # 학습 모드에서는 차단하지 않음
            return
        
        # 활성 모드에서만 이상 처리
        if anomaly_score > self.anomaly_threshold:
            await self._handle_anomaly(request, anomaly_score)
        
        # 정상 트래픽 데이터 수집
        if response.status_code < 400 and anomaly_score < 0.3:
            self.feature_buffer.append({
                "features": features,
                "label": 0,
                "timestamp": datetime.utcnow()
            })
    
    async def _handle_anomaly(self, request: Request, score: float):
        """이상 행위 처리"""
        session_id = self._get_session_id(request)
        
        # 심각도에 따른 처리
        if score > 0.95:  # 매우 의심스러움
            # 즉시 차단 (1시간)
            self.blocked_sessions[session_id] = datetime.utcnow() + timedelta(hours=1)
            
            # 보안 알림
            await self._send_security_alert(
                level="CRITICAL",
                message=f"Highly anomalous behavior detected",
                details={
                    "session_id": session_id,
                    "anomaly_score": score,
                    "path": request.url.path,
                    "method": request.method,
                    "learning_mode": self.learning_mode
                }
            )
        
        elif score > 0.9:  # 의심스러움
            # 단기 차단 (15분)
            self.blocked_sessions[session_id] = datetime.utcnow() + timedelta(minutes=15)
            
            # 경고 로깅
            logger.warning(
                "anomaly_detected",
                session_id=session_id,
                score=score,
                path=request.url.path
            )
        
        else:
            # 모니터링만
            logger.info(
                "anomaly_warning",
                session_id=session_id,
                score=score,
                path=request.url.path
            )
    
    async def _send_security_alert(self, level: str, message: str, details: Dict):
        """보안 알림 전송"""
        try:
            # Sentry로 알림
            from app.monitoring.sentry import sentry_sdk
            if sentry_sdk:
                sentry_sdk.capture_message(
                    message,
                    level=level.lower(),
                    extra=details
                )
            
            # 로그 기록
            logger.error(
                "security_alert",
                level=level,
                message=message,
                **details
            )
            
            # Redis에 보안 이벤트 저장
            alert_data = {
                "level": level,
                "message": message,
                "details": details,
                "timestamp": datetime.utcnow().isoformat()
            }
            await redis_client.lpush(
                "security_alerts",
                str(alert_data)
            )
            await redis_client.ltrim("security_alerts", 0, 999)
            
        except Exception as e:
            logger.error(f"Failed to send security alert: {e}")
    
    async def _retrain_model(self):
        """모델 재학습 (백그라운드)"""
        if not self.enable_ml or not self.model:
            return
        
        try:
            # 정상 데이터로 재학습
            normal_data = [item["features"] for item in self.feature_buffer 
                          if item["label"] == 0]
            
            if len(normal_data) > 100:
                X = np.vstack(normal_data)
                self.model.fit(X)
                
                # 모델 저장
                joblib.dump(self.model, "models/anomaly_detection.pkl")
                
                logger.info("Anomaly detection model retrained", 
                          samples=len(normal_data))
        except Exception as e:
            logger.error("Model retraining failed", error=str(e))
