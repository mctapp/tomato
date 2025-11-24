from typing import Optional
from sqlmodel import SQLModel, Field, Relationship
from datetime import datetime # datetime 임포트 추가

class RepresentativeWork(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True, index=True)
    person_type: str = Field(index=True) # "translator", "director" 등
    person_id: int = Field(index=True) # 해당 타입의 person id (예: translator.id)
    year: int
    category: str
    title: str = Field(index=True)
    role: Optional[str] = Field(default=None)
    memo: Optional[str] = Field(default=None)
    sequence_number: int
    # 생성 시간 필드 추가
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)

    # --- 관계 설정 (예시: Translator 모델과의 관계) ---
    # 만약 Translator 모델에서 representative_works 관계를 정의했다면, 여기서 back_populates 사용 가능
    # translator: Optional["Translator"] = Relationship(back_populates="representative_works")
    # 주의: person_type에 따라 다른 모델과 연결될 수 있으므로, 특정 모델과의 직접적인 Relationship 정의가 어려울 수 있습니다.
    #       이 경우, 관계 정의 없이 person_id와 person_type으로 직접 조회하는 방식을 사용할 수 있습니다.

    # __tablename__ = "representativework" # SQLModel이 자동으로 생성
