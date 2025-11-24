# Current Date and Time (UTC): 2025-04-25 08:00:00
# File: app/models/distributors.py

from sqlmodel import SQLModel, Field, Column, Relationship
from typing import Optional, List
from datetime import datetime
from sqlalchemy import DateTime
from sqlalchemy.sql import func

# --- 순환 참조 방지를 위해 TYPE_CHECKING 사용 ---
from typing import TYPE_CHECKING
if TYPE_CHECKING:
    from .distributor_contacts import DistributorContact
    from .movies import Movie # --- !!! Movie 모델 임포트 추가 !!! ---
# ----------------------------------------------


class Distributor(SQLModel, table=True):
    __tablename__ = "distributors"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    is_active: bool = Field(default=True)

    # --- Optional Fields ---
    business_registration_number: Optional[str] = Field(default=None)
    address: Optional[str] = Field(default=None)
    website: Optional[str] = Field(default=None)
    ceo_name: Optional[str] = Field(default=None)
    notes: Optional[str] = Field(default=None)
    tax_invoice_email: Optional[str] = Field(default=None)
    bank_account_copy_s3_dir: Optional[str] = Field(default=None)
    bank_account_copy_s3_file: Optional[str] = Field(default=None)
    bank_name: Optional[str] = Field(default=None)
    bank_account_number: Optional[str] = Field(default=None)
    account_holder_name: Optional[str] = Field(default=None)
    settlement_cycle: Optional[str] = Field(default=None)
    default_revenue_share: Optional[float] = Field(default=None)
    payment_method: Optional[str] = Field(default=None)

    # --- Timestamps ---
    created_at: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    )
    updated_at: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    )

    # --- 관계 정의 ---
    # DistributorContact 와의 관계
    contacts: List["DistributorContact"] = Relationship(back_populates="distributor")

    # --- !!! Movie 모델과의 관계 추가 !!! ---
    movies: List["Movie"] = Relationship(back_populates="distributor")
    # ------------------------------------

# --- DistributorContact 모델 정의 (예시, 별도 파일에 있어야 함) ---
# class DistributorContact(SQLModel, table=True):
#     ...
#     distributor: Distributor = Relationship(back_populates="contacts")
