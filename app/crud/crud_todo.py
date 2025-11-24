from typing import List, Optional, Any
from fastapi.encoders import jsonable_encoder
from sqlalchemy.orm import Session

from app.crud.base import CRUDBase
from app.models.todo import Todo
from app.schemas.todo import TodoCreate, TodoUpdate

class CRUDTodo(CRUDBase[Todo, TodoCreate, TodoUpdate]):
    def get_multi_by_user(
        self, db: Session, *, user_id: int, skip: int = 0, limit: int = 100
    ) -> List[Todo]:
        return (
            db.query(self.model)
            .filter(Todo.user_id == user_id)
            .order_by(Todo.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

    def create_with_user(
        self, db: Session, *, obj_in: TodoCreate, user_id: int
    ) -> Todo:
        obj_in_data = jsonable_encoder(obj_in)
        db_obj = self.model(**obj_in_data, user_id=user_id)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

todo = CRUDTodo(Todo)
