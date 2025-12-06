# app/api/gateway/throttle.py
from typing import Dict, Optional
from datetime import datetime, timedelta
from fastapi import Request
from app.core.redis import redis_client
import asyncio
import time

class AdaptiveThrottler:
    """적응형 API Throttling"""
    
    def __init__(self):
        self.bucket_configs = {
            "default": {"capacity": 100, "refill_rate": 10},  # 초당 10개
            "heavy": {"capacity": 50, "refill_rate": 5},      # 초당 5개
            "light": {"capacity": 200, "refill_rate": 20},    # 초당 20개
        }
        self.endpoint_buckets = {
            "/api/media/upload": "heavy",
            "/api/analytics": "heavy",
            "/api/auth": "light",
        }
    
    async def acquire_token(
        self,
        identifier: str,
        endpoint: str,
        tokens: int = 1
    ) -> tuple[bool, float]:
        """
        토큰 획득 시도 (Token Bucket Algorithm)
        Returns: (success, wait_time)
        """
        try:
            # Redis 연결 확인 및 획득
            await redis_client.ensure_connected()

            # Redis 인스턴스 안전하게 획득
            if redis_client._redis is None or not redis_client._connected:
                # Redis 사용 불가 시 throttling 스킵
                return True, 0

            bucket_type = self._get_bucket_type(endpoint)
            config = self.bucket_configs[bucket_type]

            key = f"throttle:{identifier}:{endpoint}"
            now = time.time()

            # Lua 스크립트로 원자적 처리
            lua_script = """
            local key = KEYS[1]
            local capacity = tonumber(ARGV[1])
            local refill_rate = tonumber(ARGV[2])
            local requested = tonumber(ARGV[3])
            local now = tonumber(ARGV[4])

            local bucket = redis.call('HMGET', key, 'tokens', 'last_refill')
            local tokens = tonumber(bucket[1]) or capacity
            local last_refill = tonumber(bucket[2]) or now

            -- 토큰 리필
            local time_passed = now - last_refill
            local tokens_to_add = time_passed * refill_rate
            tokens = math.min(capacity, tokens + tokens_to_add)

            -- 토큰 사용 시도
            if tokens >= requested then
                tokens = tokens - requested
                redis.call('HMSET', key, 'tokens', tokens, 'last_refill', now)
                redis.call('EXPIRE', key, 3600)
                return {1, 0}  -- success, no wait
            else
                local wait_time = (requested - tokens) / refill_rate
                return {0, wait_time}  -- fail, wait time
            end
            """

            result = await redis_client._redis.eval(
                lua_script,
                1,
                key,
                config["capacity"],
                config["refill_rate"],
                tokens,
                now
            )

            success = result[0] == 1
            wait_time = result[1]

            return success, wait_time
        except Exception as e:
            # Redis 에러 시 throttling 스킵 (서비스 우선)
            print(f"⚠️ Throttling skipped due to Redis error: {e}")
            return True, 0
    
    def _get_bucket_type(self, endpoint: str) -> str:
        """엔드포인트별 버킷 타입 결정"""
        for pattern, bucket_type in self.endpoint_buckets.items():
            if endpoint.startswith(pattern):
                return bucket_type
        return "default"
    
    async def apply_backpressure(self, identifier: str, load_factor: float):
        """시스템 부하에 따른 백프레셔 적용"""
        # Redis 연결 확인 추가
        await redis_client.ensure_connected()
        
        if load_factor > 0.8:
            # 높은 부하시 리필 속도 감소
            for config in self.bucket_configs.values():
                config["refill_rate"] *= 0.5
        elif load_factor < 0.3:
            # 낮은 부하시 리필 속도 증가
            for config in self.bucket_configs.values():
                config["refill_rate"] *= 1.5

# 전역 Throttler
throttler = AdaptiveThrottler()
