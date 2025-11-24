from typing import Optional, List
from datetime import datetime
from pydantic import EmailStr, Field
from app.schemas.base import BaseSchema
from app.models.users import Role

class UserBase(BaseSchema):
   email: EmailStr
   username: str = Field(..., min_length=3)
   full_name: Optional[str] = None
   is_active: bool = True
   is_admin: bool = False

class UserCreate(UserBase):
   password: str = Field(..., min_length=8)
   role: Role = Field(default=Role.USER)

class UserUpdate(BaseSchema):
   email: Optional[EmailStr] = None
   username: Optional[str] = Field(None, min_length=3)
   full_name: Optional[str] = None
   is_active: Optional[bool] = None
   is_admin: Optional[bool] = None
   password: Optional[str] = Field(None, min_length=8)
   role: Optional[Role] = None

class UserInDB(UserBase):
   id: int
   role: Role
   created_at: datetime
   updated_at: datetime
   
   model_config = {
       "from_attributes": True
   }

class UserResponse(UserInDB):
   pass

class UserListResponse(BaseSchema):
   id: int
   email: str
   username: str
   full_name: Optional[str] = None
   is_active: bool
   is_admin: bool
   role: Role
   created_at: datetime
   
   model_config = {
       "from_attributes": True
   }

class UserLogin(BaseSchema):
   username: str
   password: str

class Token(BaseSchema):
   access_token: str
   token_type: str

class TokenData(BaseSchema):
   username: Optional[str] = None
   user_id: Optional[int] = None
   is_admin: Optional[bool] = None
   role: Optional[Role] = None
