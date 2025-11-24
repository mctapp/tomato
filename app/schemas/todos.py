
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class TodoBase(BaseModel):
    title: str
    is_completed: bool = False

class TodoCreate(TodoBase):
    pass

class TodoUpdate(BaseModel):
    title: Optional[str] = None
    is_completed: Optional[bool] = None

class TodoResponse(TodoBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        orm_mode = True
