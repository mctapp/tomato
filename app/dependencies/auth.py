# app/dependencies/auth.py
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from app.utils.security import decode_token
from app.models.users import User, Role
from sqlmodel import Session, select
from app.db import get_session
from typing import Optional

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/token", auto_error=False)

# 역할 계층 구조 정의
ROLE_HIERARCHY = {
   Role.SUPER_ADMIN: 4,
   Role.ADMIN: 3,
   Role.EDITOR: 2,
   Role.USER: 1
}

async def get_current_user(
    request: Request,
    token: Optional[str] = Depends(oauth2_scheme), 
    db: Session = Depends(get_session)
):
   """쿠키 또는 Bearer 토큰에서 현재 사용자 가져오기"""
   credentials_exception = HTTPException(
       status_code=status.HTTP_401_UNAUTHORIZED,
       detail="Invalid authentication credentials",
       headers={"WWW-Authenticate": "Bearer"},
   )
   
   # 1. 쿠키에서 토큰 확인
   auth_token = request.cookies.get("access_token")
   
   # 2. 쿠키에 없으면 Authorization 헤더 확인 (API 클라이언트 지원)
   if not auth_token and token:
       auth_token = token
   
   if not auth_token:
       raise credentials_exception
   
   try:
       payload = decode_token(auth_token)
       user_id = payload.get("sub")
       if user_id is None:
           raise credentials_exception
   except JWTError:
       raise credentials_exception
   
   # user_id를 정수로 변환하여 조회
   user = db.exec(select(User).where(User.id == int(user_id))).first()
   if user is None:
       raise credentials_exception
   return user

async def get_current_active_user(current_user: User = Depends(get_current_user)):
   if not current_user.is_active:
       raise HTTPException(status_code=400, detail="Inactive user")
   return current_user

async def get_current_admin_user(current_user: User = Depends(get_current_user)):
   if not current_user.is_admin:
       raise HTTPException(
           status_code=status.HTTP_403_FORBIDDEN,
           detail="Not enough permissions"
       )
   return current_user

async def check_user_role(current_user: User = Depends(get_current_active_user), required_role: Role = Role.USER):
   """
   사용자의 역할이 요구되는 최소 역할 이상인지 확인합니다.
   """
   if ROLE_HIERARCHY.get(current_user.role, 0) < ROLE_HIERARCHY.get(required_role, 0):
       raise HTTPException(
           status_code=status.HTTP_403_FORBIDDEN,
           detail=f"Role {required_role.value} or higher required"
       )
   return current_user

# 각 역할별 의존성 함수 생성
async def get_super_admin_user(current_user: User = Depends(get_current_active_user)):
   if current_user.role != Role.SUPER_ADMIN:
       raise HTTPException(
           status_code=status.HTTP_403_FORBIDDEN,
           detail="Super Admin role required"
       )
   return current_user

async def get_admin_user(current_user: User = Depends(get_current_active_user)):
   if ROLE_HIERARCHY.get(current_user.role, 0) < ROLE_HIERARCHY.get(Role.ADMIN, 0):
       raise HTTPException(
           status_code=status.HTTP_403_FORBIDDEN,
           detail="Admin role or higher required"
       )
   return current_user

async def get_editor_user(current_user: User = Depends(get_current_active_user)):
   if ROLE_HIERARCHY.get(current_user.role, 0) < ROLE_HIERARCHY.get(Role.EDITOR, 0):
       raise HTTPException(
           status_code=status.HTTP_403_FORBIDDEN,
           detail="Editor role or higher required"
       )
   return current_user
