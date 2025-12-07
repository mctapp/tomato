# app/routes/admin_ip_management.py

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlmodel import Session, select
from app.db import get_session, engine
from datetime import datetime, timedelta
from typing import Optional, List
import ipaddress
from app.models.ip_management import (
    AllowedIP,
    AccessLog,
    AllowedIPCreate,
    AllowedIPUpdate,
    AllowedIPResponse,
    AccessLogResponse,
    CurrentIPResponse
)
from app.dependencies.auth import get_current_user
from app.models.users import User, Role

router = APIRouter(prefix="/api/admin/ip-management", tags=["admin-ip-management"])


def validate_ip_or_cidr(ip_string: str) -> bool:
    """IP 주소 또는 CIDR 형식을 검증합니다."""
    try:
        # CIDR 형식인지 확인 (예: 192.168.1.0/24)
        if '/' in ip_string:
            ipaddress.ip_network(ip_string, strict=False)
        else:
            ipaddress.ip_address(ip_string)
        return True
    except ValueError:
        return False


def require_super_admin(current_user: User = Depends(get_current_user)) -> User:
    """SUPER_ADMIN 권한 검증"""
    if current_user.role != Role.SUPER_ADMIN:
        raise HTTPException(
            status_code=403,
            detail="이 기능은 SUPER_ADMIN만 사용할 수 있습니다."
        )
    return current_user


@router.get("/current-ip")
async def get_current_ip(
    request: Request,
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """현재 접속 중인 IP 주소를 반환합니다."""
    # 프록시 헤더에서 실제 IP 추출
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        client_ip = forwarded_for.split(",")[0].strip()
    else:
        client_ip = request.client.host if request.client else "unknown"

    # 등록된 IP인지 확인
    allowed_ip = db.exec(
        select(AllowedIP).where(AllowedIP.ip_address == client_ip)
    ).first()

    return CurrentIPResponse(
        ip_address=client_ip,
        username=allowed_ip.username if allowed_ip else None,
        is_registered=allowed_ip is not None
    )


@router.get("/allowed-ips")
async def list_allowed_ips(
    db: Session = Depends(get_session),
    current_user: User = Depends(require_super_admin)
):
    """등록된 IP 목록을 조회합니다."""
    allowed_ips = db.exec(
        select(AllowedIP).order_by(AllowedIP.created_at.desc())
    ).all()

    return {
        "allowed_ips": [
            {
                "id": ip.id,
                "ip_address": ip.ip_address,
                "username": ip.username,
                "memo": ip.memo,
                "is_active": ip.is_active,
                "created_at": ip.created_at,
                "updated_at": ip.updated_at,
                "created_by": ip.created_by
            }
            for ip in allowed_ips
        ]
    }


@router.post("/allowed-ips")
async def create_allowed_ip(
    ip_data: AllowedIPCreate,
    db: Session = Depends(get_session),
    current_user: User = Depends(require_super_admin)
):
    """새 IP를 등록합니다."""
    # IP 주소 유효성 검증
    if not validate_ip_or_cidr(ip_data.ip_address):
        raise HTTPException(
            status_code=400,
            detail="유효하지 않은 IP 주소 또는 CIDR 형식입니다."
        )

    # 중복 확인
    existing = db.exec(
        select(AllowedIP).where(AllowedIP.ip_address == ip_data.ip_address)
    ).first()

    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"이미 등록된 IP 주소입니다: {ip_data.ip_address}"
        )

    # 새 IP 등록
    new_ip = AllowedIP(
        ip_address=ip_data.ip_address,
        username=ip_data.username,
        memo=ip_data.memo,
        is_active=True,
        created_at=datetime.now(),
        updated_at=datetime.now(),
        created_by=current_user.id
    )

    db.add(new_ip)
    db.commit()
    db.refresh(new_ip)

    return {
        "message": "IP가 등록되었습니다.",
        "id": new_ip.id,
        "ip_address": new_ip.ip_address
    }


@router.put("/allowed-ips/{ip_id}")
async def update_allowed_ip(
    ip_id: int,
    ip_data: AllowedIPUpdate,
    db: Session = Depends(get_session),
    current_user: User = Depends(require_super_admin)
):
    """IP 정보를 수정합니다."""
    allowed_ip = db.get(AllowedIP, ip_id)

    if not allowed_ip:
        raise HTTPException(status_code=404, detail="IP를 찾을 수 없습니다.")

    # 수정할 필드만 업데이트
    if ip_data.username is not None:
        allowed_ip.username = ip_data.username
    if ip_data.memo is not None:
        allowed_ip.memo = ip_data.memo
    if ip_data.is_active is not None:
        allowed_ip.is_active = ip_data.is_active

    allowed_ip.updated_at = datetime.now()

    db.add(allowed_ip)
    db.commit()

    return {"message": "IP 정보가 수정되었습니다."}


@router.delete("/allowed-ips/{ip_id}")
async def delete_allowed_ip(
    ip_id: int,
    db: Session = Depends(get_session),
    current_user: User = Depends(require_super_admin)
):
    """IP를 삭제합니다."""
    allowed_ip = db.get(AllowedIP, ip_id)

    if not allowed_ip:
        raise HTTPException(status_code=404, detail="IP를 찾을 수 없습니다.")

    # 연관된 접속 로그의 allowed_ip_id를 NULL로 설정
    db.exec(
        select(AccessLog).where(AccessLog.allowed_ip_id == ip_id)
    )

    db.delete(allowed_ip)
    db.commit()

    return {"message": f"IP {allowed_ip.ip_address}가 삭제되었습니다."}


@router.put("/allowed-ips/{ip_id}/toggle")
async def toggle_allowed_ip(
    ip_id: int,
    db: Session = Depends(get_session),
    current_user: User = Depends(require_super_admin)
):
    """IP 활성화 상태를 토글합니다."""
    allowed_ip = db.get(AllowedIP, ip_id)

    if not allowed_ip:
        raise HTTPException(status_code=404, detail="IP를 찾을 수 없습니다.")

    allowed_ip.is_active = not allowed_ip.is_active
    allowed_ip.updated_at = datetime.now()

    db.add(allowed_ip)
    db.commit()

    status = "활성화" if allowed_ip.is_active else "비활성화"
    return {"message": f"IP가 {status}되었습니다.", "is_active": allowed_ip.is_active}


@router.get("/access-logs")
async def list_access_logs(
    ip_id: Optional[int] = None,
    page: int = 1,
    limit: int = 50,
    db: Session = Depends(get_session),
    current_user: User = Depends(require_super_admin)
):
    """접속 로그를 조회합니다. (최근 30일)"""
    thirty_days_ago = datetime.now() - timedelta(days=30)

    # 기본 쿼리
    query = select(AccessLog).where(AccessLog.accessed_at >= thirty_days_ago)

    # 특정 IP의 로그만 조회
    if ip_id:
        query = query.where(AccessLog.allowed_ip_id == ip_id)

    # 정렬 및 페이지네이션
    query = query.order_by(AccessLog.accessed_at.desc())

    # 전체 개수 조회
    total_query = select(AccessLog).where(AccessLog.accessed_at >= thirty_days_ago)
    if ip_id:
        total_query = total_query.where(AccessLog.allowed_ip_id == ip_id)

    total_logs = len(db.exec(total_query).all())

    # 페이지네이션 적용
    offset = (page - 1) * limit
    query = query.offset(offset).limit(limit)

    logs = db.exec(query).all()

    return {
        "access_logs": [
            {
                "id": log.id,
                "ip_address": log.ip_address,
                "username": log.username,
                "request_path": log.request_path,
                "request_method": log.request_method,
                "user_agent": log.user_agent,
                "status_code": log.status_code,
                "accessed_at": log.accessed_at
            }
            for log in logs
        ],
        "total": total_logs,
        "page": page,
        "limit": limit,
        "total_pages": (total_logs + limit - 1) // limit
    }


@router.get("/access-logs/by-ip/{ip_address}")
async def get_logs_by_ip_address(
    ip_address: str,
    page: int = 1,
    limit: int = 50,
    db: Session = Depends(get_session),
    current_user: User = Depends(require_super_admin)
):
    """특정 IP 주소의 접속 로그를 조회합니다."""
    thirty_days_ago = datetime.now() - timedelta(days=30)

    query = select(AccessLog).where(
        AccessLog.ip_address == ip_address,
        AccessLog.accessed_at >= thirty_days_ago
    ).order_by(AccessLog.accessed_at.desc())

    # 전체 개수
    total_logs = len(db.exec(
        select(AccessLog).where(
            AccessLog.ip_address == ip_address,
            AccessLog.accessed_at >= thirty_days_ago
        )
    ).all())

    # 페이지네이션
    offset = (page - 1) * limit
    query = query.offset(offset).limit(limit)

    logs = db.exec(query).all()

    return {
        "access_logs": [
            {
                "id": log.id,
                "ip_address": log.ip_address,
                "username": log.username,
                "request_path": log.request_path,
                "request_method": log.request_method,
                "user_agent": log.user_agent,
                "status_code": log.status_code,
                "accessed_at": log.accessed_at
            }
            for log in logs
        ],
        "total": total_logs,
        "page": page,
        "limit": limit,
        "total_pages": (total_logs + limit - 1) // limit
    }


@router.delete("/access-logs")
async def delete_all_access_logs(
    db: Session = Depends(get_session),
    current_user: User = Depends(require_super_admin)
):
    """모든 접속 로그를 삭제합니다."""
    # 모든 접속 로그 삭제
    logs = db.exec(select(AccessLog)).all()
    count = len(logs)

    for log in logs:
        db.delete(log)

    db.commit()

    return {"message": f"{count}개의 접속 로그가 삭제되었습니다."}


@router.delete("/access-logs/by-ip/{ip_id}")
async def delete_access_logs_by_ip(
    ip_id: int,
    db: Session = Depends(get_session),
    current_user: User = Depends(require_super_admin)
):
    """특정 IP의 접속 로그를 삭제합니다."""
    logs = db.exec(
        select(AccessLog).where(AccessLog.allowed_ip_id == ip_id)
    ).all()
    count = len(logs)

    for log in logs:
        db.delete(log)

    db.commit()

    return {"message": f"{count}개의 접속 로그가 삭제되었습니다."}


@router.get("/stats")
async def get_ip_stats(
    db: Session = Depends(get_session),
    current_user: User = Depends(require_super_admin)
):
    """IP 관리 통계를 조회합니다."""
    from app.core.redis import redis_client

    # 전체 등록된 IP 수
    total_ips = len(db.exec(select(AllowedIP)).all())

    # 활성화된 IP 수
    active_ips = len(db.exec(
        select(AllowedIP).where(AllowedIP.is_active == True)
    ).all())

    # 최근 30일 접속 로그 수
    thirty_days_ago = datetime.now() - timedelta(days=30)
    recent_logs = len(db.exec(
        select(AccessLog).where(AccessLog.accessed_at >= thirty_days_ago)
    ).all())

    # 오늘 접속 수
    today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    today_logs = len(db.exec(
        select(AccessLog).where(AccessLog.accessed_at >= today_start)
    ).all())

    # 현재 활성 세션 수
    active_sessions = 0
    try:
        await redis_client.ensure_connected()
        cursor = 0
        while True:
            cursor, keys = await redis_client.redis.scan(
                cursor,
                match="session:*",
                count=100
            )
            for key in keys:
                try:
                    session_data = await redis_client.redis.get(key)
                    if session_data:
                        import json
                        session = json.loads(session_data)
                        expires_at = datetime.fromisoformat(session.get("expires_at", "").replace("Z", "+00:00"))
                        if expires_at > datetime.now(expires_at.tzinfo):
                            active_sessions += 1
                except Exception:
                    continue
            if cursor == 0:
                break
    except Exception as e:
        print(f"활성 세션 수 조회 오류: {e}")

    return {
        "total_ips": total_ips,
        "active_ips": active_ips,
        "inactive_ips": total_ips - active_ips,
        "recent_logs_30d": recent_logs,
        "today_logs": today_logs,
        "active_sessions": active_sessions
    }


@router.get("/active-sessions")
async def get_active_sessions(
    current_user: User = Depends(require_super_admin)
):
    """현재 활성 세션 목록을 조회합니다."""
    from app.core.redis import redis_client
    from app.models.users import User as UserModel

    try:
        await redis_client.ensure_connected()

        active_sessions = []
        cursor = 0

        # Redis에서 모든 세션 스캔
        while True:
            cursor, keys = await redis_client.redis.scan(
                cursor,
                match="session:*",
                count=100
            )

            for key in keys:
                try:
                    session_data = await redis_client.redis.get(key)
                    if session_data:
                        import json
                        session = json.loads(session_data)

                        # 만료되지 않은 세션만 포함
                        expires_at = datetime.fromisoformat(session.get("expires_at", "").replace("Z", "+00:00"))
                        if expires_at > datetime.now(expires_at.tzinfo):
                            active_sessions.append({
                                "session_id": session.get("session_id", "")[:8] + "...",  # 보안을 위해 일부만
                                "user_id": session.get("user_id"),
                                "ip_address": session.get("ip_address"),
                                "device_name": session.get("device_name"),
                                "device_type": session.get("device_type"),
                                "last_activity": session.get("last_activity"),
                                "created_at": session.get("created_at"),
                                "location": session.get("location")
                            })
                except Exception as e:
                    print(f"세션 파싱 오류: {e}")
                    continue

            if cursor == 0:
                break

        # 사용자 정보 조회
        user_ids = list(set(s["user_id"] for s in active_sessions if s.get("user_id")))

        user_map = {}
        if user_ids:
            with Session(engine) as db:
                users = db.exec(select(UserModel).where(UserModel.id.in_(user_ids))).all()
                user_map = {u.id: {"username": u.username, "name": u.name} for u in users}

        # 사용자 정보 병합
        for session in active_sessions:
            user_info = user_map.get(session["user_id"], {})
            session["username"] = user_info.get("username", "알 수 없음")
            session["name"] = user_info.get("name", "")

        # 최근 활동 순으로 정렬
        active_sessions.sort(
            key=lambda s: s.get("last_activity", ""),
            reverse=True
        )

        return {
            "active_sessions": active_sessions,
            "total_count": len(active_sessions)
        }

    except Exception as e:
        print(f"활성 세션 조회 오류: {e}")
        return {
            "active_sessions": [],
            "total_count": 0,
            "error": str(e)
        }
