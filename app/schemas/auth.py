from pydantic import BaseModel, EmailStr
from typing import Optional

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenPayload(BaseModel):
    sub: Optional[int] = None

class UserLogin(BaseModel):
    username: str  # 실제로는 이메일
    password: str

class UserCreate(BaseModel):
    email: EmailStr
    username: str  # 추가
    password: str
    full_name: Optional[str] = None

class UserResponse(BaseModel):
    id: int
    email: str
    username: str  # 추가
    is_active: bool
    is_admin: bool  # is_superuser에서 변경
    full_name: Optional[str] = None

    class Config:
        from_attributes = True
