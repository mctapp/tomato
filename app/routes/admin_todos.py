from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from typing import List, Optional
from datetime import datetime

from app.models.todos import Todo
from app.models.users import User
from app.schemas.todos import TodoCreate, TodoUpdate, TodoResponse
from app.db import get_session
from app.dependencies.auth import get_current_user

router = APIRouter(prefix="/admin/api/todos", tags=["todos"])

@router.get("", response_model=List[TodoResponse])
async def read_todos(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """현재 로그인한 사용자의 할 일 목록을 조회합니다."""
    query = select(Todo).where(Todo.user_id == current_user.id).order_by(Todo.created_at.desc())
    todos = db.exec(query.offset(skip).limit(limit)).all()
    return todos

@router.post("", response_model=TodoResponse, status_code=status.HTTP_201_CREATED)
async def create_todo(
    todo_in: TodoCreate,
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """새로운 할 일을 생성합니다."""
    new_todo = Todo(
        title=todo_in.title,
        is_completed=todo_in.is_completed,
        user_id=current_user.id
    )
    
    db.add(new_todo)
    db.commit()
    db.refresh(new_todo)
    return new_todo

@router.get("/{todo_id}", response_model=TodoResponse)
async def read_todo(
    todo_id: int,
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """특정 할 일을 조회합니다."""
    todo = db.get(Todo, todo_id)
    if not todo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Todo not found"
        )
    
    # 본인의 할 일만 조회 가능
    if todo.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden"
        )
    
    return todo

@router.put("/{todo_id}", response_model=TodoResponse)
async def update_todo(
    todo_id: int,
    todo_in: TodoUpdate,
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """할 일을 수정합니다."""
    todo = db.get(Todo, todo_id)
    if not todo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Todo not found"
        )
    
    # 본인의 할 일만 수정 가능
    if todo.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden"
        )
    
    # 수정할 데이터 준비
    update_data = todo_in.dict(exclude_unset=True)
    
    # Todo 객체 업데이트
    for field, value in update_data.items():
        setattr(todo, field, value)
    
    db.add(todo)
    db.commit()
    db.refresh(todo)
    return todo

@router.delete("/{todo_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_todo(
    todo_id: int,
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """할 일을 삭제합니다."""
    todo = db.get(Todo, todo_id)
    if not todo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Todo not found"
        )
    
    # 본인의 할 일만 삭제 가능
    if todo.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden"
        )
    
    db.delete(todo)
    db.commit()
    return None
