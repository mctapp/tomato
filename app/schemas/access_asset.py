# app/schemas/access_asset.py
from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import Field, validator
from app.schemas.base import BaseSchema

# 미디어 타입과 언어 상수 정의 (기존 코드 유지)
MEDIA_TYPES = ["AD", "CC", "SL", "IA", "IC", "IS", "RA", "RC", "RS"]
LANGUAGES = ["ko", "en", "ja", "zh", "vi", "fr", "es", "de", "ru", "ar", "th"]
ASSET_TYPES = ["description", "introduction", "review"]
PUBLISHING_STATUSES = ["draft", "review", "published", "archived"]
PRODUCTION_STATUSES = ["planning", "in_progress", "completed", "delayed", "cancelled"]
ACCESS_POLICIES = ["private", "public", "restricted", "educational", "commercial"]

# ----- 관계 모델 응답 스키마 -----

class ScriptwriterResponse(BaseSchema):
    """대본 작가 응답 스키마"""
    id: int
    name: str
    gender: Optional[str] = None
    location: Optional[str] = None
    skill_level: Optional[int] = None
    profile_image: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None

    class Config:
        orm_mode = True

class VoiceArtistResponse(BaseSchema):
    """성우 응답 스키마"""
    id: int
    voiceartist_name: str
    voiceartist_gender: Optional[str] = None
    voiceartist_location: Optional[str] = None
    voiceartist_level: Optional[int] = None
    profile_image: Optional[str] = None
    voiceartist_phone: Optional[str] = None
    voiceartist_email: Optional[str] = None

    class Config:
        orm_mode = True

class SLInterpreterResponse(BaseSchema):
    """수어 통역사 응답 스키마"""
    id: int
    name: str
    gender: Optional[str] = None
    location: Optional[str] = None
    skill_level: Optional[int] = None
    profile_image: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None

    class Config:
        orm_mode = True

class StaffResponse(BaseSchema):
    """스태프 응답 스키마"""
    id: int
    name: str
    gender: Optional[str] = None
    location: Optional[str] = None
    skill_level: Optional[int] = None
    profile_image: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None

    class Config:
        orm_mode = True

# ----- 영화 관련 스키마 추가 -----

class MovieSimpleResponse(BaseSchema):
    """영화 간단 응답 스키마"""
    id: int
    title: str
    director: Optional[str] = None
    release_date: Optional[datetime] = None

    class Config:
        orm_mode = True

# ----- 접근성 미디어 자산 스키마 -----

class AccessAssetBase(BaseSchema):
    """접근성 미디어 자산 기본 스키마"""
    movie_id: int = Field(..., description="영화 ID")
    media_type: str = Field(..., description="미디어 타입 (AD, CC, SL 등)", pattern=f"^({'|'.join(MEDIA_TYPES)})$")
    language: str = Field(..., description="언어 코드", pattern=f"^({'|'.join(LANGUAGES)})$")
    asset_type: str = Field(..., description="자산 유형", pattern=f"^({'|'.join(ASSET_TYPES)})$")
    name: str = Field(..., description="미디어 이름")
    
    # 설명 필드 추가
    description: Optional[str] = Field(None, description="미디어 설명")

    # 선택적 필드
    guideline_id: Optional[int] = Field(None, description="가이드라인 ID")
    production_year: Optional[int] = Field(None, description="제작 연도")
    supported_os: Optional[str] = Field(None, description="지원 OS (iOS 또는 Android)")  # 리스트에서 문자열로 변경
    is_public: bool = Field(False, description="공개 여부")
    is_locked: bool = Field(True, description="잠금 여부")
    publishing_status: str = Field("draft", description="게시 상태")
    access_policy: str = Field("private", description="접근 정책")
    production_status: str = Field("planning", description="제작 상태")

    @validator('production_year')
    def validate_production_year(cls, v):
        if v is not None and (v < 1900 or v > datetime.now().year + 5):
            raise ValueError(f"제작 연도는 1900년부터 {datetime.now().year + 5}년 사이여야 합니다")
        return v

    @validator('publishing_status')
    def validate_publishing_status(cls, v):
        if v not in PUBLISHING_STATUSES:
            raise ValueError(f"게시 상태는 {', '.join(PUBLISHING_STATUSES)} 중 하나여야 합니다")
        return v

    @validator('production_status')
    def validate_production_status(cls, v):
        if v not in PRODUCTION_STATUSES:
            raise ValueError(f"제작 상태는 {', '.join(PRODUCTION_STATUSES)} 중 하나여야 합니다")
        return v

    @validator('access_policy')
    def validate_access_policy(cls, v):
        if v not in ACCESS_POLICIES:
            raise ValueError(f"접근 정책은 {', '.join(ACCESS_POLICIES)} 중 하나여야 합니다")
        return v
        
    @validator('supported_os')
    def validate_supported_os(cls, v):
        if v is not None and v not in ['iOS', 'Android']:
            raise ValueError("지원 OS는 'iOS' 또는 'Android' 중 하나여야 합니다")
        return v

class AccessAssetCreate(AccessAssetBase):
    """접근성 미디어 자산 생성 스키마"""
    # 파일 정보 (직접 업로드 시)
    original_filename: Optional[str] = None
    s3_filename: Optional[str] = None
    s3_directory: Optional[str] = None
    file_size: Optional[int] = None
    file_type: Optional[str] = None
    uploaded_at: Optional[datetime] = None

    # 또는 FileAsset 참조 (중앙화된 파일 관리 사용 시)
    media_file_id: Optional[int] = None

class AccessAssetUpdate(BaseSchema):
    """접근성 미디어 자산 업데이트 스키마"""
    movie_id: Optional[int] = None
    media_type: Optional[str] = Field(None, pattern=f"^({'|'.join(MEDIA_TYPES)})$")
    language: Optional[str] = Field(None, pattern=f"^({'|'.join(LANGUAGES)})$")
    asset_type: Optional[str] = Field(None, pattern=f"^({'|'.join(ASSET_TYPES)})$")
    name: Optional[str] = None
    
    # 설명 필드 추가
    description: Optional[str] = None
    
    guideline_id: Optional[int] = None
    production_year: Optional[int] = None
    supported_os: Optional[str] = None  # 리스트에서 문자열로 변경
    is_public: Optional[bool] = None
    is_locked: Optional[bool] = None
    publishing_status: Optional[str] = None
    access_policy: Optional[str] = None
    production_status: Optional[str] = None
    media_file_id: Optional[int] = None

# ----- 크레디트 관련 스키마 -----

class AccessAssetCreditBase(BaseSchema):
    """접근성 미디어 자산 제작진 기본 스키마"""
    person_type: str = Field(..., description="인물 타입", pattern="^(scriptwriter|voice_artist|sl_interpreter|staff)$")
    person_id: int = Field(..., description="인물 ID")
    role: str = Field(..., description="역할")
    sequence_number: int = Field(..., description="순서", ge=1, le=100)
    memo: Optional[str] = Field(None, description="메모")
    is_primary: Optional[bool] = Field(True, description="주요 담당자 여부")  # 추가

class AccessAssetCreditCreate(AccessAssetCreditBase):
    """접근성 미디어 자산 제작진 생성 스키마"""
    # 타입별 ID 필드 (선택적)
    scriptwriter_id: Optional[int] = None
    voice_artist_id: Optional[int] = None
    sl_interpreter_id: Optional[int] = None
    staff_id: Optional[int] = None

class AccessAssetCreditUpdate(BaseSchema):
    """접근성 미디어 자산 제작진 수정 스키마"""
    role: Optional[str] = Field(None, description="역할")
    memo: Optional[str] = Field(None, description="메모")
    is_primary: Optional[bool] = Field(None, description="주요 담당자 여부")  # 추가

class AccessAssetCreditInDB(AccessAssetCreditBase):
    """접근성 미디어 자산 제작진 응답 스키마"""
    id: int
    access_asset_id: int
    created_at: datetime
    
    # 타입별 ID 필드
    scriptwriter_id: Optional[int] = None
    voice_artist_id: Optional[int] = None
    sl_interpreter_id: Optional[int] = None
    staff_id: Optional[int] = None
    
    # 관계 데이터 (populate될 때 포함)
    scriptwriter: Optional[ScriptwriterResponse] = None
    voice_artist: Optional[VoiceArtistResponse] = None
    sl_interpreter: Optional[SLInterpreterResponse] = None
    staff: Optional[StaffResponse] = None

    class Config:
        orm_mode = True
        from_attributes = True

# ----- 크레디트 간단 스키마 추가 -----

class VoiceArtistCreditInfo(BaseSchema):
    """성우 크레디트 정보"""
    role: str
    is_primary: bool
    sequence_number: int
    memo: Optional[str] = None

    class Config:
        orm_mode = True

# ----- 메모 관련 스키마 -----

class AccessAssetMemoBase(BaseSchema):
    """접근성 미디어 자산 메모 기본 스키마"""
    content: str = Field(..., description="메모 내용")

class AccessAssetMemoCreate(AccessAssetMemoBase):
    """접근성 미디어 자산 메모 생성 스키마"""
    created_by: Optional[int] = None

class AccessAssetMemoInDB(AccessAssetMemoBase):
    """접근성 미디어 자산 메모 응답 스키마"""
    id: int
    access_asset_id: int
    created_by: Optional[int] = None
    created_at: datetime

    class Config:
        orm_mode = True

# ----- 파일 관련 스키마 -----

class FileAssetResponse(BaseSchema):
    """파일 자산 응답 스키마"""
    id: int
    s3_key: str
    s3_bucket: str
    original_filename: str
    content_type: str
    file_size: int
    is_public: bool
    entity_type: str
    entity_id: int
    usage_type: str
    created_at: datetime
    updated_at: datetime
    width: Optional[int] = None
    height: Optional[int] = None
    status: str
    supported_os_type: Optional[str] = None

    # 동적으로 생성되는 URL
    presigned_url: Optional[str] = None
    public_url: Optional[str] = None

    class Config:
        orm_mode = True

class FileUploadResponse(BaseSchema):
    """파일 업로드 응답 스키마"""
    file_url: str
    file_name: str
    file_size: int
    file_type: str

class PresignedUrlResponse(BaseSchema):
    """Presigned URL 응답 스키마"""
    url: str
    expires_in: int
    # 추가 필드 (필요한 경우)
    s3_key: Optional[str] = None
    new_s3_filename: Optional[str] = None

# ----- 메인 응답 스키마 -----

class AccessAsset(BaseSchema):
    """접근성 미디어 자산 응답 스키마"""
    id: int
    movie_id: int
    media_type: str
    language: str
    asset_type: str
    name: str
    
    # 설명 필드 추가
    description: Optional[str] = None
    
    guideline_id: Optional[int] = None
    production_year: Optional[int] = None
    supported_os: Optional[str] = None  # 리스트에서 문자열로 변경
    is_public: bool
    is_locked: bool
    publishing_status: str
    access_policy: str
    production_status: str

    # 파일 정보
    original_filename: Optional[str] = None
    s3_filename: Optional[str] = None
    s3_directory: Optional[str] = None
    file_size: Optional[int] = None
    file_type: Optional[str] = None
    uploaded_at: Optional[datetime] = None
    media_file_id: Optional[int] = None

    # 시간 정보
    created_at: datetime
    updated_at: datetime

    # 관계 데이터
    credits: List[AccessAssetCreditInDB] = []
    memos: List[AccessAssetMemoInDB] = []

    class Config:
        orm_mode = True

# 상세 응답을 위한 스키마 (새 엔드포인트용)
class AccessAssetDetailResponse(AccessAsset):
    """접근성 미디어 자산 상세 응답 스키마"""
    movie_title: Optional[str] = None
    guideline_name: Optional[str] = None
    media_file: Optional[FileAssetResponse] = None
    download_url: Optional[str] = None

# 다른 응답용 스키마 (새 엔드포인트용)
class AccessAssetResponse(AccessAsset):
    """접근성 미디어 자산 응답 스키마 (기존 AccessAsset과 동일)"""
    pass

# ----- 성우가 참여한 접근성 자산 스키마 추가 -----

class AccessAssetWithMovie(BaseSchema):
    """영화 정보와 성우 크레디트를 포함한 접근성 미디어 자산 스키마"""
    id: int
    name: str
    media_type: str
    language: str
    asset_type: str
    production_year: Optional[int] = None
    production_status: str
    publishing_status: str
    created_at: datetime
    
    # 영화 정보
    movie: Optional[MovieSimpleResponse] = None
    
    # 해당 성우의 크레디트 정보
    credit: Optional[VoiceArtistCreditInfo] = None

    class Config:
        orm_mode = True
