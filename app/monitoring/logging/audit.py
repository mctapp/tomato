# app/monitoring/logging/audit.py
from typing import Optional, Dict, Any, List
from datetime import datetime
from sqlmodel import Session
from app.models.audit_logs import AuditLog, SecurityEvent
from app.core.security.constants import SecurityEventType
from app.db import get_session
import asyncio
from collections import deque
import threading
from app.monitoring.logging.structured import logger

class AuditLogger:
    """감사 로그 관리자"""
    
    def __init__(self, batch_size: int = 100, flush_interval: int = 5):
        self.batch_size = batch_size
        self.flush_interval = flush_interval
        self.buffer = deque(maxlen=1000)
        self.security_buffer = deque(maxlen=1000)
        self._lock = threading.Lock()
        self._running = False
        self._flush_task = None
    
    async def start(self):
        """백그라운드 플러시 시작"""
        self._running = True
        self._flush_task = asyncio.create_task(self._periodic_flush())
    
    async def stop(self):
        """정리"""
        self._running = False
        if self._flush_task:
            await self._flush_task
        await self._flush_all()
    
    async def log_action(
        self,
        request_id: str,
        action: str,
        user_id: Optional[int] = None,
        session_id: Optional[str] = None,
        resource_type: Optional[str] = None,
        resource_id: Optional[str] = None,
        changes: Optional[Dict[str, Any]] = None,
        **kwargs
    ):
        """감사 로그 기록"""
        log_entry = AuditLog(
            timestamp=datetime.utcnow(),
            request_id=request_id,
            user_id=user_id,
            session_id=session_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            changes=changes,
            **kwargs
        )
        
        with self._lock:
            self.buffer.append(log_entry)
        
        # 버퍼가 가득 차면 즉시 플러시
        if len(self.buffer) >= self.batch_size:
            await self._flush_audit_logs()
    
    async def log_security_event(
        self,
        event_type: SecurityEventType,
        severity: str,
        description: str,
        user_id: Optional[int] = None,
        ip_address: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        action_taken: Optional[str] = None
    ):
        """보안 이벤트 기록"""
        event = SecurityEvent(
            timestamp=datetime.utcnow(),
            event_type=event_type.value,
            severity=severity,
            description=description,
            user_id=user_id,
            ip_address=ip_address,
            details=details,
            action_taken=action_taken
        )
        
        with self._lock:
            self.security_buffer.append(event)
        
        # 중요 이벤트는 즉시 처리
        if severity == "CRITICAL":
            await self._flush_security_events()
    
    async def _periodic_flush(self):
        """주기적 플러시"""
        while self._running:
            await asyncio.sleep(self.flush_interval)
            await self._flush_all()
    
    async def _flush_all(self):
        """모든 버퍼 플러시"""
        await self._flush_audit_logs()
        await self._flush_security_events()
    
    async def _flush_audit_logs(self):
        """감사 로그 배치 저장"""
        if not self.buffer:
            return
        
        with self._lock:
            logs_to_save = list(self.buffer)
            self.buffer.clear()
        
        try:
            # 동기 제너레이터이므로 일반 for문 사용
            for session in get_session():
                session.add_all(logs_to_save)
                session.commit()
                break
        except Exception as e:
            logger.error("Failed to save audit logs", error=str(e))
            # 실패한 로그는 다시 버퍼에 추가
            with self._lock:
                self.buffer.extend(logs_to_save)
    
    async def _flush_security_events(self):
        """보안 이벤트 배치 저장"""
        if not self.security_buffer:
            return
        
        with self._lock:
            events_to_save = list(self.security_buffer)
            self.security_buffer.clear()
        
        # 중요 이벤트 정보를 미리 추출 (세션 종료 전에)
        critical_events = []
        for event in events_to_save:
            if event.severity == "CRITICAL":
                # 세션 종료 전에 필요한 데이터 추출
                critical_events.append({
                    "event_type": event.event_type,
                    "description": event.description,
                    "user_id": event.user_id,
                    "ip_address": event.ip_address,
                    "details": event.details
                })
        
        try:
            # 동기 제너레이터이므로 일반 for문 사용
            for session in get_session():
                session.add_all(events_to_save)
                session.commit()
                break
            
            # 세션 종료 후 추출된 데이터로 알림
            for event_data in critical_events:
                await self._send_security_alert_data(event_data)
        
        except Exception as e:
            logger.error("Failed to save security events", error=str(e))
            with self._lock:
                self.security_buffer.extend(events_to_save)
    
    async def _send_security_alert(self, event: SecurityEvent):
        """보안 알림 전송 (레거시 메서드)"""
        await self._send_security_alert_data({
            "event_type": event.event_type,
            "description": event.description,
            "user_id": event.user_id,
            "ip_address": event.ip_address,
            "details": event.details
        })
    
    async def _send_security_alert_data(self, event_data: dict):
        """보안 알림 전송 (딕셔너리 데이터 사용)"""
        # send_security_alert 함수가 없으므로 임시로 로깅만 수행
        logger.error(
            "CRITICAL security alert",
            **event_data
        )

# 전역 감사 로거
audit_logger = AuditLogger()
