from datetime import datetime
from typing import List, Optional, Union, Dict, Any # Union, Dict, Any 추가
from sqlmodel import Session, select # sqlmodel 사용에 맞게 수정 (Pydantic -> sqlmodel)
from app.models.access_asset import AccessAsset # SQLModel 모델
from app.models.access_asset_credit import AccessAssetCredit # SQLModel 모델
from app.models.access_asset_memo import AccessAssetMemo # SQLModel 모델
from app.schemas.access_asset import AccessAssetCreate, AccessAssetUpdate, AccessAssetCreditCreate, AccessAssetMemoCreate # Pydantic 스키마

class CRUDAccessAsset:
    def create(self, db: Session, *, obj_in: AccessAssetCreate) -> AccessAsset:
        # AccessAssetCreate는 Pydantic 스키마, AccessAsset는 SQLModel 모델
        # SQLModel v0.0.12+ 에서는 .model_validate() 또는 .parse_obj() 등을 사용
        # 혹은 AccessAsset(**obj_in.dict()) 와 같이 필드를 직접 매핑할 수 있습니다.
        # 여기서는 from_orm을 사용하고 있으므로 AccessAsset 스키마가 orm_mode=True로 설정되어 있다고 가정합니다.
        # 또는 SQLModel에서는 db_obj = AccessAsset.model_validate(obj_in) 와 같이 사용할 수 있습니다.
        db_obj = AccessAsset.model_validate(obj_in) # Pydantic 스키마에서 SQLModel 모델 인스턴스 생성
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj
    
    def get(self, db: Session, id: int) -> Optional[AccessAsset]:
        return db.get(AccessAsset, id)
    
    def get_with_relations(self, db: Session, id: int) -> Optional[AccessAsset]:
        # SQLModel에서는 관계를 자동으로 로드하거나 select를 통해 명시적으로 로드할 수 있습니다.
        # 이 함수는 이미 관계를 포함하여 가져오는 것으로 보이므로,
        # AccessAsset 모델 정의에 관계가 (e.g., relationship()) 설정되어 있다고 가정합니다.
        return db.get(AccessAsset, id) # get은 기본적으로 관계를 로드하지 않을 수 있음, 필요시 조정
    
    def get_multi(self, db: Session, *, skip: int = 0, limit: int = 100) -> List[AccessAsset]:
        statement = select(AccessAsset).offset(skip).limit(limit)
        results = db.exec(statement).all()
        return results
    
    def get_by_movie(
        self, db: Session, movie_id: int, 
        media_type: Optional[str] = None, 
        language: Optional[str] = None,
        skip: int = 0, # 라우터에서 skip/limit 사용하므로 추가
        limit: int = 100 # 라우터에서 skip/limit 사용하므로 추가
    ) -> List[AccessAsset]:
        statement = select(AccessAsset).where(AccessAsset.movie_id == movie_id)
        
        if media_type:
            statement = statement.where(AccessAsset.media_type == media_type)
        if language:
            statement = statement.where(AccessAsset.language == language)
            
        statement = statement.offset(skip).limit(limit) # skip/limit 적용
        results = db.exec(statement).all()
        return results
    
    def update(self, db: Session, *, db_obj: AccessAsset, obj_in: Union[AccessAssetUpdate, Dict[str, Any]]) -> AccessAsset:
        update_data: Dict[str, Any]
        if isinstance(obj_in, AccessAssetUpdate): # obj_in이 Pydantic 스키마인 경우
            # Pydantic V2에서는 .model_dump() 사용
            update_data = obj_in.model_dump(exclude_unset=True)
        elif isinstance(obj_in, dict): # obj_in이 딕셔너리인 경우
            update_data = obj_in
        else:
            # 예상치 못한 타입인 경우 오류 발생 또는 기본 처리
            raise TypeError(f"Expected AccessAssetUpdate (Pydantic schema) or dict for obj_in, got {type(obj_in)}")

        for field, value in update_data.items():
            setattr(db_obj, field, value)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj
    
    def remove(self, db: Session, *, id: int) -> Optional[AccessAsset]: # 반환타입 Optional 추가
        obj = db.get(AccessAsset, id)
        if obj:
            db.delete(obj)
            db.commit()
            return obj # 삭제된 객체 반환 (라우터에서 사용 안 할 수도 있음)
        return None # 객체가 없는 경우 None 반환
    
    def add_credit(self, db: Session, asset_id: int, credit_in: AccessAssetCreditCreate) -> AccessAssetCredit:
        # credit_in은 Pydantic 스키마
        # AccessAssetCredit는 SQLModel 모델
        db_credit_data = credit_in.model_dump()
        db_credit = AccessAssetCredit(**db_credit_data, access_asset_id=asset_id)
        db.add(db_credit)
        db.commit()
        db.refresh(db_credit)
        return db_credit
    
    def add_memo(self, db: Session, asset_id: int, memo_in: AccessAssetMemoCreate) -> AccessAssetMemo:
        # memo_in은 Pydantic 스키마
        # AccessAssetMemo는 SQLModel 모델
        db_memo_data = memo_in.model_dump()
        db_memo = AccessAssetMemo(**db_memo_data, access_asset_id=asset_id)
        db.add(db_memo)
        db.commit()
        db.refresh(db_memo)
        return db_memo
    
    def update_file_info(self, db: Session, db_obj: AccessAsset, original_filename: str, s3_filename: str, s3_directory: str, file_size: int, file_type: str) -> AccessAsset:
        db_obj.original_filename = original_filename
        db_obj.s3_filename = s3_filename
        db_obj.s3_directory = s3_directory
        db_obj.file_size = file_size
        db_obj.file_type = file_type # 이 필드가 AccessAsset 모델에 있는지 확인 필요
        db_obj.uploaded_at = datetime.utcnow() # 파일 정보 업데이트 시 uploaded_at도 갱신하는 것이 좋을 수 있음
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

# 이 인스턴스를 외부로 내보냄
access_asset = CRUDAccessAsset()
