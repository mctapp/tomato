from typing import List, Optional
from sqlalchemy.orm import Session
from app.crud.base import CRUDBase
from app.models.access_type import AccessType
from app.schemas.access_type import AccessTypeCreate, AccessTypeUpdate

class CRUDAccessType(CRUDBase[AccessType, AccessTypeCreate, AccessTypeUpdate]):
    def get_active(self, db: Session, *, skip: int = 0, limit: int = 100) -> List[AccessType]:
        return db.query(self.model)\
            .filter(AccessType.is_active == True)\
            .order_by(AccessType.display_order.asc(), AccessType.code.asc())\
            .offset(skip)\
            .limit(limit)\
            .all()
    
    def get_by_code(self, db: Session, *, code: str) -> Optional[AccessType]:
        return db.query(self.model).filter(AccessType.code == code).first()
    
    def get_by_category(self, db: Session, *, category: str) -> List[AccessType]:
        return db.query(self.model)\
            .filter(AccessType.category == category)\
            .filter(AccessType.is_active == True)\
            .order_by(AccessType.display_order.asc())\
            .all()

access_type = CRUDAccessType(AccessType)
