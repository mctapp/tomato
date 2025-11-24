# app/schemas/distributors.py
from typing import List, Optional
from datetime import datetime
from pydantic import EmailStr, Field, HttpUrl
from app.schemas.base import BaseSchema

# 담당자 관련 스키마
class DistributorContactBase(BaseSchema):
    name: str = Field(..., min_length=1, description="담당자 이름 (필수)")
    position: Optional[str] = Field(None, description="직책")
    department: Optional[str] = Field(None, description="부서")
    email: Optional[EmailStr] = Field(None, description="이메일")
    office_phone: Optional[str] = Field(None, description="사무실 전화번호")
    mobile_phone: Optional[str] = Field(None, description="휴대폰 번호")
    is_primary: bool = Field(..., description="대표 담당자 여부 (필수)")
    notes: Optional[str] = Field(None, description="메모")
    
    model_config = {
        "from_attributes": True,
    }

class DistributorContactCreate(DistributorContactBase):
    pass

class DistributorContactInput(DistributorContactBase):
    id: Optional[int] = Field(None, description="기존 담당자 ID (신규는 null/생략)")

class DistributorContactResponse(DistributorContactBase):
    id: int = Field(..., description="담당자 고유 ID")
    distributor_id: int = Field(..., description="소속 배급사 ID")
    created_at: Optional[datetime] = Field(None, description="생성 일시")
    updated_at: Optional[datetime] = Field(None, description="수정 일시")

# 배급사 관련 스키마
class DistributorBase(BaseSchema):
    name: str = Field(..., min_length=1, description="배급사 이름 (필수)")
    is_active: bool = Field(True, description="활성 상태 (기본값 True)")
    business_registration_number: Optional[str] = None
    address: Optional[str] = None
    website: Optional[str] = None
    ceo_name: Optional[str] = None
    notes: Optional[str] = None
    tax_invoice_email: Optional[EmailStr] = None

    # 결제/정산 정보
    bank_name: Optional[str] = None
    bank_account_number: Optional[str] = None
    account_holder_name: Optional[str] = None
    settlement_cycle: Optional[str] = None
    default_revenue_share: Optional[float] = Field(None, ge=0, le=100, description="수익 분배율 (0~100 사이)")
    payment_method: Optional[str] = None
    
    model_config = {
        "from_attributes": True,
    }

class DistributorCreate(DistributorBase):
    contacts: Optional[List[DistributorContactCreate]] = Field(default_factory=list)

class DistributorUpdate(BaseSchema):
    name: Optional[str] = Field(None, min_length=1)
    is_active: Optional[bool] = None
    business_registration_number: Optional[str] = None
    address: Optional[str] = None
    website: Optional[str] = None
    ceo_name: Optional[str] = None
    notes: Optional[str] = None
    tax_invoice_email: Optional[EmailStr] = None
    bank_name: Optional[str] = None
    bank_account_number: Optional[str] = None
    account_holder_name: Optional[str] = None
    settlement_cycle: Optional[str] = None
    default_revenue_share: Optional[float] = Field(None, ge=0, le=100)
    payment_method: Optional[str] = None
    contacts: Optional[List[DistributorContactInput]] = Field(None, description="수정/추가/삭제할 담당자 목록")
    
    model_config = {
        "from_attributes": True,
    }

class DistributorResponse(DistributorBase):
    id: int = Field(..., description="배급사 고유 ID")
    contacts: List[DistributorContactResponse] = Field([], description="관련 담당자 목록")
    created_at: Optional[datetime] = Field(None, description="생성 일시")
    updated_at: Optional[datetime] = Field(None, description="수정 일시")

class DistributorListItemResponse(BaseSchema):
    id: int = Field(..., description="배급사 고유 ID")
    name: str = Field(..., description="배급사 이름")
    is_active: bool = Field(..., description="활성 상태")
    created_at: Optional[datetime] = Field(None, description="생성 일시")
    updated_at: Optional[datetime] = Field(None, description="수정 일시")
    
    model_config = {
        "from_attributes": True,
    }
