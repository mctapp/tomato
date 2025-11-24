from typing import Optional
from datetime import datetime
from app.schemas.base import BaseSchema

class AccessTypeBase(BaseSchema):
    code: str
    name: str
    description: Optional[str] = None
    category: str
    format: str
    is_active: Optional[bool] = True
    display_order: Optional[int] = None

class AccessTypeCreate(AccessTypeBase):
    pass

class AccessTypeUpdate(BaseSchema):
    code: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    format: Optional[str] = None
    is_active: Optional[bool] = None
    display_order: Optional[int] = None

class AccessTypeInDBBase(AccessTypeBase):
    id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class AccessType(AccessTypeInDBBase):
    pass
