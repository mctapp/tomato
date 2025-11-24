# app/routes/admin_staffs.py
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from sqlmodel import Session
from typing import List, Optional
from app.db import get_db
from app.crud.crud_staff import staff
from app.schemas import staff as schemas
from app.schemas.access_asset import AccessAssetWithMovie  # 추가
import boto3
from botocore.exceptions import ClientError
import os
import uuid
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/admin/api/staffs",
    tags=["Admin - Staffs"]
)

# S3 설정
S3_BUCKET = os.getenv("PUBLIC_BUCKET_NAME")
S3_PRIVATE_BUCKET = os.getenv("PRIVATE_BUCKET_NAME")
AWS_REGION = os.getenv("AWS_REGION", "ap-northeast-2")

try:
    s3_client = boto3.client('s3', region_name=AWS_REGION)
    logger.info(f"S3 client created successfully for region {AWS_REGION}.")
except Exception as e:
    logger.error(f"Failed to create S3 client: {e}")
    s3_client = None

@router.get("", response_model=schemas.PaginatedResponse[schemas.StaffSummary])
def read_staffs(
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1, description="페이지 번호 (1부터 시작)"),
    limit: int = Query(20, ge=1, le=100, description="페이지당 항목 수"),
    keyword: Optional[str] = Query(None, description="검색 키워드 (이름, 메모)"),
    skillLevels: Optional[str] = Query(None, description="스킬 레벨 (콤마로 구분: 1,2,3)"),
    roles: Optional[str] = Query(None, description="역할 (콤마로 구분: producer,director)"),
    locations: Optional[str] = Query(None, description="지역 (콤마로 구분)"),
    genders: Optional[str] = Query(None, description="성별 (콤마로 구분)"),
    orderBy: str = Query("created_at", description="정렬 기준 필드"),
    orderDesc: bool = Query(True, description="내림차순 정렬 여부")
):
    """스태프 목록 조회 (페이지네이션 및 필터링 지원)"""
    try:
        # 페이지네이션 계산
        skip = (page - 1) * limit
        
        # 필터 파라미터 파싱
        filters = schemas.StaffSearchFilters()
        
        if keyword:
            filters.keyword = keyword.strip()
        
        # 스킬 레벨 필터
        if skillLevels:
            try:
                if ',' in skillLevels:
                    skill_levels_list = []
                    for level_str in skillLevels.split(','):
                        level_str = level_str.strip()
                        if level_str.isdigit():
                            level = int(level_str)
                            if 1 <= level <= 9:
                                skill_levels_list.append(level)
                    filters.skill_levels = skill_levels_list if skill_levels_list else None
                else:
                    level_str = skillLevels.strip()
                    if level_str.isdigit():
                        level = int(level_str)
                        if 1 <= level <= 9:
                            filters.skill_levels = [level]
            except (ValueError, AttributeError) as e:
                logger.warning(f"Invalid skill levels format: {skillLevels}, error: {e}")
                filters.skill_levels = None
        
        # 역할 필터
        if roles:
            try:
                if ',' in roles:
                    roles_list = []
                    valid_roles = ['producer', 'director', 'supervisor', 'monitor_general', 
                                   'monitor_visual', 'monitor_hearing', 'pr', 'marketing', 
                                   'design', 'accounting', 'other']
                    for role in roles.split(','):
                        role = role.strip().lower()
                        if role in valid_roles:
                            roles_list.append(role)
                    filters.roles = roles_list if roles_list else None
                else:
                    role = roles.strip().lower()
                    valid_roles = ['producer', 'director', 'supervisor', 'monitor_general', 
                                   'monitor_visual', 'monitor_hearing', 'pr', 'marketing', 
                                   'design', 'accounting', 'other']
                    if role in valid_roles:
                        filters.roles = [role]
            except AttributeError as e:
                logger.warning(f"Invalid roles format: {roles}, error: {e}")
                filters.roles = None
        
        # 성별 필터
        if genders:
            try:
                if ',' in genders:
                    genders_list = []
                    valid_genders = ['male', 'female', 'other', 'prefer_not_to_say']
                    for gender in genders.split(','):
                        gender = gender.strip().lower()
                        if gender in valid_genders:
                            genders_list.append(gender)
                    filters.genders = genders_list if genders_list else None
                else:
                    gender = genders.strip().lower()
                    valid_genders = ['male', 'female', 'other', 'prefer_not_to_say']
                    if gender in valid_genders:
                        filters.genders = [gender]
            except AttributeError as e:
                logger.warning(f"Invalid genders format: {genders}, error: {e}")
                filters.genders = None
        
        logger.info(f"Processing filters: {filters}")
        
        # 데이터 조회
        summaries, pagination_meta = staff.get_multi_with_pagination(
            db=db,
            skip=skip,
            limit=limit,
            filters=filters,
            order_by=orderBy,
            order_desc=orderDesc
        )
        
        return schemas.PaginatedResponse(
            data=summaries,
            pagination=pagination_meta
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error reading staffs: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/search", response_model=schemas.PaginatedResponse[schemas.StaffSummary])
def search_staffs(
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    keyword: Optional[str] = Query(None, description="검색 키워드"),
    skillLevels: Optional[str] = Query(None, description="스킬 레벨 필터"),
    roles: Optional[str] = Query(None, description="역할 필터"),
    locations: Optional[str] = Query(None, description="지역 필터")
):
    """고급 검색 기능"""
    try:
        skip = (page - 1) * limit
        
        # 필터 객체 생성
        filters = schemas.StaffSearchFilters()
        
        if keyword:
            filters.keyword = keyword.strip()
        
        if skillLevels:
            try:
                skill_levels_list = []
                for level_str in skillLevels.split(','):
                    level_str = level_str.strip()
                    if level_str and level_str.isdigit():
                        level = int(level_str)
                        if 1 <= level <= 9:
                            skill_levels_list.append(level)
                filters.skill_levels = skill_levels_list if skill_levels_list else None
            except (ValueError, AttributeError):
                filters.skill_levels = None
        
        if roles:
            try:
                roles_list = []
                valid_roles = ['producer', 'director', 'supervisor', 'monitor_general', 
                               'monitor_visual', 'monitor_hearing', 'pr', 'marketing', 
                               'design', 'accounting', 'other']
                for role in roles.split(','):
                    role = role.strip().lower()
                    if role in valid_roles:
                        roles_list.append(role)
                filters.roles = roles_list if roles_list else None
            except AttributeError:
                filters.roles = None
        
        if locations:
            try:
                filters.locations = [x.strip() for x in locations.split(',') if x.strip()]
            except AttributeError:
                filters.locations = None
        
        summaries, pagination_meta = staff.search_optimized(
            db=db,
            filters=filters,
            skip=skip,
            limit=limit
        )
        
        return schemas.PaginatedResponse(
            data=summaries,
            pagination=pagination_meta
        )
        
    except Exception as e:
        logger.error(f"Error searching staffs: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Search error occurred.")

@router.get("/stats", response_model=dict)
def get_staff_stats(db: Session = Depends(get_db)):
    """스태프 통계 정보"""
    try:
        stats = staff.get_stats(db)
        return stats
    except Exception as e:
        logger.error(f"Error getting stats: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error retrieving statistics.")

@router.post("", response_model=schemas.Staff, status_code=201)
def create_staff(
    *,
    db: Session = Depends(get_db),
    staff_in: schemas.StaffCreate
):
    """스태프 생성"""
    try:
        staff_obj = staff.create_with_relations(db=db, obj_in=staff_in)
        logger.info(f"Staff created with ID: {staff_obj.id}")
        return staff_obj
    except Exception as e:
        logger.error(f"Error creating staff: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error while creating staff.")

@router.get("/{staff_id}", response_model=schemas.Staff)
def read_staff(
    *,
    db: Session = Depends(get_db),
    staff_id: int
):
    """특정 스태프 상세 정보 조회"""
    staff_obj = staff.get_with_relations(db=db, id=staff_id)
    if not staff_obj:
        logger.warning(f"Staff with id {staff_id} not found.")
        raise HTTPException(status_code=404, detail="Staff not found")
    return staff_obj

@router.put("/{staff_id}", response_model=schemas.Staff)
def update_staff(
    *,
    db: Session = Depends(get_db),
    staff_id: int,
    staff_in: schemas.StaffUpdate
):
    """스태프 정보 수정"""
    db_staff = staff.get(db=db, id=staff_id)
    if not db_staff:
        logger.warning(f"Staff with id {staff_id} not found for update.")
        raise HTTPException(status_code=404, detail="Staff not found")

    try:
        staff_obj = staff.update_with_relations(db=db, db_obj=db_staff, obj_in=staff_in)
        logger.info(f"Staff {staff_id} updated successfully.")
        return staff_obj
    except Exception as e:
        logger.error(f"Error updating staff {staff_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error while updating staff.")

@router.delete("/{staff_id}", status_code=204)
def delete_staff(
    *,
    db: Session = Depends(get_db),
    staff_id: int
):
    """스태프 삭제"""
    staff_obj = staff.get(db=db, id=staff_id)
    if not staff_obj:
        logger.warning(f"Staff with id {staff_id} not found for deletion.")
        raise HTTPException(status_code=404, detail="Staff not found")

    try:
        staff.remove(db=db, id=staff_id)
        logger.info(f"Staff with id {staff_id} deleted successfully.")
        return None
    except Exception as e:
        logger.error(f"Error deleting staff {staff_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error while deleting staff.")

@router.post("/{staff_id}/profile-image", response_model=schemas.ProfileImageResponse)
async def upload_profile_image(
    *,
    db: Session = Depends(get_db),
    staff_id: int,
    file: UploadFile = File(...)
):
    """스태프 프로필 이미지 업로드"""
    if not s3_client:
        logger.error("S3 client is not available.")
        raise HTTPException(status_code=503, detail="S3 service is unavailable.")

    db_staff = staff.get(db=db, id=staff_id)
    if not db_staff:
        logger.warning(f"Staff with id {staff_id} not found for profile image upload.")
        raise HTTPException(status_code=404, detail="Staff not found")

    # 파일 확장자 및 크기 제한
    allowed_extensions = ['.jpg', '.jpeg', '.png', '.gif']
    file_extension = os.path.splitext(file.filename)[1].lower()
    if file_extension not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed types: {', '.join(allowed_extensions)}"
        )

    # S3 파일명 생성
    s3_file_name = f"staffs/{staff_id}/profile-{uuid.uuid4()}{file_extension}"

    try:
        file_content = await file.read()

        # 파일 크기 제한 (5MB)
        if len(file_content) > 5 * 1024 * 1024:
             raise HTTPException(status_code=413, detail="File size exceeds the limit of 5MB.")

        s3_client.put_object(
            Bucket=S3_BUCKET,
            Key=s3_file_name,
            Body=file_content,
            ContentType=file.content_type,
            ACL='public-read'
        )
        logger.info(f"Profile image uploaded to S3: s3://{S3_BUCKET}/{s3_file_name}")

        # S3 URL 생성
        s3_url = f"https://{S3_BUCKET}.s3.{AWS_REGION}.amazonaws.com/{s3_file_name}"

        # DB 업데이트
        updated_data = schemas.StaffUpdate(profile_image=s3_url)
        staff.update(db=db, db_obj=db_staff, obj_in=updated_data)

        logger.info(f"Staff {staff_id} profile image URL updated in DB.")

        return {"profile_image": s3_url}

    except ClientError as e:
        logger.error(f"S3 upload failed for staff {staff_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to upload profile image.")
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error during profile image upload for staff {staff_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="An internal error occurred.")

# 작업로그 관련 엔드포인트
@router.post("/{staff_id}/work-logs", response_model=schemas.StaffWorkLogInDB, status_code=201)
def create_staff_work_log(
    *,
    db: Session = Depends(get_db),
    staff_id: int,
    work_log_in: schemas.StaffWorkLogCreate
):
    """스태프 작업로그 생성"""
    staff_obj = staff.get(db=db, id=staff_id)
    if not staff_obj:
        raise HTTPException(status_code=404, detail="Staff not found")
    
    try:
        work_log = staff.create_work_log(db=db, staff_id=staff_id, obj_in=work_log_in)
        logger.info(f"Work log created for staff {staff_id}: {work_log.id}")
        return work_log
    except Exception as e:
        logger.error(f"Error creating work log for staff {staff_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error while creating work log.")

@router.delete("/{staff_id}/work-logs/{work_log_id}", status_code=204)
def delete_staff_work_log(
    *,
    db: Session = Depends(get_db),
    staff_id: int,
    work_log_id: int
):
    """스태프 작업로그 삭제"""
    success = staff.remove_work_log(db=db, staff_id=staff_id, work_log_id=work_log_id)
    if not success:
        raise HTTPException(status_code=404, detail="Work log not found")
    
    logger.info(f"Work log {work_log_id} deleted for staff {staff_id}")
    return None

# 대표작 관련 엔드포인트
@router.post("/{staff_id}/portfolios", response_model=schemas.StaffPortfolioInDB, status_code=201)
def create_staff_portfolio(
    *,
    db: Session = Depends(get_db),
    staff_id: int,
    portfolio_in: schemas.StaffPortfolioCreate
):
    """스태프 대표작 생성"""
    staff_obj = staff.get(db=db, id=staff_id)
    if not staff_obj:
        raise HTTPException(status_code=404, detail="Staff not found")
    
    try:
        portfolio = staff.create_portfolio(db=db, staff_id=staff_id, obj_in=portfolio_in)
        logger.info(f"Portfolio created for staff {staff_id}: {portfolio.id}")
        return portfolio
    except Exception as e:
        logger.error(f"Error creating portfolio for staff {staff_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error while creating portfolio.")

@router.post("/{staff_id}/portfolios/{portfolio_id}/poster-image", response_model=schemas.PosterImageResponse)
async def upload_portfolio_poster_image(
    *,
    db: Session = Depends(get_db),
    staff_id: int,
    portfolio_id: int,
    file: UploadFile = File(...)
):
    """스태프 대표작 포스터 이미지 업로드 (S3 public)"""
    if not s3_client:
        raise HTTPException(status_code=503, detail="S3 service is unavailable.")
    
    portfolio = staff.get_portfolio(db=db, staff_id=staff_id, portfolio_id=portfolio_id)
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    
    # 이미지 파일 검증
    allowed_extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
    file_extension = os.path.splitext(file.filename)[1].lower()
    if file_extension not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed types: {', '.join(allowed_extensions)}"
        )
    
    try:
        file_content = await file.read()
        
        # 파일 크기 제한 (10MB)
        if len(file_content) > 10 * 1024 * 1024:
            raise HTTPException(
                status_code=413, 
                detail="File size exceeds the limit of 10MB."
            )
        
        # S3 파일명 생성 (public)
        s3_file_name = f"staffs/{staff_id}/portfolios/poster-{portfolio_id}-{uuid.uuid4()}{file_extension}"
        
        s3_client.put_object(
            Bucket=S3_BUCKET,
            Key=s3_file_name,
            Body=file_content,
            ContentType=file.content_type,
            ACL='public-read'
        )
        
        # S3 URL 생성
        s3_url = f"https://{S3_BUCKET}.s3.{AWS_REGION}.amazonaws.com/{s3_file_name}"
        
        # 대표작 포스터 이미지 정보 업데이트
        updated_portfolio = staff.update_portfolio_images(
            db=db,
            db_obj=portfolio,
            poster_image=s3_url
        )
        
        logger.info(f"Poster image uploaded for staff {staff_id}, portfolio {portfolio_id}")
        return {"poster_image": s3_url}
        
    except Exception as e:
        logger.error(f"Error uploading poster image: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error while uploading poster image.")

@router.post("/{staff_id}/portfolios/{portfolio_id}/credit-image", response_model=schemas.CreditImageResponse)
async def upload_portfolio_credit_image(
    *,
    db: Session = Depends(get_db),
    staff_id: int,
    portfolio_id: int,
    file: UploadFile = File(...)
):
    """스태프 대표작 크레디트 이미지 업로드 (S3 private)"""
    if not s3_client:
        raise HTTPException(status_code=503, detail="S3 service is unavailable.")
    
    portfolio = staff.get_portfolio(db=db, staff_id=staff_id, portfolio_id=portfolio_id)
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    
    # 이미지 파일 검증
    allowed_extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
    file_extension = os.path.splitext(file.filename)[1].lower()
    if file_extension not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed types: {', '.join(allowed_extensions)}"
        )
    
    try:
        file_content = await file.read()
        
        # 파일 크기 제한 (10MB)
        if len(file_content) > 10 * 1024 * 1024:
            raise HTTPException(
                status_code=413, 
                detail="File size exceeds the limit of 10MB."
            )
        
        # S3 파일명 생성 (private)
        s3_file_name = f"staffs/{staff_id}/portfolios/credit-{portfolio_id}-{uuid.uuid4()}{file_extension}"
        
        s3_client.put_object(
            Bucket=S3_PRIVATE_BUCKET,
            Key=s3_file_name,
            Body=file_content,
            ContentType=file.content_type
            # ACL='private' (기본값)
        )
        
        # S3 URL 생성 (private bucket)
        s3_url = f"https://{S3_PRIVATE_BUCKET}.s3.{AWS_REGION}.amazonaws.com/{s3_file_name}"
        
        # 대표작 크레디트 이미지 정보 업데이트
        updated_portfolio = staff.update_portfolio_images(
            db=db,
            db_obj=portfolio,
            credit_image=s3_url
        )
        
        logger.info(f"Credit image uploaded for staff {staff_id}, portfolio {portfolio_id}")
        return {"credit_image": s3_url}
        
    except Exception as e:
        logger.error(f"Error uploading credit image: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error while uploading credit image.")

@router.get("/{staff_id}/portfolios/{portfolio_id}/credit-image-url", response_model=dict)
def get_portfolio_credit_image_url(
    *,
    db: Session = Depends(get_db),
    staff_id: int,
    portfolio_id: int,
    expires_in: int = Query(3600, ge=300, le=86400, description="URL 유효시간(초)")
):
    """스태프 대표작 크레디트 이미지 접근을 위한 Presigned URL 생성"""
    from app.services.s3_service import S3Service
    
    portfolio = staff.get_portfolio(db=db, staff_id=staff_id, portfolio_id=portfolio_id)
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    
    if not portfolio.credit_image:
        raise HTTPException(status_code=404, detail="Credit image not found")
    
    # S3 URL에서 키 추출
    try:
        # URL 파싱
        url_parts = portfolio.credit_image.split('.amazonaws.com/')
        if len(url_parts) != 2:
            raise ValueError("Invalid S3 URL format")
        
        s3_key = url_parts[1]
        
        # S3 서비스 인스턴스 생성
        s3_service = S3Service()
        
        # Presigned URL 생성 (private bucket)
        presigned_url = s3_service.generate_presigned_get(
            key=s3_key,
            expires_in=expires_in,
            is_public=False
        )
        
        logger.info(f"Generated presigned URL for credit image: staff {staff_id}, portfolio {portfolio_id}")
        
        return {
            "url": presigned_url,
            "expires_in": expires_in
        }
        
    except Exception as e:
        logger.error(f"Error generating presigned URL for credit image: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to generate access URL for credit image")

@router.delete("/{staff_id}/portfolios/{portfolio_id}", status_code=204)
def delete_staff_portfolio(
    *,
    db: Session = Depends(get_db),
    staff_id: int,
    portfolio_id: int
):
    """스태프 대표작 삭제"""
    success = staff.remove_portfolio(db=db, staff_id=staff_id, portfolio_id=portfolio_id)
    if not success:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    
    logger.info(f"Portfolio {portfolio_id} deleted for staff {staff_id}")
    return None

@router.get("/{staff_id}/access-assets", response_model=List[AccessAssetWithMovie])
def get_staff_access_assets(
    *,
    db: Session = Depends(get_db),
    staff_id: int
):
    """
    스태프가 참여한 접근성 미디어 자산 목록 조회
    """
    staff_obj = staff.get(db=db, id=staff_id)
    if not staff_obj:
        raise HTTPException(status_code=404, detail="Staff not found")
    
    try:
        # AccessAssetCredit 모델과 조인하여 스태프가 참여한 자산 조회
        from app.models.access_asset_credit import AccessAssetCredit
        from app.models.access_asset import AccessAsset
        from app.models.movies import Movie  # movies로 수정
        from sqlalchemy.orm import joinedload
        
        access_assets = db.query(AccessAsset)\
            .join(AccessAssetCredit, AccessAsset.id == AccessAssetCredit.access_asset_id)\
            .join(Movie, AccessAsset.movie_id == Movie.id)\
            .filter(AccessAssetCredit.staff_id == staff_id)\
            .options(
                joinedload(AccessAsset.movie),
                joinedload(AccessAsset.credits)
            )\
            .order_by(AccessAsset.created_at.desc())\
            .all()
        
        # 응답 데이터 구성
        result = []
        for asset in access_assets:
            # 해당 스태프의 크레디트 정보만 필터링
            staff_credit = next(
                (credit for credit in asset.credits if credit.staff_id == staff_id),
                None
            )
            
            result.append({
                "id": asset.id,
                "name": asset.name,
                "mediaType": asset.media_type,
                "language": asset.language,
                "assetType": asset.asset_type,
                "productionYear": asset.production_year,
                "productionStatus": asset.production_status,
                "publishingStatus": asset.publishing_status,
                "createdAt": asset.created_at,
                "movie": {
                    "id": asset.movie.id,
                    "title": asset.movie.title,
                    "director": asset.movie.director,
                    "releaseDate": asset.movie.release_date
                } if asset.movie else None,
                "credit": {
                    "role": staff_credit.role,
                    "isPrimary": staff_credit.is_primary,
                    "sequenceNumber": staff_credit.sequence_number,
                    "memo": staff_credit.memo
                } if staff_credit else None
            })
        
        return result
        
    except Exception as e:
        logger.error(f"Error getting access assets for staff {staff_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")
