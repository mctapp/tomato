# app/api/gateway/circuit_breaker.py
from typing import Dict, Optional, Callable
from datetime import datetime, timedelta
from enum import Enum
from app.core.redis import redis_client
import asyncio
from app.monitoring import logger

class CircuitState(Enum):
    """회로 차단기 상태"""
    CLOSED = "closed"      # 정상 (요청 통과)
    OPEN = "open"          # 차단 (요청 거부)
    HALF_OPEN = "half_open"  # 반개방 (일부 요청 테스트)

class CircuitBreakerConfig:
    """회로 차단기 설정"""
    def __init__(
        self,
        failure_threshold: int = 5,
        success_threshold: int = 3,
        timeout: int = 60,
        half_open_requests: int = 3
    ):
        self.failure_threshold = failure_threshold  # 차단 전 실패 횟수
        self.success_threshold = success_threshold  # 복구를 위한 성공 횟수
        self.timeout = timeout  # 차단 시간 (초)
        self.half_open_requests = half_open_requests  # 반개방시 테스트 요청 수

class CircuitBreaker:
    """회로 차단기 구현"""
    
    def __init__(self):
        self.configs = {
            # 서비스별 설정
            "database": CircuitBreakerConfig(failure_threshold=3, timeout=30),
            "redis": CircuitBreakerConfig(failure_threshold=5, timeout=20),
            "s3": CircuitBreakerConfig(failure_threshold=5, timeout=60),
            "external_api": CircuitBreakerConfig(failure_threshold=10, timeout=120),
            
            # 엔드포인트별 설정
            "/api/media/transcode": CircuitBreakerConfig(failure_threshold=3, timeout=300),
            "/api/analytics/report": CircuitBreakerConfig(failure_threshold=5, timeout=180),
        }
        self.default_config = CircuitBreakerConfig()
    
    async def call(
        self,
        service_name: str,
        func: Callable,
        *args,
        **kwargs
    ):
        """회로 차단기를 통한 함수 호출"""
        state = await self._get_state(service_name)
        config = self.configs.get(service_name, self.default_config)
        
        # 상태별 처리
        if state == CircuitState.OPEN:
            # 타임아웃 확인
            if await self._should_attempt_reset(service_name):
                await self._transition_to_half_open(service_name)
            else:
                raise CircuitBreakerOpenException(f"Circuit breaker is OPEN for {service_name}")
        
        if state == CircuitState.HALF_OPEN:
            # 반개방 상태에서 제한된 요청만 허용
            allowed = await self._check_half_open_limit(service_name, config)
            if not allowed:
                raise CircuitBreakerOpenException(f"Circuit breaker is HALF_OPEN for {service_name}, limit reached")
        
        # 함수 실행
        try:
            result = await func(*args, **kwargs)
            await self._record_success(service_name)
            
            # 반개방 상태에서 성공시 확인
            if state == CircuitState.HALF_OPEN:
                success_count = await self._get_success_count(service_name)
                if success_count >= config.success_threshold:
                    await self._transition_to_closed(service_name)
            
            return result
            
        except Exception as e:
            await self._record_failure(service_name, str(e))
            
            # 실패 임계치 확인
            if state == CircuitState.CLOSED:
                failure_count = await self._get_failure_count(service_name)
                if failure_count >= config.failure_threshold:
                    await self._transition_to_open(service_name)
            elif state == CircuitState.HALF_OPEN:
                # 반개방 상태에서 실패시 즉시 개방
                await self._transition_to_open(service_name)
            
            raise
    
    async def _get_state(self, service_name: str) -> CircuitState:
        """현재 상태 조회"""
        state_key = f"circuit_breaker:{service_name}:state"
        state = await redis_client.redis.get(state_key)
        
        if state is None:
            return CircuitState.CLOSED
        
        return CircuitState(state)
    
    async def _should_attempt_reset(self, service_name: str) -> bool:
        """리셋 시도 여부 확인"""
        config = self.configs.get(service_name, self.default_config)
        open_time_key = f"circuit_breaker:{service_name}:open_time"
        
        open_time = await redis_client.redis.get(open_time_key)
        if not open_time:
            return True
        
        elapsed = datetime.utcnow().timestamp() - float(open_time)
        return elapsed >= config.timeout
    
    async def _check_half_open_limit(self, service_name: str, config: CircuitBreakerConfig) -> bool:
        """반개방 상태 요청 제한 확인"""
        limit_key = f"circuit_breaker:{service_name}:half_open_count"
        count = await redis_client.increment_counter(limit_key, config.timeout)
        return count <= config.half_open_requests
    
    async def _record_success(self, service_name: str):
        """성공 기록"""
        # 연속 성공 카운트
        success_key = f"circuit_breaker:{service_name}:success_count"
        await redis_client.redis.incr(success_key)
        
        # 실패 카운트 리셋
        failure_key = f"circuit_breaker:{service_name}:failure_count"
        await redis_client.redis.delete(failure_key)
        
        # 메트릭 기록
        logger.debug(f"Circuit breaker success recorded for {service_name}")
    
    async def _record_failure(self, service_name: str, error: str):
        """실패 기록"""
        # 연속 실패 카운트
        failure_key = f"circuit_breaker:{service_name}:failure_count"
        count = await redis_client.redis.incr(failure_key)
        
        # 성공 카운트 리셋
        success_key = f"circuit_breaker:{service_name}:success_count"
        await redis_client.redis.delete(success_key)
        
        # 에러 로깅
        logger.warning(f"Circuit breaker failure recorded for {service_name}: {error}, count: {count}")
    
    async def _get_failure_count(self, service_name: str) -> int:
        """실패 횟수 조회"""
        failure_key = f"circuit_breaker:{service_name}:failure_count"
        count = await redis_client.redis.get(failure_key)
        return int(count) if count else 0
    
    async def _get_success_count(self, service_name: str) -> int:
        """성공 횟수 조회"""
        success_key = f"circuit_breaker:{service_name}:success_count"
        count = await redis_client.redis.get(success_key)
        return int(count) if count else 0
    
    async def _transition_to_open(self, service_name: str):
        """OPEN 상태로 전환"""
        state_key = f"circuit_breaker:{service_name}:state"
        open_time_key = f"circuit_breaker:{service_name}:open_time"
        
        await redis_client.redis.set(state_key, CircuitState.OPEN.value)
        await redis_client.redis.set(open_time_key, datetime.utcnow().timestamp())
        
        # 알림
        logger.error(f"Circuit breaker transitioned to OPEN for {service_name}")
        
        # 이벤트 발생
        from app.monitoring.logging.security import security_logger
        await security_logger.log_security_event(
            event_type="circuit_breaker_open",
            severity="ERROR",
            description=f"Circuit breaker opened for {service_name}",
            details={"service": service_name}
        )
    
    async def _transition_to_half_open(self, service_name: str):
        """HALF_OPEN 상태로 전환"""
        state_key = f"circuit_breaker:{service_name}:state"
        await redis_client.redis.set(state_key, CircuitState.HALF_OPEN.value)
        
        # 카운터 리셋
        await redis_client.redis.delete(f"circuit_breaker:{service_name}:half_open_count")
        
        logger.info(f"Circuit breaker transitioned to HALF_OPEN for {service_name}")
    
    async def _transition_to_closed(self, service_name: str):
        """CLOSED 상태로 전환"""
        state_key = f"circuit_breaker:{service_name}:state"
        await redis_client.redis.delete(state_key)
        
        # 모든 카운터 리셋
        await redis_client.redis.delete(f"circuit_breaker:{service_name}:success_count")
        await redis_client.redis.delete(f"circuit_breaker:{service_name}:failure_count")
        await redis_client.redis.delete(f"circuit_breaker:{service_name}:open_time")
        
        logger.info(f"Circuit breaker transitioned to CLOSED for {service_name}")
    
    async def get_status(self) -> Dict[str, Dict]:
        """모든 회로 차단기 상태 조회"""
        status = {}
        
        for service_name in self.configs.keys():
            state = await self._get_state(service_name)
            failure_count = await self._get_failure_count(service_name)
            success_count = await self._get_success_count(service_name)
            
            status[service_name] = {
                "state": state.value,
                "failure_count": failure_count,
                "success_count": success_count,
                "config": {
                    "failure_threshold": self.configs[service_name].failure_threshold,
                    "success_threshold": self.configs[service_name].success_threshold,
                    "timeout": self.configs[service_name].timeout
                }
            }
        
        return status

class CircuitBreakerOpenException(Exception):
    """회로 차단기 개방 예외"""
    pass

# 전역 Circuit Breaker
circuit_breaker = CircuitBreaker()
