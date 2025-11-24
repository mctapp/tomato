from sqlmodel import SQLModel, Field
from typing import Optional

class AccessMeta(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    moviefile_id: Optional[int] = Field(default=None, foreign_key="moviefile.id")
    access_translator: Optional[str] = None
    access_superviser: Optional[str] = None
    access_narrator: Optional[str] = None
    access_director: Optional[str] = None
    access_company: Optional[str] = None
    access_created_at: Optional[str] = None  # YYMMDD 형식 문자열
    access_memo: Optional[str] = None

