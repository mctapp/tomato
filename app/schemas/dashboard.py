from typing import List, Optional
from pydantic import BaseModel

class CardOrderCreate(BaseModel):
    card_id: str
    position: int

class CardVisibilityCreate(BaseModel):
    card_id: str
    is_visible: bool

class CardStateCreate(BaseModel):
    card_id: str
    is_collapsed: bool

class DashboardPreferences(BaseModel):
    cardOrder: List[str]
    visibleCards: List[str]
    collapsedCards: List[str]
