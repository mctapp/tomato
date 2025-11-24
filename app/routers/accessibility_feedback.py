from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import SQLModel, Field, select, Session
from typing import Optional, List
from datetime import datetime
from app.db import get_session

router = APIRouter(prefix="/api/accessibility/feedback", tags=["AccessibilityFeedback"])

# 데이터 모델 정의
class AccessibilityFeedbackBase(SQLModel):
    moviefile_id: int
    access_feedback_rating: Optional[int] = None
    access_feedback_text: Optional[str] = None
    access_feedback_voice: Optional[str] = None
    access_nondisabled: Optional[str] = None
    access_type: Optional[str] = None

class AccessibilityFeedback(AccessibilityFeedbackBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)

class AccessibilityFeedbackCreate(AccessibilityFeedbackBase):
    pass

class AccessibilityFeedbackRead(AccessibilityFeedbackBase):
    id: int
    created_at: datetime

class AccessibilityFeedbackUpdate(SQLModel):
    access_feedback_rating: Optional[int] = None
    access_feedback_text: Optional[str] = None
    access_feedback_voice: Optional[str] = None
    access_nondisabled: Optional[str] = None
    access_type: Optional[str] = None

# 피드백 등록 (수동 등록이 필요한 경우 사용)
@router.post("/", response_model=AccessibilityFeedbackRead)
async def create_feedback(
    feedback: AccessibilityFeedbackCreate,
    session: Session = Depends(get_session)
):
    db_feedback = AccessibilityFeedback.from_orm(feedback)
    session.add(db_feedback)
    session.commit()
    session.refresh(db_feedback)
    return db_feedback

# 피드백 전체 목록 조회
@router.get("/", response_model=List[AccessibilityFeedbackRead])
async def read_feedbacks(session: Session = Depends(get_session)):
    feedbacks = session.exec(select(AccessibilityFeedback)).all()
    return feedbacks

# 피드백 단일 항목 조회
@router.get("/{feedback_id}", response_model=AccessibilityFeedbackRead)
async def read_feedback(feedback_id: int, session: Session = Depends(get_session)):
    feedback = session.get(AccessibilityFeedback, feedback_id)
    if not feedback:
        raise HTTPException(status_code=404, detail="Feedback not found")
    return feedback

# 피드백 일부 내용 수정 (필요시 사용)
@router.put("/{feedback_id}", response_model=AccessibilityFeedbackRead)
async def update_feedback(
    feedback_id: int, 
    feedback_update: AccessibilityFeedbackUpdate,
    session: Session = Depends(get_session)
):
    feedback = session.get(AccessibilityFeedback, feedback_id)
    if not feedback:
        raise HTTPException(status_code=404, detail="Feedback not found")

    feedback_data = feedback_update.dict(exclude_unset=True)
    for key, value in feedback_data.items():
        setattr(feedback, key, value)

    session.add(feedback)
    session.commit()
    session.refresh(feedback)
    return feedback

# 피드백 항목 삭제
@router.delete("/{feedback_id}")
async def delete_feedback(feedback_id: int, session: Session = Depends(get_session)):
    feedback = session.get(AccessibilityFeedback, feedback_id)
    if not feedback:
        raise HTTPException(status_code=404, detail="Feedback not found")

    session.delete(feedback)
    session.commit()
    return {"ok": True}
