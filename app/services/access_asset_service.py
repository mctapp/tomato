from datetime import datetime
from sqlalchemy import func, and_, or_, desc, asc
from sqlalchemy.orm import Session, joinedload
from typing import List, Dict, Any, Optional, Tuple

# 실제 프로젝트 구조에 맞게 AccessAsset 모델을 임포트해야 합니다.
# 예: from app.models.access_asset import AccessAsset
# 여기서는 모델이 정의되어 있다고 가정합니다.
from app.models.access_asset import AccessAsset

# schemas는 이 서비스 파일에서 직접적으로 사용되지 않을 수 있으나,
# 다른 메서드에서 사용될 수 있으므로 기존 임포트를 유지할 수 있습니다.
# from app.schemas.access_asset import AccessAssetCreate, AccessAssetUpdate, AccessAssetMemoCreate, AccessAssetCreditCreate

# 프론트엔드와 일관성을 유지하기 위한 미디어 타입 리스트
ALL_MEDIA_TYPES = ["AD", "CC", "SL", "IA", "IC", "IS", "RA", "RC", "RS"]

class AccessAssetService:
    def get_assets_with_filters(
        self,
        db: Session,
        movie_id: Optional[int] = None,
        media_types: Optional[List[str]] = None,
        languages: Optional[List[str]] = None,
        asset_types: Optional[List[str]] = None,
        is_public: Optional[bool] = None,
        production_status: Optional[str] = None,
        publishing_status: Optional[str] = None,
        search_term: Optional[str] = None,
        skip: int = 0,
        limit: int = 20,
        order_by: str = "created_at",
        order_dir: str = "desc"
    ) -> Tuple[List[AccessAsset], int]:
        """필터를 적용하여 접근성 미디어 자산 조회"""
        query = db.query(AccessAsset)
        
        if movie_id is not None: # movie_id가 0일 수도 있으므로 None과 비교
            query = query.filter(AccessAsset.movie_id == movie_id)
        
        if media_types:
            query = query.filter(AccessAsset.media_type.in_(media_types))
            
        if languages:
            query = query.filter(AccessAsset.language.in_(languages))
            
        if asset_types:
            query = query.filter(AccessAsset.asset_type.in_(asset_types))
            
        if is_public is not None:
            query = query.filter(AccessAsset.is_public == is_public)
            
        if production_status:
            query = query.filter(AccessAsset.production_status == production_status)
            
        if publishing_status:
            query = query.filter(AccessAsset.publishing_status == publishing_status)
            
        if search_term:
            search_pattern = f"%{search_term}%"
            query = query.filter(
                or_(
                    AccessAsset.name.ilike(search_pattern),
                    AccessAsset.description.ilike(search_pattern) # AccessAsset 모델에 description 필드가 있다고 가정
                )
            )
            
        total_count = query.count()
        
        order_attribute = getattr(AccessAsset, order_by, None)
        if order_attribute:
            if order_dir.lower() == "desc":
                query = query.order_by(desc(order_attribute))
            else:
                query = query.order_by(asc(order_attribute))
            
        query = query.offset(skip).limit(limit)
        
        return query.all(), total_count
    
    def get_asset_with_relations(self, db: Session, asset_id: int) -> Optional[AccessAsset]:
        """ID로 접근성 미디어 자산을 관계 정보와 함께 조회"""
        # AccessAsset 모델에 'movie' 및 'guideline' 관계가 정의되어 있어야 합니다.
        return db.query(AccessAsset).filter(
            AccessAsset.id == asset_id
        ).options(
            joinedload(AccessAsset.movie), # 모델의 실제 관계 속성명 사용
            joinedload(AccessAsset.guideline) # 모델의 실제 관계 속성명 사용
        ).first()
    
    def update_publishing_status(self, db: Session, asset_id: int, status: str) -> Optional[AccessAsset]:
        """접근성 미디어 자산 게시 상태 업데이트"""
        asset = db.query(AccessAsset).filter(AccessAsset.id == asset_id).first()
        if not asset:
            return None
            
        asset.publishing_status = status
        asset.updated_at = datetime.utcnow()
        db.add(asset) # 변경사항을 세션에 추가
        db.commit()
        db.refresh(asset)
        return asset
    
    def toggle_lock_status(self, db: Session, asset_id: int, is_locked: bool) -> Optional[AccessAsset]:
        """접근성 미디어 자산 잠금 상태 토글"""
        asset = db.query(AccessAsset).filter(AccessAsset.id == asset_id).first()
        if not asset:
            return None
            
        asset.is_locked = is_locked # AccessAsset 모델에 is_locked 필드가 있다고 가정
        asset.updated_at = datetime.utcnow()
        db.add(asset) # 변경사항을 세션에 추가
        db.commit()
        db.refresh(asset)
        return asset
    
    def get_assets_by_movie(self, db: Session, movie_id: int) -> List[AccessAsset]:
        """영화 ID로 접근성 미디어 자산 조회"""
        return db.query(AccessAsset).filter(
            AccessAsset.movie_id == movie_id
        ).all()
    
    def get_assets_stats(self, db: Session) -> Dict[str, Any]:
        """
        접근성 미디어 자산 통계 정보를 유형별 iOS/Android 지원 수를 포함하여 조회
        """
        by_media_type_details = []

        for media_type_code in ALL_MEDIA_TYPES:
            # 해당 미디어 타입의 전체 자산 수
            count_for_type = db.query(func.count(AccessAsset.id))\
                .filter(AccessAsset.media_type == media_type_code)\
                .scalar() or 0

            # 해당 미디어 타입 중 iOS 지원 자산 수
            ios_count_for_type = db.query(func.count(AccessAsset.id))\
                .filter(
                    and_(
                        AccessAsset.media_type == media_type_code,
                        AccessAsset.supported_os == "iOS" # AccessAsset.supported_os 필드가 'iOS' 값을 가짐
                    )
                ).scalar() or 0
            
            # 해당 미디어 타입 중 Android 지원 자산 수
            android_count_for_type = db.query(func.count(AccessAsset.id))\
                .filter(
                    and_(
                        AccessAsset.media_type == media_type_code,
                        AccessAsset.supported_os == "Android" # AccessAsset.supported_os 필드가 'Android' 값을 가짐
                    )
                ).scalar() or 0

            by_media_type_details.append({
                "media_type": media_type_code,
                "count": count_for_type,
                "ios_count": ios_count_for_type,
                "android_count": android_count_for_type
            })

        # 전체 요약 통계
        total_assets_overall = db.query(func.count(AccessAsset.id)).scalar() or 0
        
        total_locked_overall = db.query(func.count(AccessAsset.id))\
            .filter(AccessAsset.is_locked == True)\
            .scalar() or 0

        total_ios_overall = db.query(func.count(AccessAsset.id))\
            .filter(AccessAsset.supported_os == "iOS")\
            .scalar() or 0
            
        total_android_overall = db.query(func.count(AccessAsset.id))\
            .filter(AccessAsset.supported_os == "Android")\
            .scalar() or 0

        total_summary = {
            "total_assets": total_assets_overall,
            "total_locked": total_locked_overall,
            "total_ios": total_ios_overall,
            "total_android": total_android_overall
        }
        
        return {
            "by_media_type": by_media_type_details,
            "total_summary": total_summary,
            "updated_at": datetime.utcnow().isoformat()
        }

access_asset_service = AccessAssetService()
