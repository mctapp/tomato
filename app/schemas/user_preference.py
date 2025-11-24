# app/schemas/user_preference.py
from typing import Dict, Any, Optional
from datetime import datetime
from app.schemas.base import BaseSchema

class UserPreferenceBase(BaseSchema):
    preference_type: str
    preference_data: Dict[str, Any]

class UserPreferenceCreate(UserPreferenceBase):
    pass

class UserPreferenceUpdate(BaseSchema):
    preference_data: Dict[str, Any]

class UserPreferenceResponse(UserPreferenceBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime
    
    model_config = {
        "from_attributes": True
    }
