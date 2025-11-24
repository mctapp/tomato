# app/auth/sessions/manager.py
import secrets
import hashlib
from typing import Optional, List
from datetime import datetime, timedelta
from fastapi import Request, HTTPException, status

from app.auth.sessions.store import SessionStore
from app.auth.sessions.models import SessionInfo, DeviceType, GeoLocation
from app.services.geolocation import GeoLocationService
from app.core.config import settings

class SessionManager:
    def __init__(self, session_store: SessionStore):
        self.store = session_store
        self.geo_service = GeoLocationService()
        self.max_sessions_per_user = settings.MAX_SESSIONS_PER_USER
        self.session_timeout = timedelta(minutes=settings.SESSION_TIMEOUT_MINUTES)
    
    async def create_session(
        self,
        user_id: int,
        request: Request,
        device_type: DeviceType = DeviceType.WEB,
        device_name: Optional[str] = None,
        mfa_verified: bool = False
    ) -> SessionInfo:
        """새 세션 생성"""
        # 세션 수 제한 확인
        current_count = await self.store.count_user_sessions(user_id)
        if current_count >= self.max_sessions_per_user:
            # 가장 오래된 세션 삭제
            sessions = await self.store.get_user_sessions(user_id)
            if sessions:
                oldest = min(sessions, key=lambda s: s.last_activity)
                await self.store.delete_session(oldest.session_id)
        
        # 디바이스 ID 생성
        device_id = self._generate_device_id(request)
        
        # IP 및 위치 정보
        ip_address = self._get_client_ip(request)
        location = await self.geo_service.get_location(ip_address)
        
        # 세션 생성
        session = SessionInfo(
            session_id=secrets.token_urlsafe(32),
            user_id=user_id,
            device_id=device_id,
            device_type=device_type,
            device_name=device_name or self._get_device_name(request),
            ip_address=ip_address,
            user_agent=request.headers.get("User-Agent", ""),
            location=location,
            created_at=datetime.utcnow(),
            last_activity=datetime.utcnow(),
            expires_at=datetime.utcnow() + self.session_timeout,
            mfa_verified=mfa_verified,
            metadata={
                "browser": self._parse_browser(request),
                "os": self._parse_os(request)
            }
        )
        
        # 신뢰할 수 있는 디바이스 확인
        session.is_trusted = await self._is_trusted_device(user_id, device_id)
        
        # 저장
        await self.store.create_session(session)
        
        # 이상 위치 감지
        await self._check_anomalous_location(user_id, location)
        
        return session
    
    async def validate_session(self, session_id: str) -> Optional[SessionInfo]:
        """세션 유효성 검증"""
        session = await self.store.get_session(session_id)
        
        if not session:
            return None
        
        # 만료 확인
        if datetime.utcnow() > session.expires_at:
            await self.store.delete_session(session_id)
            return None
        
        # 활동 업데이트
        await self.store.update_activity(session_id)
        
        return session
    
    async def end_session(self, session_id: str):
        """세션 종료"""
        await self.store.delete_session(session_id)
    
    async def end_all_sessions(self, user_id: int, except_current: Optional[str] = None):
        """모든 세션 종료"""
        await self.store.delete_user_sessions(user_id, except_current)
    
    def _generate_device_id(self, request: Request) -> str:
        """디바이스 ID 생성 (핑거프린팅)"""
        components = [
            request.headers.get("User-Agent", ""),
            request.headers.get("Accept-Language", ""),
            request.headers.get("Accept-Encoding", ""),
            # Canvas 핑거프린트, WebGL 정보 등은 클라이언트에서 전송
            request.headers.get("X-Device-Fingerprint", "")
        ]
        
        fingerprint = "|".join(components)
        return hashlib.sha256(fingerprint.encode()).hexdigest()[:16]
    
    def _get_client_ip(self, request: Request) -> str:
        """실제 클라이언트 IP 추출"""
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        return request.client.host if request.client else "unknown"
    
    def _get_device_name(self, request: Request) -> str:
        """디바이스 이름 추출"""
        user_agent = request.headers.get("User-Agent", "")
        # 간단한 파싱 (실제로는 user-agents 라이브러리 사용)
        if "iPhone" in user_agent:
            return "iPhone"
        elif "Android" in user_agent:
            return "Android Device"
        elif "Windows" in user_agent:
            return "Windows PC"
        elif "Mac" in user_agent:
            return "Mac"
        return "Unknown Device"
    
    async def _check_anomalous_location(self, user_id: int, location: Optional[GeoLocation]):
        """이상 위치 감지"""
        if not location:
            return
        
        # 최근 세션들의 위치 확인
        recent_sessions = await self.store.get_user_sessions(user_id)
        if len(recent_sessions) < 2:
            return
        
        # 이전 위치와 비교
        last_location = recent_sessions[1].location
        if last_location and last_location.country != location.country:
            # 다른 국가에서 로그인
            time_diff = datetime.utcnow() - recent_sessions[1].last_activity
            
            if time_diff < timedelta(hours=2):
                # 2시간 내 다른 국가 = 의심스러움
                await self._send_security_alert(
                    user_id,
                    f"Suspicious login from {location.country}"
                )
