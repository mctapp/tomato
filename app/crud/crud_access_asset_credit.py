# app/crud/crud_access_asset_credit.py
from typing import List
from sqlalchemy.orm import Session
from app.crud.base import CRUDBase
from app.models.access_asset_credit import AccessAssetCredit
from app.schemas.access_asset import AccessAssetCreditCreate, AccessAssetCreditInDB

class CRUDAccessAssetCredit(CRUDBase[AccessAssetCredit, AccessAssetCreditCreate, AccessAssetCreditInDB]):
    def get_by_asset(self, db: Session, asset_id: int) -> List[AccessAssetCredit]:
        return db.query(self.model)\
            .filter(self.model.access_asset_id == asset_id)\
            .order_by(self.model.sequence_number)\
            .all()
    
    def reorder(self, db: Session, asset_id: int, credit_ids: List[int]) -> List[AccessAssetCredit]:
        credits = db.query(self.model)\
            .filter(self.model.access_asset_id == asset_id)\
            .all()
        
        credit_dict = {credit.id: credit for credit in credits}
        
        for index, credit_id in enumerate(credit_ids):
            if credit_id in credit_dict:
                credit_dict[credit_id].sequence_number = index + 1
        
        db.commit()
        
        return self.get_by_asset(db, asset_id)

access_asset_credit = CRUDAccessAssetCredit(AccessAssetCredit)

