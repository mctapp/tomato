# app/models/access_asset_memo.py
from typing import Optional
from sqlmodel import Field, Relationship, SQLModel
from datetime import datetime

class AccessAssetMemo(SQLModel, table=True):
    __tablename__ = "access_asset_memos"

    id: Optional[int] = Field(default=None, primary_key=True)
    access_asset_id: int = Field(foreign_key="access_assets.id", index=True)
    content: str
    created_by: Optional[int] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    access_asset: Optional["AccessAsset"] = Relationship(back_populates="memos")
