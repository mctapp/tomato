# app/api/keys/permissions.py
from typing import List, Dict, Optional
from app.models.api_keys import APIKey, APIKeyScope
from app.models.users import User, Role
from app.core.security.constants import Permission, ROLE_PERMISSIONS
import json

class APIKeyPermissionManager:
    """API 키 권한 관리"""
    
    def __init__(self):
        # 스코프와 권한 매핑
        self.scope_permissions = {
            APIKeyScope.READ: [
                Permission.MOVIE_READ,
                Permission.MEDIA_READ,
                Permission.USER_READ
            ],
            APIKeyScope.WRITE: [
                Permission.MOVIE_CREATE,
                Permission.MOVIE_UPDATE,
                Permission.MEDIA_CREATE,
                Permission.MEDIA_UPDATE,
            ],
            APIKeyScope.DELETE: [
                Permission.MOVIE_DELETE,
                Permission.MEDIA_DELETE,
            ],
            APIKeyScope.ADMIN: list(Permission)  # 모든 권한
        }
        
        # 엔드포인트별 필요 스코프
        self.endpoint_scopes = {
            # 읽기 전용
            ("GET", "/api/movies"): APIKeyScope.READ,
            ("GET", "/api/movies/{id}"): APIKeyScope.READ,
            ("GET", "/api/media"): APIKeyScope.READ,
            
            # 쓰기 필요
            ("POST", "/api/movies"): APIKeyScope.WRITE,
            ("PUT", "/api/movies/{id}"): APIKeyScope.WRITE,
            ("POST", "/api/media/upload"): APIKeyScope.WRITE,
            
            # 삭제 필요
            ("DELETE", "/api/movies/{id}"): APIKeyScope.DELETE,
            ("DELETE", "/api/media/{id}"): APIKeyScope.DELETE,
            
            # 관리자 전용
            ("*", "/api/admin/*"): APIKeyScope.ADMIN,
            ("*", "/api/users/*"): APIKeyScope.ADMIN,
        }
    
    def check_endpoint_permission(
        self,
        api_key: APIKey,
        method: str,
        path: str
    ) -> tuple[bool, Optional[str]]:
        """엔드포인트 접근 권한 확인"""
        # API 키 스코프 로드
        key_scopes = [APIKeyScope(s) for s in json.loads(api_key.scopes)]
        
        # 필요한 스코프 확인
        required_scope = self._get_required_scope(method, path)
        if not required_scope:
            return True, None  # 제한 없음
        
        # ADMIN 스코프는 모든 권한
        if APIKeyScope.ADMIN in key_scopes:
            return True, None
        
        # 스코프 확인
        if required_scope not in key_scopes:
            return False, f"Missing required scope: {required_scope.value}"
        
        return True, None
    
    def _get_required_scope(self, method: str, path: str) -> Optional[APIKeyScope]:
        """엔드포인트에 필요한 스코프 조회"""
        # 정확한 매치
        key = (method, path)
        if key in self.endpoint_scopes:
            return self.endpoint_scopes[key]
        
        # 패턴 매치
        for (pattern_method, pattern_path), scope in self.endpoint_scopes.items():
            if pattern_method == "*" or pattern_method == method:
                if self._match_path_pattern(path, pattern_path):
                    return scope
        
        # 기본값: 읽기는 자유, 나머지는 쓰기 필요
        if method == "GET":
            return APIKeyScope.READ
        else:
            return APIKeyScope.WRITE
    
    def _match_path_pattern(self, path: str, pattern: str) -> bool:
        """경로 패턴 매칭"""
        if pattern.endswith("/*"):
            prefix = pattern[:-2]
            return path.startswith(prefix)
        elif "{" in pattern:
            # 파라미터 패턴
            pattern_parts = pattern.split("/")
            path_parts = path.split("/")
            
            if len(pattern_parts) != len(path_parts):
                return False
            
            for pp, p in zip(pattern_parts, path_parts):
                if pp.startswith("{") and pp.endswith("}"):
                    continue  # 파라미터
                elif pp != p:
                    return False
            
            return True
        else:
            return path == pattern
    
    def get_effective_permissions(self, api_key: APIKey) -> set[Permission]:
        """API 키의 실제 권한 목록"""
        key_scopes = [APIKeyScope(s) for s in json.loads(api_key.scopes)]
        permissions = set()
        
        for scope in key_scopes:
            if scope in self.scope_permissions:
                permissions.update(self.scope_permissions[scope])
        
        return permissions
    
    def can_create_key(self, user: User, requested_scopes: List[APIKeyScope]) -> bool:
        """사용자가 요청한 스코프의 API 키를 생성할 수 있는지 확인"""
        # 관리자만 ADMIN 스코프 키 생성 가능
        if APIKeyScope.ADMIN in requested_scopes:
            return user.role in [Role.ADMIN, Role.SUPER_ADMIN]
        
        # 일반 사용자는 READ/WRITE 스코프만
        if user.role == Role.USER:
            allowed_scopes = [APIKeyScope.READ]
        elif user.role == Role.EDITOR:
            allowed_scopes = [APIKeyScope.READ, APIKeyScope.WRITE]
        else:
            allowed_scopes = list(APIKeyScope)
        
        return all(scope in allowed_scopes for scope in requested_scopes)
    
    async def update_key_permissions(
        self,
        db,
        api_key: APIKey,
        new_scopes: List[APIKeyScope],
        updater: User
    ) -> bool:
        """API 키 권한 업데이트"""
        # 권한 확인
        if not self.can_create_key(updater, new_scopes):
            return False
        
        # 업데이트
        api_key.scopes = json.dumps([scope.value for scope in new_scopes])
        api_key.updated_at = datetime.utcnow()
        
        db.add(api_key)
        db.commit()
        
        # 캐시 무효화
        from app.api.keys.rotation import key_rotation_manager
        await key_rotation_manager._invalidate_key_cache(api_key)
        
        return True

# 전역 권한 관리자
api_key_permission_manager = APIKeyPermissionManager()
