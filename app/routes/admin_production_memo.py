# app/routes/admin_production_memo.py
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlmodel import Session, select, func
from sqlalchemy.orm import selectinload
from typing import List, Optional
from datetime import datetime
import logging

from app.dependencies.auth import get_editor_user
from app.models.users import User
from app.models.production_memo import ProductionMemo
from app.models.production_project import ProductionProject
from app.models.production_task import ProductionTask
from app.db import get_session

from app.schemas.production_management import (
    ProductionMemoCreate,
    ProductionMemoUpdate,
    ProductionMemoResponse
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin/api/production/memos", tags=["Admin Production Memos"])

# ── 헬퍼 함수 ──────────────────────────────────────────────────────────

def memo_to_response(memo: ProductionMemo, db: Session) -> dict:
    """메모를 응답 형식으로 변환"""
    # 작성자 정보 가져오기
    created_by_user = db.get(User, memo.created_by)
    created_by_name = created_by_user.full_name if created_by_user else "Unknown"
    
    # 수정자 정보 가져오기
    updated_by_name = None
    if memo.updated_by:
        updated_by_user = db.get(User, memo.updated_by)
        updated_by_name = updated_by_user.full_name if updated_by_user else None
    
    # 태스크의 단계 정보 가져오기
    task_stage_number = None
    if memo.production_task_id:
        task = db.get(ProductionTask, memo.production_task_id)
        if task:
            task_stage_number = task.stage_number
    
    return {
        "id": memo.id,
        "productionProjectId": memo.production_project_id,
        "productionTaskId": memo.production_task_id,
        "memoContent": memo.memo_content,
        "memoType": memo.memo_type,
        "memoTypeLabel": memo.get_memo_type_label(),
        "priorityLevel": memo.priority_level,
        "priorityLabel": memo.get_priority_label(),
        "tags": memo.get_tags_as_list(),
        "isPinned": memo.is_pinned,
        "createdBy": memo.created_by,
        "createdByName": created_by_name,
        "createdAt": memo.created_at,
        "updatedBy": memo.updated_by,
        "updatedByName": updated_by_name,
        "updatedAt": memo.updated_at,
        "isActive": memo.is_active,
        "isProjectLevel": memo.is_project_level_memo(),
        "taskStageNumber": task_stage_number  # 추가
    }

# ── 메모 목록 조회 ──────────────────────────────────────────────────────

@router.get("/project/{project_id}")
def get_project_memos(
    project_id: int,
    include_task_memos: bool = Query(
        True, 
        description="태스크 메모 포함 여부 (true/false 문자열로 전송 가능)"
    ),
    memo_type: Optional[str] = Query(None, description="메모 타입 필터"),
    is_pinned: Optional[bool] = Query(None, description="핀 고정 필터"),
    db: Session = Depends(get_session),
    current_user: User = Depends(get_editor_user)
):
    """프로젝트의 모든 메모 조회"""
    
    # 프로젝트 존재 확인
    project = db.get(ProductionProject, project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="프로젝트를 찾을 수 없습니다"
        )
    
    # 기본 쿼리 - selectinload로 관계 데이터 미리 로드
    query = (
        select(ProductionMemo)
        .options(
            selectinload(ProductionMemo.created_by_user),
            selectinload(ProductionMemo.updated_by_user)
        )
        .where(ProductionMemo.is_active == True)
    )
    
    if include_task_memos:
        # 프로젝트 메모 + 해당 프로젝트의 태스크 메모
        query = query.where(ProductionMemo.production_project_id == project_id)
    else:
        # 프로젝트 레벨 메모만
        query = query.where(
            ProductionMemo.production_project_id == project_id,
            ProductionMemo.production_task_id.is_(None)
        )
    
    # 필터 적용
    if memo_type:
        query = query.where(ProductionMemo.memo_type == memo_type)
    if is_pinned is not None:
        query = query.where(ProductionMemo.is_pinned == is_pinned)
    
    # 정렬: 핀 고정 우선, 우선순위 높은 순, 최신순
    query = query.order_by(
        ProductionMemo.is_pinned.desc(),
        ProductionMemo.priority_level.desc(),
        ProductionMemo.created_at.desc()
    )
    
    memos = db.exec(query).all()
    
    # memo_to_response 함수로 변환
    return [memo_to_response(memo, db) for memo in memos]

@router.get("/task/{task_id}")
def get_task_memos(
    task_id: int,
    db: Session = Depends(get_session),
    current_user: User = Depends(get_editor_user)
):
    """특정 태스크의 메모 조회"""
    
    # 태스크 존재 확인
    task = db.get(ProductionTask, task_id)
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="태스크를 찾을 수 없습니다"
        )
    
    query = (
        select(ProductionMemo)
        .options(
            selectinload(ProductionMemo.created_by_user),
            selectinload(ProductionMemo.updated_by_user)
        )
        .where(
            ProductionMemo.production_task_id == task_id,
            ProductionMemo.is_active == True
        )
        .order_by(
            ProductionMemo.is_pinned.desc(),
            ProductionMemo.priority_level.desc(),
            ProductionMemo.created_at.desc()
        )
    )
    
    memos = db.exec(query).all()
    
    # memo_to_response 함수로 변환
    return [memo_to_response(memo, db) for memo in memos]

# ── 메모 생성 ──────────────────────────────────────────────────────────

@router.post("/")
def create_memo(
    memo_data: ProductionMemoCreate,
    db: Session = Depends(get_session),
    current_user: User = Depends(get_editor_user)
):
    """새 메모 생성"""
    
    # 프로젝트 존재 확인
    project = db.get(ProductionProject, memo_data.production_project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="프로젝트를 찾을 수 없습니다"
        )
    
    # 태스크 ID가 있으면 확인
    if memo_data.production_task_id:
        task = db.get(ProductionTask, memo_data.production_task_id)
        if not task or task.production_project_id != memo_data.production_project_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="유효하지 않은 태스크 ID입니다"
            )
    
    # 메모 생성
    # 시간은 UTC 기준 (필요시 KST 변환: + timedelta(hours=9))
    memo = ProductionMemo(
        **memo_data.model_dump(),
        created_by=current_user.id,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    
    db.add(memo)
    db.commit()
    db.refresh(memo)
    
    logger.info(f"Memo created - ID: {memo.id}, Project: {project.id}")
    
    # memo_to_response 함수로 변환
    return memo_to_response(memo, db)

# ── 메모 수정 ──────────────────────────────────────────────────────────

@router.patch("/{memo_id}")
def update_memo(
    memo_id: int,
    memo_update: ProductionMemoUpdate,
    db: Session = Depends(get_session),
    current_user: User = Depends(get_editor_user)
):
    """메모 수정"""
    
    memo = db.get(ProductionMemo, memo_id)
    if not memo or not memo.is_active:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="메모를 찾을 수 없습니다"
        )
    
    # 업데이트
    update_data = memo_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(memo, key, value)
    
    # update_timestamp 메서드가 없을 경우를 대비한 수동 처리
    # memo.update_timestamp(current_user.id)
    memo.updated_by = current_user.id
    memo.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(memo)
    
    logger.info(f"Memo updated - ID: {memo.id}")
    
    # memo_to_response 함수로 변환
    return memo_to_response(memo, db)

# ── 메모 삭제 (소프트 삭제) ──────────────────────────────────────────────

@router.delete("/{memo_id}")
def delete_memo(
    memo_id: int,
    db: Session = Depends(get_session),
    current_user: User = Depends(get_editor_user)
):
    """메모 삭제 (소프트 삭제)"""
    
    memo = db.get(ProductionMemo, memo_id)
    if not memo or not memo.is_active:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="메모를 찾을 수 없습니다"
        )
    
    # soft_delete 메서드가 없을 경우를 대비한 수동 처리
    # memo.soft_delete(current_user.id)
    memo.is_active = False
    memo.updated_by = current_user.id
    memo.updated_at = datetime.utcnow()
    # deleted_by, deleted_at 필드가 있다면 추가
    # memo.deleted_by = current_user.id
    # memo.deleted_at = datetime.utcnow()
    
    db.commit()
    
    logger.info(f"Memo soft deleted - ID: {memo.id}")
    
    return {"message": "메모가 삭제되었습니다"}

# ── 핀 고정 토글 ──────────────────────────────────────────────────────

@router.patch("/{memo_id}/pin")
def toggle_pin(
    memo_id: int,
    db: Session = Depends(get_session),
    current_user: User = Depends(get_editor_user)
):
    """메모 핀 고정 토글"""
    
    memo = db.get(ProductionMemo, memo_id)
    if not memo or not memo.is_active:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="메모를 찾을 수 없습니다"
        )
    
    memo.is_pinned = not memo.is_pinned
    memo.updated_by = current_user.id
    memo.updated_at = datetime.utcnow()
    
    db.commit()
    
    return {
        "message": "핀 고정이 변경되었습니다",
        "is_pinned": memo.is_pinned
    }

# ── 메모 통계 ──────────────────────────────────────────────────────────

@router.get("/stats/project/{project_id}")
def get_project_memo_stats(
    project_id: int,
    db: Session = Depends(get_session),
    current_user: User = Depends(get_editor_user)
):
    """프로젝트 메모 통계"""
    
    # 프로젝트 존재 확인
    project = db.get(ProductionProject, project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="프로젝트를 찾을 수 없습니다"
        )
    
    # 메모 타입별 카운트
    type_counts_raw = db.exec(
        select(
            ProductionMemo.memo_type,
            func.count(ProductionMemo.id)
        )
        .where(
            ProductionMemo.production_project_id == project_id,
            ProductionMemo.is_active == True
        )
        .group_by(ProductionMemo.memo_type)
    ).all()
    
    # 안전한 dict 변환
    type_counts = [(str(memo_type), int(count)) for memo_type, count in type_counts_raw]
    
    # 우선순위별 카운트
    priority_counts_raw = db.exec(
        select(
            ProductionMemo.priority_level,
            func.count(ProductionMemo.id)
        )
        .where(
            ProductionMemo.production_project_id == project_id,
            ProductionMemo.is_active == True
        )
        .group_by(ProductionMemo.priority_level)
    ).all()
    
    # 안전한 dict 변환
    priority_counts = [(int(priority), int(count)) for priority, count in priority_counts_raw]
    
    # 핀 고정 카운트
    pinned_count_result = db.exec(
        select(func.count(ProductionMemo.id))
        .where(
            ProductionMemo.production_project_id == project_id,
            ProductionMemo.is_active == True,
            ProductionMemo.is_pinned == True
        )
    ).one()
    
    # 결과가 튜플일 경우 첫 번째 값 추출
    pinned_count = pinned_count_result if isinstance(pinned_count_result, int) else pinned_count_result[0]
    
    return {
        "total_memos": sum(count for _, count in type_counts) if type_counts else 0,
        "by_type": {memo_type: count for memo_type, count in type_counts},
        "by_priority": {priority: count for priority, count in priority_counts},
        "pinned_count": pinned_count
    }
