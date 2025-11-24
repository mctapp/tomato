# app/auth/sessions/store.py
import json
import aioredis
from typing import Optional, List, Dict
from datetime import datetime, timedelta
from app.auth.sessions.models import SessionInfo, DeviceType

class SessionStore:
    def __init__(self, redis_url: str):
        self.redis_url = redis_url
        self.redis: Optional[aioredis.Redis] = None
        self.session_ttl = 3600 * 24  # 24시간
        
    async def connect(self):
        """Redis 연결"""
        self.redis = await aioredis.from_url(
            self.redis_url,
            encoding="utf-8",
            decode_responses=True
        )
    
    async def create_session(self, session: SessionInfo) -> str:
        """새 세션 생성"""
        # 세션 데이터 저장
        session_key = f"session:{session.session_id}"
        session_data = session.model_dump_json()
        
        await self.redis.setex(
            session_key,
            self.session_ttl,
            session_data
        )
        
        # 사용자별 세션 인덱스
        user_sessions_key = f"user_sessions:{session.user_id}"
        await self.redis.sadd(user_sessions_key, session.session_id)
        await self.redis.expire(user_sessions_key, self.session_ttl)
        
        # 디바이스별 세션 인덱스
        device_sessions_key = f"device_sessions:{session.device_id}"
        await self.redis.sadd(device_sessions_key, session.session_id)
        await self.redis.expire(device_sessions_key, self.session_ttl)
        
        return session.session_id
    
    async def get_session(self, session_id: str) -> Optional[SessionInfo]:
        """세션 조회"""
        session_key = f"session:{session_id}"
        session_data = await self.redis.get(session_key)
        
        if not session_data:
            return None
        
        return SessionInfo.model_validate_json(session_data)
    
    async def update_activity(self, session_id: str) -> bool:
        """세션 활동 업데이트"""
        session = await self.get_session(session_id)
        if not session:
            return False
        
        session.last_activity = datetime.utcnow()
        
        # 슬라이딩 세션 (활동 시 연장)
        session_key = f"session:{session_id}"
        await self.redis.setex(
            session_key,
            self.session_ttl,
            session.model_dump_json()
        )
        
        # 활동 로그
        activity_key = f"session_activity:{session_id}"
        await self.redis.lpush(
            activity_key,
            json.dumps({
                "timestamp": datetime.utcnow().isoformat(),
                "action": "activity_update"
            })
        )
        await self.redis.ltrim(activity_key, 0, 99)  # 최근 100개만
        
        return True
    
    async def get_user_sessions(self, user_id: int) -> List[SessionInfo]:
        """사용자의 모든 세션 조회"""
        user_sessions_key = f"user_sessions:{user_id}"
        session_ids = await self.redis.smembers(user_sessions_key)
        
        sessions = []
        for session_id in session_ids:
            session = await self.get_session(session_id)
            if session:
                sessions.append(session)
        
        # 최신 활동 순으로 정렬
        sessions.sort(key=lambda s: s.last_activity, reverse=True)
        
        return sessions
    
    async def count_user_sessions(self, user_id: int) -> int:
        """사용자 세션 수"""
        user_sessions_key = f"user_sessions:{user_id}"
        return await self.redis.scard(user_sessions_key)
    
    async def delete_session(self, session_id: str) -> bool:
        """세션 삭제"""
        session = await self.get_session(session_id)
        if not session:
            return False
        
        # 세션 데이터 삭제
        session_key = f"session:{session_id}"
        await self.redis.delete(session_key)
        
        # 인덱스에서 제거
        user_sessions_key = f"user_sessions:{session.user_id}"
        await self.redis.srem(user_sessions_key, session_id)
        
        device_sessions_key = f"device_sessions:{session.device_id}"
        await self.redis.srem(device_sessions_key, session_id)
        
        # 활동 로그 삭제
        activity_key = f"session_activity:{session_id}"
        await self.redis.delete(activity_key)
        
        return True
    
    async def delete_user_sessions(self, user_id: int, except_session: Optional[str] = None):
        """사용자의 모든 세션 삭제"""
        sessions = await self.get_user_sessions(user_id)
        
        for session in sessions:
            if session.session_id != except_session:
                await self.delete_session(session.session_id)
    
    async def delete_device_sessions(self, device_id: str):
        """디바이스의 모든 세션 삭제"""
        device_sessions_key = f"device_sessions:{device_id}"
        session_ids = await self.redis.smembers(device_sessions_key)
        
        for session_id in session_ids:
            await self.delete_session(session_id)
    
    async def cleanup_expired_sessions(self):
        """만료된 세션 정리 (크론 작업)"""
        # Redis TTL이 자동으로 처리하지만, 추가 정리 로직
        cursor = 0
        while True:
            cursor, keys = await self.redis.scan(
                cursor, 
                match="session:*", 
                count=100
            )
            
            for key in keys:
                session_data = await self.redis.get(key)
                if session_data:
                    session = SessionInfo.model_validate_json(session_data)
                    if datetime.utcnow() > session.expires_at:
                        session_id = key.split(":")[-1]
                        await self.delete_session(session_id)
            
            if cursor == 0:
                break
