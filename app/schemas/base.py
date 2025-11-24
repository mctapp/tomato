from pydantic import BaseModel, ConfigDict
from typing import Any, Dict, Generic, TypeVar, List
from datetime import datetime

def to_camel(string: str) -> str:
    """snake_case를 camelCase로 변환"""
    components = string.split('_')
    return components[0] + ''.join(x.title() for x in components[1:])

class BaseSchema(BaseModel):
    """모든 스키마의 베이스 클래스"""
    model_config = ConfigDict(
        from_attributes=True,  # ORM 객체에서 변환 가능
        populate_by_name=True,  # alias 이름으로도 데이터 설정 가능
        alias_generator=to_camel,  # 자동으로 camelCase 변환
        protected_namespaces=(),  # protected namespace 비활성화
        json_encoders={
            datetime: lambda dt: dt.isoformat() if dt else None
        }
    )

    def model_dump(self, **kwargs) -> Dict[str, Any]:
        data = super().model_dump(**kwargs)
        # datetime 필드를 ISO 형식으로 변환
        for key, value in list(data.items()):
            if isinstance(value, datetime):
                data[key] = value.isoformat()
        return data

class BaseSchemaWithAlias(BaseSchema):
    """명시적 alias가 필요한 경우의 베이스 클래스"""
    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
        # alias_generator는 사용하지 않음 (명시적 alias 사용)
    )

# 페이지네이션 메타 스키마
class PaginationMeta(BaseSchema):
    total: int
    page: int
    limit: int
    total_pages: int
    has_next: bool
    has_prev: bool

# 제네릭 타입 정의
T = TypeVar('T')

# 페이지네이션 응답 스키마
class PaginatedResponse(BaseSchema, Generic[T]):
    data: List[T]
    pagination: PaginationMeta
