# app/core/redis.py
import redis.asyncio as redis
from typing import Optional
from app.config import settings
import json
from datetime import datetime, timedelta
import asyncio

class RedisClient:
    """Redis 클라이언트 싱글톤"""
    
    _instance: Optional['RedisClient'] = None
    _redis: Optional[redis.Redis] = None
    _connected: bool = False
    _lock = asyncio.Lock()
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    async def connect(self):
        """Redis 연결"""
        async with self._lock:
            if self._redis is not None and self._connected:
                # 이미 연결되어 있으면 연결 상태 확인
                try:
                    await self._redis.ping()
                    return self._redis
                except:
                    # 연결이 끊어졌으면 재연결
                    self._connected = False
                    await self.disconnect()
            
            # 설정 확인 - 새 방식(REDIS_HOST) 또는 이전 방식(REDIS_URL) 지원
            if hasattr(settings, 'REDIS_HOST'):
                # 새 설정 사용
                host = settings.REDIS_HOST
                port = settings.REDIS_PORT
            else:
                # 이전 설정에서 파싱
                redis_url = getattr(settings, 'REDIS_URL', 'redis://localhost:6379')
                if redis_url.startswith('redis://'):
                    parts = redis_url.replace('redis://', '').split(':')
                    host = parts[0]
                    port = int(parts[1].split('/')[0]) if len(parts) > 1 else 6379
                else:
                    host = 'localhost'
                    port = 6379
            
            # 직접 파라미터로 연결
            self._redis = redis.Redis(
                host=host,
                port=port,
                db=settings.REDIS_DB,
                password=settings.REDIS_PASSWORD,
                decode_responses=True,
                socket_timeout=getattr(settings, 'REDIS_SOCKET_TIMEOUT', 5),
                socket_connect_timeout=getattr(settings, 'REDIS_SOCKET_CONNECT_TIMEOUT', 5),
                max_connections=getattr(settings, 'REDIS_POOL_MAX_SIZE', 10),
                retry_on_timeout=True,
                retry_on_error=[redis.ConnectionError, redis.TimeoutError],
            )
            
            # 연결 테스트
            await self._redis.ping()
            self._connected = True
            print("✅ Redis connected successfully!")
                
        return self._redis
    
    async def disconnect(self):
        """Redis 연결 해제"""
        async with self._lock:
            if self._redis:
                await self._redis.close()
                self._redis = None
                self._connected = False
    
    async def ensure_connected(self):
        """연결 상태 확인 및 재연결"""
        if not self._connected or self._redis is None:
            await self.connect()
        else:
            try:
                await self._redis.ping()
            except:
                self._connected = False
                await self.connect()
    
    @property
    def redis(self) -> redis.Redis:
        """Redis 인스턴스 반환"""
        if self._redis is None or not self._connected:
            raise RuntimeError("Redis not connected. Call connect() first.")
        return self._redis
    
    # Rate Limiting 전용 메서드
    async def check_rate_limit(
        self, 
        key: str, 
        limit: int, 
        window: int
    ) -> tuple[bool, int, int]:
        """
        Rate limit 확인
        Returns: (allowed, current_count, ttl)
        """
        # 연결 확인
        await self.ensure_connected()
        
        pipe = self.redis.pipeline()
        now = datetime.utcnow().timestamp()
        window_start = now - window
        
        # Sliding window log algorithm
        pipe.zremrangebyscore(key, 0, window_start)
        pipe.zadd(key, {str(now): now})
        pipe.zcount(key, window_start, now)
        pipe.expire(key, window)
        pipe.ttl(key)
        
        results = await pipe.execute()
        current_count = results[2]
        ttl = results[4]
        
        return current_count <= limit, current_count, ttl
    
    # 유틸리티 메서드들
    async def set_with_expiry(self, key: str, value: any, expire_seconds: int):
        """만료 시간과 함께 값 설정"""
        await self.ensure_connected()
        if isinstance(value, (dict, list)):
            value = json.dumps(value)
        await self.redis.setex(key, expire_seconds, value)
    
    async def get_json(self, key: str) -> Optional[dict]:
        """JSON 값 가져오기"""
        await self.ensure_connected()
        value = await self.redis.get(key)
        if value:
            return json.loads(value)
        return None
    
    async def increment_counter(self, key: str, window_seconds: int = 60) -> int:
        """카운터 증가 (시간 윈도우 포함)"""
        await self.ensure_connected()
        pipe = self.redis.pipeline()
        pipe.incr(key)
        pipe.expire(key, window_seconds)
        results = await pipe.execute()
        return results[0]
    
    async def exists(self, key: str) -> bool:
        """키 존재 여부 확인"""
        await self.ensure_connected()
        return await self.redis.exists(key) > 0

    async def scard(self, key: str) -> int:
        """Set의 멤버 수 반환"""
        await self.ensure_connected()
        return await self.redis.scard(key)
    
    async def sadd(self, key: str, *values) -> int:
        """Set에 값 추가"""
        await self.ensure_connected()
        return await self.redis.sadd(key, *values)
    
    async def expire(self, key: str, seconds: int) -> bool:
        """키에 만료 시간 설정"""
        await self.ensure_connected()
        return await self.redis.expire(key, seconds)
    
    async def lpush(self, key: str, *values) -> int:
        """List의 왼쪽에 값 추가"""
        await self.ensure_connected()
        return await self.redis.lpush(key, *values)
    
    async def ltrim(self, key: str, start: int, stop: int) -> bool:
        """List를 지정된 범위로 자르기"""
        await self.ensure_connected()
        return await self.redis.ltrim(key, start, stop)
    
    # 추가: get_count 메서드
    async def get_count(self, key: str) -> int:
        """키의 카운트 값 가져오기"""
        await self.ensure_connected()
        value = await self.redis.get(key)
        if value:
            try:
                return int(value)
            except ValueError:
                return 0
        return 0
    
    # 추가: get 메서드 (범용)
    async def get(self, key: str) -> Optional[str]:
        """키의 값 가져오기"""
        await self.ensure_connected()
        return await self.redis.get(key)
    
    # 추가: set 메서드 (범용)
    async def set(self, key: str, value: str, expire: Optional[int] = None):
        """키에 값 설정"""
        await self.ensure_connected()
        if expire:
            await self.redis.setex(key, expire, value)
        else:
            await self.redis.set(key, value)

    async def delete(self, *keys) -> int:
        """키 삭제"""
        await self.ensure_connected()
        return await self.redis.delete(*keys)


# 전역 인스턴스
redis_client = RedisClient()
