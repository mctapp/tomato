# app/core/security/constants.py
"""보안 관련 상수 정의"""

from enum import Enum
from typing import Set

class UserRole(str, Enum):
    """사용자 역할"""
    SUPER_ADMIN = "super_admin"
    ADMIN = "admin"
    EDITOR = "editor"
    VIEWER = "viewer"
    GUEST = "guest"

class Permission(str, Enum):
    """권한 정의"""
    # 영화 관련
    MOVIE_CREATE = "movie:create"
    MOVIE_READ = "movie:read"
    MOVIE_UPDATE = "movie:update"
    MOVIE_DELETE = "movie:delete"
    
    # 접근성 미디어 관련
    MEDIA_CREATE = "media:create"
    MEDIA_READ = "media:read"
    MEDIA_UPDATE = "media:update"
    MEDIA_DELETE = "media:delete"
    MEDIA_APPROVE = "media:approve"
    
    # 사용자 관리
    USER_CREATE = "user:create"
    USER_READ = "user:read"
    USER_UPDATE = "user:update"
    USER_DELETE = "user:delete"
    USER_MANAGE = "user:manage"
    
    # 시스템 관리
    SYSTEM_CONFIG = "system:config"
    SYSTEM_LOGS = "system:logs"
    SYSTEM_BACKUP = "system:backup"

# 역할별 권한 매핑
ROLE_PERMISSIONS: dict[UserRole, Set[Permission]] = {
    UserRole.SUPER_ADMIN: set(Permission),  # 모든 권한
    UserRole.ADMIN: {
        Permission.MOVIE_CREATE, Permission.MOVIE_READ, Permission.MOVIE_UPDATE, Permission.MOVIE_DELETE,
        Permission.MEDIA_CREATE, Permission.MEDIA_READ, Permission.MEDIA_UPDATE, Permission.MEDIA_DELETE,
        Permission.MEDIA_APPROVE,
        Permission.USER_CREATE, Permission.USER_READ, Permission.USER_UPDATE,
        Permission.SYSTEM_LOGS,
    },
    UserRole.EDITOR: {
        Permission.MOVIE_CREATE, Permission.MOVIE_READ, Permission.MOVIE_UPDATE,
        Permission.MEDIA_CREATE, Permission.MEDIA_READ, Permission.MEDIA_UPDATE,
        Permission.USER_READ,
    },
    UserRole.VIEWER: {
        Permission.MOVIE_READ,
        Permission.MEDIA_READ,
        Permission.USER_READ,
    },
    UserRole.GUEST: {
        Permission.MOVIE_READ,
        Permission.MEDIA_READ,
    }
}

# 보안 이벤트 타입
class SecurityEventType(str, Enum):
    """보안 이벤트 타입"""
    LOGIN_SUCCESS = "login_success"
    LOGIN_FAILED = "login_failed"
    LOGOUT = "logout"
    PASSWORD_CHANGED = "password_changed"
    PASSWORD_RESET = "password_reset"
    ACCOUNT_LOCKED = "account_locked"
    ACCOUNT_UNLOCKED = "account_unlocked"
    MFA_ENABLED = "mfa_enabled"
    MFA_DISABLED = "mfa_disabled"
    API_KEY_CREATED = "api_key_created"
    API_KEY_REVOKED = "api_key_revoked"
    PERMISSION_DENIED = "permission_denied"
    SUSPICIOUS_ACTIVITY = "suspicious_activity"
    DATA_EXPORT = "data_export"
    SYSTEM_ACCESS = "system_access"
    RATE_LIMIT_EXCEEDED = "rate_limit_exceeded"  # 추가

# HTTP 상태 코드
class SecurityHTTPStatus:
    """보안 관련 HTTP 상태 코드"""
    UNAUTHORIZED = 401
    FORBIDDEN = 403
    TOO_MANY_REQUESTS = 429
    
# 정규식 패턴
REGEX_PATTERNS = {
    "email": r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$",
    "strong_password": r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,}$",
    "api_key": r"^[a-zA-Z0-9]{32}$",
    "jwt_token": r"^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$",
}

# 예약된 사용자명 (보안상 사용 금지)
RESERVED_USERNAMES = {
    "admin", "root", "administrator", "system", "superuser",
    "api", "www", "ftp", "mail", "email", "test", "guest",
    "user", "username", "login", "signin", "signup", "register",
    "tomato", "access", "media", "movie", "film",
}

# 민감한 필드 (로깅 시 마스킹 필요)
SENSITIVE_FIELDS = {
    "password", "token", "secret", "api_key", "access_token",
    "refresh_token", "credit_card", "ssn", "pin", "cvv",
    "private_key", "encryption_key", "session_id",
}
