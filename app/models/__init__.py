# app/models/__init__.py
"""
모델 패키지 초기화
- 모든 모델을 한 번에 import 해 SQLAlchemy 매퍼 초기화 문제 방지
"""
# 기본 모델 먼저 가져오기
from .users import User  # noqa: F401

# 독립적인 모델
from .distributors import Distributor  # noqa: F401
from .image_renditions import ImageRendition  # noqa: F401
from .access_guideline import AccessGuideline  # noqa: F401
from .file_assets import FileAsset  # noqa: F401
from .user_preference import UserPreference  # noqa: F401

# 인력 관련 모델 (AccessAssetCredit보다 먼저 import)
from .scriptwriter import Scriptwriter  # noqa: F401
from .voice_artist import VoiceArtist  # noqa: F401
from .sl_interpreter import SLInterpreter  # noqa: F401
from .staff import Staff  # noqa: F401

# 종속성 있는 모델
from .movies import Movie  # noqa: F401
from .access_asset import AccessAsset  # noqa: F401
from .access_asset_credit import AccessAssetCredit  # noqa: F401
from .access_asset_memo import AccessAssetMemo  # noqa: F401

# 접근성 관련 모델
from .media_access import MediaAccessRequest, MediaRating, RatingFeedback, MediaProductionTask  # noqa: F401

# 프로덕션 관련 모델 (순서 중요)
from .production_template import ProductionTemplate  # noqa: F401
from .production_project import ProductionProject  # noqa: F401
from .production_task import ProductionTask  # noqa: F401
from .production_memo import ProductionMemo  # noqa: F401
from .worker_performance_records import WorkerPerformanceRecord  # noqa: F401

__all__ = [
    "User",
    "Distributor",
    "ImageRendition",
    "Movie",
    "AccessGuideline",
    "AccessAsset",
    "AccessAssetCredit",
    "AccessAssetMemo",
    "MediaAccessRequest",
    "MediaRating",
    "RatingFeedback",
    "MediaProductionTask",
    "FileAsset",
    "UserPreference",
    "Scriptwriter",
    "VoiceArtist",
    "SLInterpreter",
    "Staff",
    "ProductionTemplate",
    "ProductionProject",
    "ProductionTask",
    "ProductionMemo",
    "WorkerPerformanceRecord",
]
