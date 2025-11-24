# app/models/access_asset_credit.py
from typing import Optional
from sqlmodel import Field, Relationship, SQLModel, Column
from sqlalchemy import CheckConstraint, ForeignKey, Integer
from datetime import datetime

class AccessAssetCredit(SQLModel, table=True):
    __tablename__ = "access_asset_credits"
    __table_args__ = (
        CheckConstraint(
            "person_type IN ('scriptwriter', 'voice_artist', 'sl_interpreter', 'staff')",
            name="check_person_type"
        ),
        {"extend_existing": True}
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    access_asset_id: int = Field(foreign_key="access_assets.id", index=True)
    
    # Person type to identify which table to reference
    person_type: str = Field(index=True)
    
    # Generic person_id field (legacy support)
    person_id: int
    
    # Specific foreign keys for each person type
    scriptwriter_id: Optional[int] = Field(
        default=None,
        sa_column=Column(Integer, ForeignKey("scriptwriters.id", ondelete="CASCADE"), nullable=True, index=True)
    )
    voice_artist_id: Optional[int] = Field(
        default=None,
        sa_column=Column(Integer, ForeignKey("voice_artists.id", ondelete="CASCADE"), nullable=True, index=True)
    )
    sl_interpreter_id: Optional[int] = Field(
        default=None,
        sa_column=Column(Integer, ForeignKey("sl_interpreters.id", ondelete="CASCADE"), nullable=True, index=True)
    )
    staff_id: Optional[int] = Field(
        default=None,
        sa_column=Column(Integer, ForeignKey("staffs.id", ondelete="CASCADE"), nullable=True, index=True)
    )
    
    # Common fields
    role: str
    sequence_number: int
    memo: Optional[str] = Field(default=None)
    is_primary: bool = Field(default=True)  # 추가
    created_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    access_asset: Optional["AccessAsset"] = Relationship(back_populates="credits")
    
    # Relationships to person tables
    scriptwriter: Optional["Scriptwriter"] = Relationship(
        sa_relationship_kwargs={
            "foreign_keys": "AccessAssetCredit.scriptwriter_id",
            "lazy": "joined"
        }
    )
    voice_artist: Optional["VoiceArtist"] = Relationship(
        sa_relationship_kwargs={
            "foreign_keys": "AccessAssetCredit.voice_artist_id",
            "lazy": "joined"
        }
    )
    sl_interpreter: Optional["SLInterpreter"] = Relationship(
        sa_relationship_kwargs={
            "foreign_keys": "AccessAssetCredit.sl_interpreter_id",
            "lazy": "joined"
        }
    )
    staff: Optional["Staff"] = Relationship(
        sa_relationship_kwargs={
            "foreign_keys": "AccessAssetCredit.staff_id",
            "lazy": "joined"
        }
    )
    
    # Computed property to get the actual person object
    @property
    def person(self):
        if self.person_type == 'scriptwriter' and self.scriptwriter:
            return self.scriptwriter
        elif self.person_type == 'voice_artist' and self.voice_artist:
            return self.voice_artist
        elif self.person_type == 'sl_interpreter' and self.sl_interpreter:
            return self.sl_interpreter
        elif self.person_type == 'staff' and self.staff:
            return self.staff
        return None
    
    # Computed property to get the person's name
    @property
    def person_name(self):
        person = self.person
        if person:
            # Different models have different name fields
            if self.person_type == 'voice_artist':
                return getattr(person, 'voiceartist_name', 'Unknown')
            else:
                return getattr(person, 'name', 'Unknown')
        return 'Unknown'
