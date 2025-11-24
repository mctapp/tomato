from typing import List, Optional
from sqlalchemy.orm import Session
from app.crud.base import CRUDBase
from app.models.access_lang import AccessLang
from app.schemas.access_lang import AccessLangCreate, AccessLangUpdate

class CRUDAccessLang(CRUDBase[AccessLang, AccessLangCreate, AccessLangUpdate]):
    def get_active(self, db: Session, *, skip: int = 0, limit: int = 100) -> List[AccessLang]:
        return db.query(self.model)\
            .filter(AccessLang.is_active == True)\
            .order_by(AccessLang.display_order.asc(), AccessLang.code.asc())\
            .offset(skip)\
            .limit(limit)\
            .all()
    
    def get_by_code(self, db: Session, *, code: str) -> Optional[AccessLang]:
        return db.query(self.model).filter(AccessLang.code == code).first()
    
    def get_default(self, db: Session) -> Optional[AccessLang]:
        return db.query(self.model).filter(AccessLang.is_default == True).first()
    
    def unset_all_defaults(self, db: Session) -> None:
        db.query(self.model).update({AccessLang.is_default: False})
        db.commit()

access_lang = CRUDAccessLang(AccessLang)
