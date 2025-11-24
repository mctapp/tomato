# app/routes/users.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from typing import List, Optional
from app.models.users import User, Role
from app.schemas.users import UserCreate, UserUpdate, UserResponse, UserListResponse
from app.db import get_session
from app.dependencies.auth import get_super_admin_user, get_admin_user
from app.utils.auth import get_password_hash

router = APIRouter(prefix="/api/users", tags=["users"])

@router.get("", response_model=List[UserListResponse])
async def read_users(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    db: Session = Depends(get_session),
    current_user: User = Depends(get_admin_user)
):
    """관리자 이상만 사용자 목록을 조회할 수 있습니다."""
    query = select(User)
    
    if search:
        query = query.where(
            (User.email.contains(search)) |
            (User.username.contains(search)) |
            (User.full_name.contains(search))
        )
    
    users = db.exec(query.offset(skip).limit(limit)).all()
    return users

@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    user_in: UserCreate,
    db: Session = Depends(get_session),
    current_user: User = Depends(get_super_admin_user)
):
    """슈퍼 관리자만 사용자를 생성할 수 있습니다."""
    db_user = db.exec(select(User).where(User.email == user_in.email)).first()
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    hashed_password = get_password_hash(user_in.password)
    new_user = User(
        email=user_in.email,
        username=user_in.username,
        hashed_password=hashed_password,
        full_name=user_in.full_name,
        is_active=user_in.is_active,
        is_admin=user_in.is_admin,  # 이전 시스템 호환성
        role=user_in.role
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.get("/{user_id}", response_model=UserResponse)
async def read_user(
    user_id: int,
    db: Session = Depends(get_session),
    current_user: User = Depends(get_admin_user)
):
    """관리자 이상만 특정 사용자를 조회할 수 있습니다."""
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return user

@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    user_in: UserUpdate,
    db: Session = Depends(get_session),
    current_user: User = Depends(get_super_admin_user)
):
    """슈퍼 관리자만 사용자 정보를 수정할 수 있습니다."""
    db_user = db.get(User, user_id)
    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # 수정할 사용자 데이터 준비
    update_data = user_in.dict(exclude_unset=True)
    
    # 비밀번호 필드가 있다면 해시 처리
    if "password" in update_data:
        update_data["hashed_password"] = get_password_hash(update_data.pop("password"))
    
    # 사용자 객체 업데이트
    for field, value in update_data.items():
        setattr(db_user, field, value)
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: int,
    db: Session = Depends(get_session),
    current_user: User = Depends(get_super_admin_user)
):
    """슈퍼 관리자만 사용자를 삭제할 수 있습니다."""
    db_user = db.get(User, user_id)
    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # 자기 자신을 삭제하려는 경우 방지
    if db_user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own user account"
        )
    
    db.delete(db_user)
    db.commit()
    return None
