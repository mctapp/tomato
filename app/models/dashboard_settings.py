
# app/models/dashboard_settings.py
from typing import Optional
from sqlmodel import SQLModel, Field, UniqueConstraint
from datetime import datetime

class DashboardCardOrder(SQLModel, table=True):
    __tablename__ = "dashboard_card_order"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    card_id: str
    position: int
    
    class Config:
        table = True
        schema_extra = {
            "table_name": "dashboard_card_order"
        }
        
    __table_args__ = (
        UniqueConstraint("user_id", "card_id", name="uq_dashboard_card_order_user_card"),
    )

class DashboardCardVisibility(SQLModel, table=True):
    __tablename__ = "dashboard_card_visibility"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    card_id: str
    is_visible: bool = True
    
    __table_args__ = (
        UniqueConstraint("user_id", "card_id", name="uq_dashboard_card_visibility_user_card"),
    )

class DashboardCardState(SQLModel, table=True):
    __tablename__ = "dashboard_card_state"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    card_id: str
    is_collapsed: bool = False
    
    __table_args__ = (
        UniqueConstraint("user_id", "card_id", name="uq_dashboard_card_state_user_card"),
    )
