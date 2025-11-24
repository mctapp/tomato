from sqlmodel import SQLModel, Field
from typing import Optional

class AccessFeedback(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    moviefile_id: Optional[int] = Field(default=None, foreign_key="moviefile.id")
    access_feedback_rating: Optional[int] = None  # 1~5 점수
    access_feedback_text: Optional[str] = None    # 텍스트 피드백 (청각장애인)
    access_feedback_voice: Optional[str] = None   # 음성 피드백 경로 (시각장애인)
    access_nondisabled: Optional[str] = None      # '장애인' 또는 '비장애인'
