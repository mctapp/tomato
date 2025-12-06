# app/middleware/ip_filter.py
from fastapi import Request, Response, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from typing import Set, List, Optional
import ipaddress
import os
from app.core.redis import redis_client
from app.monitoring.logging.structured import logger
from datetime import datetime, timedelta

# 환경변수로 IP 필터 활성화 여부 제어
# 프로덕션에서는 기본 활성화, 개발 환경에서는 비활성화 가능
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
ENABLE_IP_FILTER = os.getenv("ENABLE_IP_FILTER", "true").lower() == "true"

# 프로덕션에서는 항상 활성화 (환경변수 무시)
if ENVIRONMENT == "production":
    ENABLE_IP_FILTER = True


class IPFilterMiddleware(BaseHTTPMiddleware):
    """IP 기반 접근 제어"""

    def __init__(self, app):
        super().__init__(app)

        # 정적 규칙 (설정 파일에서 로드)
        self.whitelist: Set[ipaddress.IPv4Network] = set()
        self.blacklist: Set[ipaddress.IPv4Network] = set()
        self.admin_only_paths = ["/admin/api"]  # /admin은 프론트엔드, /admin/api만 보호
        self.blocked_countries = []  # 차단할 국가 코드 리스트
        self.enabled = ENABLE_IP_FILTER

        # DB에서 로드된 IP 목록 캐시
        self.db_whitelist: dict = {}  # {ip_address: username}
        self.db_whitelist_loaded = False

        if self.enabled:
            print("🔒 IP Filter: ENABLED")
        else:
            print("⚠️  IP Filter: DISABLED (development mode)")

    async def startup(self):
        """IP 규칙 로드"""
        await self._load_ip_rules()
        await self._load_db_whitelist()

    async def dispatch(self, request: Request, call_next):
        # IP 필터가 비활성화된 경우 (개발 환경에서만 가능)
        if not self.enabled:
            return await call_next(request)

        # Redis 연결 확인
        try:
            await redis_client.ensure_connected()
        except Exception as e:
            print(f"⚠️ Redis connection failed in IP filter: {e}")
            # Redis가 연결되지 않았을 때는 기본 동작으로 진행
            return await call_next(request)

        client_ip = self._get_client_ip(request)

        # 1. 블랙리스트 확인
        if await self._is_blacklisted(client_ip):
            raise HTTPException(status_code=403, detail="Access denied")

        # 2. 관리자 경로 접근 제어
        if self._is_admin_path(request.url.path):
            if not await self._is_whitelisted(client_ip):
                raise HTTPException(
                    status_code=403,
                    detail="Admin access requires whitelisted IP"
                )

        # 3. 지리적 위치 확인 (선택사항)
        country = await self._get_geo_location(client_ip)
        if country in self.blocked_countries:
            raise HTTPException(status_code=403, detail="Access denied from your region")

        # 요청 처리
        request.state.client_ip = client_ip
        request.state.client_country = country

        response = await call_next(request)

        # 4. 접속 로그 기록 (관리자 경로인 경우)
        if self._is_admin_path(request.url.path):
            try:
                await self._log_access(client_ip, request, response)
            except Exception as e:
                print(f"⚠️ Access log failed: {e}")

        # 5. 의심스러운 활동 감지
        try:
            await self._analyze_behavior(client_ip, request, response)
        except Exception as e:
            print(f"⚠️ Behavior analysis failed: {e}")

        return response

    def _get_client_ip(self, request: Request) -> str:
        """실제 클라이언트 IP 추출"""
        # 프록시 헤더 확인
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            # 첫 번째 IP가 실제 클라이언트
            return forwarded_for.split(",")[0].strip()

        # 직접 연결
        return request.client.host if request.client else "unknown"

    def _is_admin_path(self, path: str) -> bool:
        """관리자 경로 확인"""
        return any(path.startswith(admin_path) for admin_path in self.admin_only_paths)

    async def _load_ip_rules(self):
        """정적 IP 규칙 로드"""
        # 기본 화이트리스트 (로컬 및 사설 IP 대역)
        self.whitelist.add(ipaddress.ip_network("127.0.0.1/32"))
        self.whitelist.add(ipaddress.ip_network("10.0.0.0/8"))
        self.whitelist.add(ipaddress.ip_network("172.16.0.0/12"))
        self.whitelist.add(ipaddress.ip_network("192.168.0.0/16"))

        # 기존 하드코딩된 IP도 유지 (마이그레이션 기간)
        self.whitelist.add(ipaddress.ip_network("182.31.49.187/32"))
        self.whitelist.add(ipaddress.ip_network("223.39.84.134/32"))

    async def _load_db_whitelist(self):
        """DB에서 IP 화이트리스트 로드"""
        try:
            from app.db import engine
            from sqlmodel import Session, select
            from app.models.ip_management import AllowedIP

            with Session(engine) as db:
                allowed_ips = db.exec(
                    select(AllowedIP).where(AllowedIP.is_active == True)
                ).all()

                for ip_record in allowed_ips:
                    self.db_whitelist[ip_record.ip_address] = {
                        "id": ip_record.id,
                        "username": ip_record.username
                    }

                self.db_whitelist_loaded = True
                print(f"✅ Loaded {len(self.db_whitelist)} IPs from database")
        except Exception as e:
            print(f"⚠️ Failed to load IP whitelist from DB: {e}")
            # DB 로드 실패해도 정적 화이트리스트로 동작

    async def reload_db_whitelist(self):
        """DB 화이트리스트 재로드 (IP 추가/삭제 시 호출)"""
        self.db_whitelist = {}
        await self._load_db_whitelist()

    async def _is_blacklisted(self, ip: str) -> bool:
        """블랙리스트 확인"""
        try:
            # Redis에서 동적 블랙리스트 확인
            is_blacklisted = await redis_client.redis.sismember("ip:blacklist", ip)
            if is_blacklisted:
                return True
        except Exception:
            # Redis 에러시 정적 블랙리스트만 확인
            pass

        # 정적 블랙리스트 확인
        try:
            ip_addr = ipaddress.ip_address(ip)
            return any(ip_addr in network for network in self.blacklist)
        except ValueError:
            return True  # 잘못된 IP는 차단

    async def _is_whitelisted(self, ip: str) -> bool:
        """화이트리스트 확인 (DB + 정적 + Redis)"""
        # 1. DB 화이트리스트 확인 (CIDR 포함)
        if self.db_whitelist_loaded:
            for db_ip in self.db_whitelist.keys():
                try:
                    # CIDR 형식인 경우
                    if '/' in db_ip:
                        network = ipaddress.ip_network(db_ip, strict=False)
                        if ipaddress.ip_address(ip) in network:
                            return True
                    # 단일 IP인 경우
                    elif db_ip == ip:
                        return True
                except ValueError:
                    continue

        # 2. Redis에서 동적 화이트리스트 확인
        try:
            is_whitelisted = await redis_client.redis.sismember("ip:whitelist", ip)
            if is_whitelisted:
                return True
        except Exception:
            pass

        # 3. 정적 화이트리스트 확인
        try:
            ip_addr = ipaddress.ip_address(ip)
            return any(ip_addr in network for network in self.whitelist)
        except ValueError:
            return False

    async def _get_geo_location(self, ip: str) -> Optional[str]:
        """IP 지리적 위치 확인"""
        # TODO: 실제 구현 시 GeoIP 서비스 사용
        return None

    async def _log_access(self, ip: str, request: Request, response: Response):
        """접속 로그 기록"""
        try:
            from app.db import engine
            from sqlmodel import Session
            from app.models.ip_management import AccessLog

            # 사용자명 조회
            username = None
            allowed_ip_id = None

            if ip in self.db_whitelist:
                username = self.db_whitelist[ip].get("username")
                allowed_ip_id = self.db_whitelist[ip].get("id")
            else:
                # CIDR 매칭된 경우에도 사용자명 찾기
                for db_ip, info in self.db_whitelist.items():
                    try:
                        if '/' in db_ip:
                            network = ipaddress.ip_network(db_ip, strict=False)
                            if ipaddress.ip_address(ip) in network:
                                username = info.get("username")
                                allowed_ip_id = info.get("id")
                                break
                    except ValueError:
                        continue

            # 로그 기록
            with Session(engine) as db:
                access_log = AccessLog(
                    ip_address=ip,
                    username=username,
                    request_path=str(request.url.path),
                    request_method=request.method,
                    user_agent=request.headers.get("User-Agent", "")[:500],
                    status_code=response.status_code,
                    accessed_at=datetime.now(),
                    allowed_ip_id=allowed_ip_id
                )
                db.add(access_log)
                db.commit()
        except Exception as e:
            print(f"⚠️ Failed to log access: {e}")

    async def _analyze_behavior(self, ip: str, request: Request, response: Response):
        """의심스러운 행동 분석"""
        # 404 에러 누적
        if response.status_code == 404:
            key = f"404_count:{ip}"
            count = await redis_client.redis.incr(key)
            await redis_client.redis.expire(key, 300)  # 5분

            if count > 50:  # 5분 내 50번 이상 404
                await self._add_to_blacklist(ip, "Excessive 404 errors")

        # SQL Injection 패턴 감지
        if self._detect_sql_injection(request):
            await self._add_to_blacklist(ip, "SQL injection attempt")

        # 스캔 도구 감지
        user_agent = request.headers.get("User-Agent", "")
        if self._is_scanner(user_agent):
            await self._add_to_blacklist(ip, f"Scanner detected: {user_agent}")

    def _detect_sql_injection(self, request: Request) -> bool:
        """SQL Injection 패턴 감지"""
        patterns = [
            "union select", "or 1=1", "'; drop table",
            "select * from", "insert into", "delete from"
        ]

        # URL 파라미터 확인
        query_string = str(request.url.query).lower()
        return any(pattern in query_string for pattern in patterns)

    def _is_scanner(self, user_agent: str) -> bool:
        """스캐너 도구 감지"""
        scanners = [
            "sqlmap", "nikto", "nmap", "masscan",
            "zap", "burp", "acunetix", "nessus"
        ]
        user_agent_lower = user_agent.lower()
        return any(scanner in user_agent_lower for scanner in scanners)

    async def _add_to_blacklist(self, ip: str, reason: str):
        """동적 블랙리스트 추가"""
        try:
            await redis_client.redis.sadd("ip:blacklist", ip)
            await redis_client.redis.setex(
                f"blacklist:reason:{ip}",
                86400,  # 24시간
                reason
            )
        except Exception as e:
            print(f"⚠️ Failed to add to blacklist: {e}")

        # 보안 이벤트 로깅
        logger.warning(
            "ip_blacklisted",
            ip=ip,
            reason=reason,
            timestamp=datetime.utcnow()
        )
