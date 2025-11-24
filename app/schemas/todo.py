from datetime import datetime
from typing import Optional
from pydantic import BaseModel

# Todo 기본 스키마
class TodoBase(BaseModel):
    title: str
    is_completed: bool = False

# Todo 생성 스키마
class TodoCreate(TodoBase):
    pass

# Todo 업데이트 스키마
class TodoUpdate(BaseModel):
    title: Optional[str] = None
    is_completed: Optional[bool] = None

# Todo 응답 스키마
class Todo(TodoBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        orm_mode = True
