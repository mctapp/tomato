# app/auth/devices/trust.py
from sqlmodel import SQLModel, Field, Session, select
from datetime import datetime, timedelta
from typing import Optional, List
from enum import Enum
import secrets
import json

# 누락된 import 추가
from app.auth.devices.fingerprint import DeviceFingerprint, FingerprintService
from app.services.encryption.field_encryption import field_encryption_service

class DeviceStatus(str, Enum):
    UNKNOWN = "unknown"
    TRUSTED = "trusted"
    UNTRUSTED = "untrusted"
    BLOCKED = "blocked"

class UserDevice(SQLModel, table=True):
    """사용자 디바이스 (실제 DB 테이블에 맞춤)"""
    __tablename__ = "user_devices"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    device_id: str = Field(unique=True, index=True)
    device_fingerprint: str
    device_name: Optional[str] = None
    
    user_agent: str
    platform: Optional[str] = None
    browser: Optional[str] = None
    
    status: str = Field(default=DeviceStatus.UNKNOWN)
    trust_score: float = Field(default=0.5)
    
    last_ip: str
    last_country: Optional[str] = None
    last_city: Optional[str] = None
    
    first_seen_at: datetime = Field(default_factory=datetime.utcnow)
    last_seen_at: datetime = Field(default_factory=datetime.utcnow)
    trusted_at: Optional[datetime] = None
    blocked_at: Optional[datetime] = None

class DeviceTrustManager:
    def __init__(self, db: Session):
        self.db = db
        self.trust_duration = timedelta(days=30)
        self.encryption_service = field_encryption_service
        self.fingerprint_service = FingerprintService()

    async def register_device(
        self,
        user_id: int,
        device_id: str,
        device_name: str,
        fingerprint: DeviceFingerprint,
        request = None
    ) -> UserDevice:
        """새 디바이스 등록"""
        # 기존 디바이스 확인
        existing = self.db.exec(
            select(UserDevice).where(
                UserDevice.user_id == user_id,
                UserDevice.device_id == device_id
            )
        ).first()

        if existing:
            # 업데이트
            existing.last_seen_at = datetime.utcnow()
            existing.trust_score = min(1.0, existing.trust_score + 0.1)
            if request:
                existing.last_ip = request.client.host if request.client else "unknown"
            self.db.commit()
            return existing

        # 새 디바이스 생성
        fingerprint_json = fingerprint.model_dump_json()
        
        device = UserDevice(
            user_id=user_id,
            device_id=device_id,
            device_fingerprint=fingerprint_json,
            device_name=device_name or f"Device {device_id[:8]}",
            user_agent=fingerprint.user_agent,
            platform=fingerprint.platform,
            browser=None,  # 추후 파싱
            status=DeviceStatus.UNKNOWN,
            trust_score=0.5,
            last_ip=request.client.host if request and request.client else "unknown",
            last_country=None,
            last_city=None
        )

        self.db.add(device)
        self.db.commit()

        return device

    async def verify_device(self, device_id: str, fingerprint: DeviceFingerprint) -> Optional[UserDevice]:
        """디바이스 검증"""
        device = self.db.exec(
            select(UserDevice).where(
                UserDevice.device_id == device_id,
                UserDevice.status != DeviceStatus.BLOCKED
            )
        ).first()

        if not device:
            return None

        # 핑거프린트 비교
        stored_fp = DeviceFingerprint.model_validate_json(device.device_fingerprint)
        similarity = self.fingerprint_service.calculate_similarity(fingerprint, stored_fp)

        if similarity < 0.7:  # 70% 미만 유사도
            device.trust_score = max(0.0, device.trust_score - 0.2)
            if device.trust_score < 0.2:
                device.status = DeviceStatus.UNTRUSTED
            self.db.commit()
            return None

        # 검증 성공
        device.last_seen_at = datetime.utcnow()
        device.trust_score = min(1.0, device.trust_score + 0.05)
        
        # 신뢰도에 따른 상태 변경
        if device.trust_score >= 0.8 and device.status != DeviceStatus.TRUSTED:
            device.status = DeviceStatus.TRUSTED
            device.trusted_at = datetime.utcnow()

        self.db.commit()
        return device

    async def is_device_trusted(self, user_id: int, device_id: str) -> bool:
        """디바이스가 신뢰되는지 확인"""
        device = self.db.exec(
            select(UserDevice).where(
                UserDevice.user_id == user_id,
                UserDevice.device_id == device_id
            )
        ).first()
        
        return device is not None and device.status == DeviceStatus.TRUSTED

    async def trust_device(self, user_id: int, device_id: str, request) -> UserDevice:
        """디바이스를 신뢰 목록에 추가"""
        from app.auth.devices.fingerprint import DeviceFingerprint
        
        fingerprint = DeviceFingerprint(
            user_agent=request.headers.get("User-Agent", ""),
            language=request.headers.get("Accept-Language", "en"),
            platform=request.headers.get("Sec-CH-UA-Platform", "Unknown"),
            screen_resolution="1920x1080",
            timezone_offset=0,
            hardware_concurrency=4,
            device_memory=8,
            canvas_fingerprint="default",
            webgl_vendor=None,
            webgl_renderer=None,
            audio_fingerprint=None,
            fonts_hash=None
        )
        
        device_name = f"{fingerprint.platform} - {fingerprint.user_agent[:30]}"
        
        device = await self.register_device(
            user_id=user_id,
            device_id=device_id,
            device_name=device_name,
            fingerprint=fingerprint,
            request=request
        )
        
        # 즉시 신뢰 상태로 변경
        device.status = DeviceStatus.TRUSTED
        device.trusted_at = datetime.utcnow()
        device.trust_score = 0.8
        self.db.commit()
        
        return device

    async def get_user_devices(self, user_id: int) -> List[UserDevice]:
        """사용자의 디바이스 목록"""
        return self.db.exec(
            select(UserDevice).where(
                UserDevice.user_id == user_id
            ).order_by(UserDevice.last_seen_at.desc())
        ).all()

    async def list_trusted_devices(self, user_id: int) -> List[dict]:
        """신뢰하는 디바이스 목록 조회 (API 응답용)"""
        devices = await self.get_user_devices(user_id)
        
        return [
            {
                "device_id": device.device_id,
                "device_name": device.device_name,
                "first_seen": device.first_seen_at.isoformat(),
                "last_seen": device.last_seen_at.isoformat(),
                "status": device.status,
                "trust_score": device.trust_score,
                "trusted": device.status == DeviceStatus.TRUSTED
            }
            for device in devices
        ]

    async def revoke_device(self, device_id: str, user_id: int) -> bool:
        """디바이스 신뢰 취소"""
        device = self.db.exec(
            select(UserDevice).where(
                UserDevice.device_id == device_id,
                UserDevice.user_id == user_id
            )
        ).first()

        if device:
            device.status = DeviceStatus.UNTRUSTED
            device.trust_score = 0.0
            self.db.commit()
            return True

        return False

    async def revoke_trust(self, user_id: int, device_id: str) -> bool:
        """디바이스 신뢰 해제 (별칭)"""
        return await self.revoke_device(device_id, user_id)
