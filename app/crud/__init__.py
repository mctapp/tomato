# app/crud/__init__.py
"""
CRUD registry – exposes singleton objects for easy import.
Update: replaced legacy access_asset with crud_access_asset, kept alias for backward compatibility.
"""

from .crud_voice_artist import voice_artist
from .crud_access_expert import access_expert
from .crud_access_guideline import access_guideline
from .crud_access_asset import access_asset as crud_access_asset

# —— legacy alias (optional) ——
access_asset = crud_access_asset

# Credits & memos CRUD
from .crud_access_asset_credit import access_asset_credit
from .crud_access_asset_memo import crud_access_asset_memo as access_asset_memo

__all__ = [
    "voice_artist",
    "access_expert",
    "access_guideline",
    "crud_access_asset",
    "access_asset_credit",
    "access_asset_memo",
]
