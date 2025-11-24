from typing import Optional
from datetime import datetime
from app.schemas.base import BaseSchema

class AccessLangBase(BaseSchema):
    code: str
    name: str
    native_name: Optional[str] = None
    is_active: Optional[bool] = True
    is_default: Optional[bool] = False
    display_order: Optional[int] = None

class AccessLangCreate(AccessLangBase):
    pass

class AccessLangUpdate(BaseSchema):
    code: Optional[str] = None
    name: Optional[str] = None
    native_name: Optional[str] = None
    is_active: Optional[bool] = None
    is_default: Optional[bool] = None
    display_order: Optional[int] = None

class AccessLangInDBBase(AccessLangBase):
    id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class AccessLang(AccessLangInDBBase):
    pass
