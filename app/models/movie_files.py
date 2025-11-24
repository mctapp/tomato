from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime

class MovieFile(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    movie_id: int = Field(foreign_key="movie.id")
    file_type: str                           # ad, cc, sl, intro_audio, intro_text, ...
    language_code: str                       # ko, en 등
    s3_directory: str                        # ad, cc, sl, ia, ic, is
    s3_filename: str
    original_filename: Optional[str] = None
    file_size: Optional[int] = None
    upload_time: Optional[datetime] = None
    order_column: int = Field(default=0)
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
