# app/models/voice_artist.py
from typing import List, Optional
from sqlmodel import Field, Relationship, SQLModel
from datetime import datetime

class VoiceArtistBase(SQLModel):
    voiceartist_name: str = Field(index=True)
    profile_image: Optional[str] = Field(default=None)
    voiceartist_gender: Optional[str] = Field(default=None)
    voiceartist_location: Optional[str] = Field(default=None)
    voiceartist_level: Optional[int] = Field(default=None, index=True)
    voiceartist_phone: Optional[str] = Field(default=None)  # 전화번호 필드
    voiceartist_email: Optional[str] = Field(default=None)  # 이메일 필드
    voiceartist_memo: Optional[str] = Field(default=None)

class VoiceArtist(VoiceArtistBase, table=True):
    __tablename__ = "voice_artists"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    updated_at: datetime = Field(default_factory=datetime.utcnow, nullable=False, sa_column_kwargs={"onupdate": datetime.utcnow})
    
    # Relationships
    samples: List["VoiceArtistSample"] = Relationship(
        back_populates="voice_artist",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )
    expertise: List["VoiceArtistExpertise"] = Relationship(
        back_populates="voice_artist",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )
    
    # 접근성 자산 크레딧 관계 추가
    access_asset_credits: List["AccessAssetCredit"] = Relationship(
        back_populates="voice_artist",
        sa_relationship_kwargs={"foreign_keys": "[AccessAssetCredit.voice_artist_id]"}
    )


class VoiceArtistSampleBase(SQLModel):
    voice_artist_id: Optional[int] = Field(default=None, foreign_key="voice_artists.id", index=True)
    sequence_number: int = Field()
    title: str = Field()
    file_path: str = Field()

class VoiceArtistSample(VoiceArtistSampleBase, table=True):
    __tablename__ = "voice_artist_samples"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    
    # Relationships
    voice_artist: Optional["VoiceArtist"] = Relationship(back_populates="samples")


class VoiceArtistExpertiseBase(SQLModel):
    voice_artist_id: Optional[int] = Field(default=None, foreign_key="voice_artists.id")
    domain: str = Field()
    domain_other: Optional[str] = Field(default=None)
    grade: int = Field()

class VoiceArtistExpertise(VoiceArtistExpertiseBase, table=True):
    __tablename__ = "voice_artist_expertise"
    
    # Composite primary key
    voice_artist_id: int = Field(primary_key=True, foreign_key="voice_artists.id")
    domain: str = Field(primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    
    # Relationships
    voice_artist: Optional["VoiceArtist"] = Relationship(back_populates="expertise")
