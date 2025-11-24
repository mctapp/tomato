# app/routes/auth.py 파일 전체를 다음과 같이 수정

from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from sqlmodel import Session, select
from datetime import timedelta
from typing import Any, Optional
from pydantic import BaseModel
import json
import secrets
import hashlib

from app.db import get_session
from app.models.users import User, MFAType
from app.utils.security import (
    create_access_token,
    verify_password,
    decode_token,
    ACCESS_TOKEN_EXPIRE_MINUTES
)
from app.schemas.mfa import (
    MFASetupRequest,
    MFASetupResponse,
    MFAVerifyRequest,
    MFALoginResponse,
    MFAStatusResponse
)
from app.auth.mfa.manager import MFAManager
from app.auth.mfa.totp import TOTPProvider
from app.services.encryption.field_encryption import field_encryption_service
from app.core.redis import redis_client
from app.auth.zero_trust.flow import ZeroTrustFlow
from app.auth.devices.trust import DeviceTrustManager

router = APIRouter(prefix="/api/auth")

# MFA 관련 인스턴스
mfa_manager = MFAManager()
totp_provider = TOTPProvider()

# Zero Trust 인스턴스 (DB가 필요없는 것만)
zero_trust_flow = ZeroTrustFlow()
# device_trust_manager는 각 함수에서 생성

class LoginRequest(BaseModel):
    username: str
    password: str

def generate_device_id(request: Request) -> str:
    """요청 정보를 기반으로 디바이스 ID 생성"""
    user_agent = request.headers.get("User-Agent", "")
    accept = request.headers.get("Accept", "")
    accept_language = request.headers.get("Accept-Language", "")
    
    # 디바이스 식별 정보 조합
    device_info = f"{user_agent}:{accept}:{accept_language}"
    
    # SHA-256 해시로 디바이스 ID 생성
    return hashlib.sha256(device_info.encode()).hexdigest()[:32]

def get_current_user_from_cookie(
    request: Request,
    db: Session = Depends(get_session)
) -> User:
    """쿠키에서 토큰을 읽어 현재 사용자 반환"""
    token = request.cookies.get("access_token")
    
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    try:
        payload = decode_token(token)
        user_id: int = int(payload.get("sub"))
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user

# OAuth2PasswordBearer를 사용하는 기존 함수도 유지 (API 호환성을 위해)
def get_current_user(
    request: Request,
    db: Session = Depends(get_session)
) -> User:
    """Authorization 헤더 또는 쿠키에서 토큰을 읽어 현재 사용자 반환"""
    # 먼저 쿠키에서 토큰 확인
    token = request.cookies.get("access_token")
    
    # 쿠키에 없으면 Authorization 헤더 확인
    if not token:
        authorization = request.headers.get("Authorization")
        if authorization and authorization.startswith("Bearer "):
            token = authorization.split(" ")[1]
    
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    try:
        payload = decode_token(token)
        user_id: int = int(payload.get("sub"))
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.post("/login")
async def login(
    request: Request,
    response: Response,
    form_data: LoginRequest,
    db: Session = Depends(get_session),
) -> Any:
    """로그인 엔드포인트 - MFA 및 Zero Trust 지원"""
    user = db.exec(select(User).where(User.email == form_data.username)).first()

    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Zero Trust 및 디바이스 신뢰도 확인
    device_trusted = False
    risk_score = 0.0
    device_id = None
    
    try:
        # Zero Trust 컨텍스트 분석
        zt_context = await zero_trust_flow.analyze_context(request)
        risk_score = zt_context.get("risk_score", 0)
        
        # 디바이스 신뢰도 확인
        device_id = request.headers.get("X-Device-ID") or generate_device_id(request)
        device_trust_manager = DeviceTrustManager(db)
        device_trusted = await device_trust_manager.is_device_trusted(user.id, device_id)
        
        # 위험도가 높거나 신뢰하지 않는 디바이스면 MFA 권장 (강제하지는 않음)
        if (risk_score > 0.5 or not device_trusted) and not user.mfa_enabled:
            # 로그에만 기록하고 계속 진행
            print(f"High risk login: user={user.id}, risk_score={risk_score}, device_trusted={device_trusted}")
    except Exception as e:
        # Zero Trust 에러는 로그만 남기고 로그인은 계속 진행
        print(f"Zero Trust error (continuing): {e}")

    # MFA가 활성화된 경우
    if user.mfa_enabled:
        # MFA 토큰 생성 (5분 유효)
        mfa_token = await mfa_manager.initiate_mfa(user.id, user.mfa_type)
        
        # Redis에 임시 저장 (디바이스 ID도 함께 저장)
        mfa_data = {
            "user_id": user.id,
            "ip_address": request.client.host if request.client else "unknown",
            "risk_score": risk_score
        }
        if device_id:
            mfa_data["device_id"] = device_id
            
        await redis_client.set(
            f"mfa_token:{mfa_token}",
            json.dumps(mfa_data),
            expire=300  # 5분
        )
        
        return MFALoginResponse(
            requires_mfa=True,
            mfa_token=mfa_token,
            mfa_type=user.mfa_type,
            message="MFA verification required"
        )

    # MFA가 없는 경우 바로 로그인
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.id)},
        expires_delta=access_token_expires
    )

    # 🔍 DEBUG: 토큰 생성 확인
    print(f"🔍 DEBUG [login]: access_token generated = {access_token[:50] if access_token else 'None'}...")
    print(f"🔍 DEBUG [login]: user_id = {user.id}, email = {user.email}")

    # 신뢰할 수 있는 디바이스로 등록 (낮은 위험도인 경우)
    if device_id and risk_score <= 0.3 and not device_trusted:
        try:
            device_trust_manager = DeviceTrustManager(db)
            await device_trust_manager.trust_device(user.id, device_id, request)
        except Exception as e:
            print(f"Failed to trust device: {e}")

    # HttpOnly 쿠키 설정
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=True,  # HTTPS 환경에서만 전송
        samesite="lax",  # CSRF 방어
        max_age=int(ACCESS_TOKEN_EXPIRE_MINUTES * 60),  # 초 단위
        path="/"
    )

    # 🔍 DEBUG: 응답 데이터 확인
    response_data = {
        "access_token": access_token,  # localStorage 저장용 추가
        "user": {
            "email": user.email,
            "username": user.username,
            "fullName": user.full_name,
            "isActive": user.is_active,
            "isAdmin": user.is_admin,
            "id": user.id,
            "role": user.role.value,
            "createdAt": user.created_at,
            "updatedAt": user.updated_at,
            "mfaEnabled": user.mfa_enabled
        },
        "message": "Login successful",
        "device_trusted": device_trusted,
        "risk_level": "high" if risk_score > 0.5 else "medium" if risk_score > 0.3 else "low"
    }

    # 🔍 DEBUG: 최종 응답 확인
    print(f"🔍 DEBUG [login]: Returning response with keys: {response_data.keys()}")
    print(f"🔍 DEBUG [login]: access_token in response: {'access_token' in response_data}")
    print(f"🔍 DEBUG [login]: access_token value: {response_data.get('access_token', 'MISSING')[:50] if response_data.get('access_token') else 'None'}...")

    return response_data

@router.post("/mfa/verify")
async def verify_mfa(
    request: Request,
    response: Response,
    verify_data: MFAVerifyRequest,
    db: Session = Depends(get_session)
) -> Any:
    """MFA 코드 검증"""
    # Redis에서 MFA 토큰 확인
    mfa_data = await redis_client.get(f"mfa_token:{verify_data.mfa_token}")
    if not mfa_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired MFA token"
        )
    
    mfa_info = json.loads(mfa_data)
    user_id = mfa_info["user_id"]
    device_id = mfa_info.get("device_id")
    risk_score = mfa_info.get("risk_score", 0)
    
    # MFA 검증
    is_valid = await mfa_manager.verify_mfa(user_id, verify_data.code)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid MFA code"
        )
    
    # Redis에서 토큰 삭제
    await redis_client.delete(f"mfa_token:{verify_data.mfa_token}")
    
    # 사용자 정보 조회
    user = db.get(User, user_id)
    
    # 신뢰할 수 있는 디바이스로 등록 (낮은 위험도인 경우)
    if device_id and risk_score <= 0.3:
        try:
            device_trust_manager = DeviceTrustManager(db)
            device_trusted = await device_trust_manager.is_device_trusted(user_id, device_id)
            if not device_trusted:
                await device_trust_manager.trust_device(user_id, device_id, request)
        except Exception as e:
            print(f"Failed to trust device after MFA: {e}")
    
    # 액세스 토큰 생성
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.id)},
        expires_delta=access_token_expires
    )
    
    # HttpOnly 쿠키 설정
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=int(ACCESS_TOKEN_EXPIRE_MINUTES * 60),
        path="/"
    )
    
    return {
        "access_token": access_token,  # localStorage 저장용 추가
        "user": {
            "email": user.email,
            "username": user.username,
            "fullName": user.full_name,
            "isActive": user.is_active,
            "isAdmin": user.is_admin,
            "id": user.id,
            "role": user.role.value,
            "createdAt": user.created_at,
            "updatedAt": user.updated_at,
            "mfaEnabled": user.mfa_enabled
        },
        "message": "MFA verification successful"
    }

@router.post("/mfa/setup")
async def setup_mfa(
    setup_data: MFASetupRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_session)
) -> MFASetupResponse:
    """MFA 설정"""
    if current_user.mfa_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="MFA is already enabled"
        )
    
    response_data = {}
    
    # TOTP 설정 - 이메일 전달 추가
    if setup_data.mfa_type == MFAType.TOTP:
        setup_info = await totp_provider.setup_totp(
            current_user.id,
            current_user.email  # 이메일 추가
        )
        response_data["qr_code"] = setup_info.qr_code
        response_data["secret"] = setup_info.secret
        
        # 시크릿 암호화 저장
        encrypted_secret = await field_encryption_service.encrypt_field(setup_info.secret)
        current_user.mfa_secret = encrypted_secret
    
    # SMS MFA 설정
    elif setup_data.mfa_type == MFAType.SMS:
        if not setup_data.phone_number:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Phone number is required for SMS MFA"
            )
        current_user.mfa_phone_number = setup_data.phone_number
    
    # 백업 코드 생성 (8개)
    backup_codes = [secrets.token_hex(4) for _ in range(8)]
    encrypted_codes = await field_encryption_service.encrypt_field(
        json.dumps(backup_codes)
    )
    
    # 사용자 정보 업데이트
    current_user.mfa_type = setup_data.mfa_type
    current_user.mfa_backup_codes = encrypted_codes
    
    db.add(current_user)
    db.commit()
    
    return MFASetupResponse(
        mfa_type=setup_data.mfa_type,
        qr_code=response_data.get("qr_code"),
        secret=response_data.get("secret"),
        backup_codes=backup_codes,
        message="MFA setup initiated. Please verify with a code to complete setup."
    )

@router.post("/mfa/confirm")
async def confirm_mfa_setup(
    verify_data: MFAVerifyRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_session)
) -> Any:
    """MFA 설정 확인 (첫 번째 코드 검증)"""
    if current_user.mfa_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="MFA is already enabled"
        )
    
    # MFA 코드 검증
    is_valid = await mfa_manager.verify_mfa(current_user.id, verify_data.code)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid MFA code"
        )
    
    # MFA 활성화
    current_user.mfa_enabled = True
    db.add(current_user)
    db.commit()
    
    return {"message": "MFA enabled successfully"}

@router.post("/mfa/disable")
async def disable_mfa(
    verify_data: MFAVerifyRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_session)
) -> Any:
    """MFA 해제"""
    if not current_user.mfa_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="MFA is not enabled"
        )
    
    # MFA 코드 검증 (보안을 위해)
    is_valid = await mfa_manager.verify_mfa(current_user.id, verify_data.code)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid MFA code"
        )
    
    # MFA 비활성화
    current_user.mfa_enabled = False
    current_user.mfa_type = MFAType.NONE
    current_user.mfa_secret = None
    current_user.mfa_backup_codes = None
    current_user.mfa_phone_number = None
    
    db.add(current_user)
    db.commit()
    
    return {"message": "MFA disabled successfully"}

@router.get("/mfa/status")
async def get_mfa_status(
    current_user: User = Depends(get_current_user)
) -> MFAStatusResponse:
    """MFA 상태 확인"""
    backup_codes_count = 0
    if current_user.mfa_backup_codes:
        decrypted_codes = await field_encryption_service.decrypt_field(
            current_user.mfa_backup_codes
        )
        backup_codes = json.loads(decrypted_codes)
        backup_codes_count = len(backup_codes)
    
    return MFAStatusResponse(
        mfa_enabled=current_user.mfa_enabled,
        mfa_type=current_user.mfa_type,
        backup_codes_count=backup_codes_count
    )

@router.post("/logout")
async def logout(response: Response) -> Any:
    # 쿠키 삭제
    response.delete_cookie(
        key="access_token",
        path="/",
        secure=True,
        samesite="lax"
    )
    return {"message": "Successfully logged out"}

@router.get("/me")
async def read_users_me(
    current_user: User = Depends(get_current_user)
) -> Any:
    return {
        "email": current_user.email,
        "username": current_user.username,
        "fullName": current_user.full_name,
        "isActive": current_user.is_active,
        "isAdmin": current_user.is_admin,
        "id": current_user.id,
        "role": current_user.role.value,
        "createdAt": current_user.created_at,
        "updatedAt": current_user.updated_at,
        "mfaEnabled": current_user.mfa_enabled,
        "mfaType": current_user.mfa_type.value if current_user.mfa_enabled else None
    }

@router.get("/devices/trusted")
async def get_trusted_devices(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_session)
) -> Any:
    """신뢰하는 디바이스 목록 조회"""
    device_trust_manager = DeviceTrustManager(db)
    devices = await device_trust_manager.list_trusted_devices(current_user.id)
    return {"devices": devices}

@router.delete("/devices/trusted/{device_id}")
async def revoke_device_trust(
    device_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_session)
) -> Any:
    """디바이스 신뢰 해제"""
    device_trust_manager = DeviceTrustManager(db)
    success = await device_trust_manager.revoke_trust(current_user.id, device_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Device not found"
        )
    return {"message": "Device trust revoked successfully"}
