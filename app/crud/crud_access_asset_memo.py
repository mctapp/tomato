# app/crud/crud_access_asset_memo.py
from typing import List
from sqlalchemy.orm import Session
from app.crud.base import CRUDBase
from app.models.access_asset_memo import AccessAssetMemo
from app.schemas.access_asset import AccessAssetMemoCreate, AccessAssetMemoInDB

class CRUDAccessAssetMemo(CRUDBase[AccessAssetMemo, AccessAssetMemoCreate, AccessAssetMemoInDB]):
    def get_by_asset(self, db: Session, asset_id: int) -> List[AccessAssetMemo]:
        return db.query(self.model)\
            .filter(self.model.access_asset_id == asset_id)\
            .order_by(self.model.created_at.desc())\
            .all()

crud_access_asset_memo = CRUDAccessAssetMemo(AccessAssetMemo)
