# 이미지 업로드 오류 해결 가이드

이 문서는 관리자 패널에서 이미지 업로드 기능 구현 시 발생할 수 있는 오류와 해결 방법을 정리합니다.

## 목차
1. [JWT 토큰 오류](#1-jwt-토큰-오류)
2. [422 Unprocessable Content 오류](#2-422-unprocessable-content-오류)
3. [405 Method Not Allowed 오류](#3-405-method-not-allowed-오류)
4. [TypeError: Cannot read properties of undefined](#4-typeerror-cannot-read-properties-of-undefined)

---

## 1. JWT 토큰 오류

### 증상
```
JWT 토큰이 없습니다. 다시 로그인하세요.
```

### 원인
- axios API 인스턴스에 `withCredentials: true` 누락
- 쿠키 기반 인증이 활성화되지 않음

### 해결 방법

#### 1-1. axios API 인스턴스 설정 확인
**파일**: `admin-panel/lib/api.ts`

```typescript
export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,  // 쿠키 기반 인증을 위해 필수
});
```

#### 1-2. 파일 업로드 컴포넌트에서 credentials 설정
**파일**: `admin-panel/app/components/common/uploads/FileUploadBase.tsx`

native fetch 사용 시:
```typescript
const response = await fetch(uploadUrl, {
  method: 'POST',
  body: formData,
  credentials: 'include',  // 쿠키 전송을 위해 필수
});
```

#### 1-3. 백엔드 로그인 응답에 access_token 포함 확인
**파일**: `app/routes/auth.py`

로그인 및 MFA 검증 응답에 `access_token` 필드가 포함되어야 함:
```python
return {
    "access_token": access_token,
    "user": { ... },
    "message": "Login successful"
}
```

---

## 2. 422 Unprocessable Content 오류

### 증상
```
PUT /admin/api/movies/24 422 (Unprocessable Content)
```

### 원인
1. 프론트엔드에서 백엔드 스키마에 없는 필드 전송
2. 빈 문자열(`""`)을 날짜/숫자 필드에 전송 (Pydantic 검증 실패)

### 해결 방법

#### 2-1. 허용된 필드만 전송
백엔드 Pydantic 스키마를 확인하고 해당 필드만 전송:

```typescript
// 백엔드 스키마에서 허용하는 필드만 추출
const movieData = {
  title: data.title,
  director: data.director,
  // ... 스키마에 정의된 필드만 포함
};
```

#### 2-2. 빈 문자열을 null로 변환
**파일**: 해당 Form 컴포넌트 (예: `MovieForm.tsx`)

```typescript
// 빈 문자열을 null로 변환하는 헬퍼 함수
const emptyToNull = (value: string | null | undefined): string | null => {
  return value === "" || value === undefined ? null : value;
};

const movieData = {
  title: data.title,
  director: emptyToNull(data.director),
  releaseDate: emptyToNull(data.releaseDate),
  startAt: emptyToNull(data.startAt),
  endAt: emptyToNull(data.endAt),
  // ... 선택적 문자열/날짜 필드에 적용
};
```

#### 2-3. 백엔드 스키마에 validator 추가 (선택적)
**파일**: `app/schemas/*.py`

```python
from pydantic import field_validator

class MovieUpdate(BaseSchema):
    start_at: Optional[datetime] = None

    @field_validator('start_at', 'end_at', mode='before')
    @classmethod
    def empty_str_to_none(cls, v):
        if v == "":
            return None
        return v
```

---

## 3. 405 Method Not Allowed 오류

### 증상
```
GET /admin/api/uploads/files/37 405 (Method Not Allowed)
```

### 원인
- 단일 파일 정보 조회 API 엔드포인트가 없음

### 해결 방법

#### 3-1. 백엔드에 단일 파일 조회 엔드포인트 추가
**파일**: `app/routes/admin_uploads.py`

```python
@router.get("/files/{file_id}", response_model=FileAssetResponse)
async def get_file_by_id(
    file_id: int = Path(...),
    with_url: bool = Query(False),
    url_expiry: int = Query(3600, ge=60, le=86400),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_session)
):
    """단일 파일 정보 조회"""
    try:
        file_service = get_file_asset_service(db)
        file_asset = file_service.get_by_id(file_id)

        if not file_asset:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="File not found"
            )

        return file_service.format_response(
            file_asset,
            with_url=with_url,
            url_expiry=url_expiry
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving file: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
```

> **주의**: 이 엔드포인트는 `/files` (목록 조회) 엔드포인트보다 **먼저** 정의해야 합니다.
> FastAPI는 라우트를 순서대로 매칭하므로, `/files/{file_id}`가 `/files` 뒤에 있으면
> `{file_id}`가 쿼리 파라미터로 잘못 해석될 수 있습니다.

---

## 4. TypeError: Cannot read properties of undefined

### 증상
```
TypeError: Cannot read properties of undefined (reading 'split')
```

### 원인
- `fileInfo.type`이 undefined인 상태에서 `.split()` 호출

### 해결 방법

#### 4-1. 안전한 속성 접근
**파일**: `admin-panel/app/components/common/uploads/ImageUpload.tsx`

```typescript
// Before (오류 발생)
{fileInfo.type.split('/')[1]?.toUpperCase() || fileInfo.type}

// After (안전한 처리)
{fileInfo.type
  ? (fileInfo.type.split('/')[1]?.toUpperCase() || fileInfo.type)
  : 'FILE'}
```

#### 4-2. API 응답 데이터 안전하게 처리
```typescript
.then(data => {
  setFileInfo({
    name: data.original_filename || data.originalFilename || 'Unknown',
    type: data.content_type || data.contentType || '',
    size: data.file_size || data.fileSize || 0
  });
})
```

> **참고**: snake_case와 camelCase 응답 모두 처리해야 합니다.
> 백엔드는 snake_case를 반환하지만, axios 인터셉터가 camelCase로 변환할 수 있습니다.

---

## 체크리스트

새로운 이미지 업로드 기능 구현 시 확인할 항목:

### 프론트엔드
- [ ] axios API 인스턴스에 `withCredentials: true` 설정
- [ ] native fetch 사용 시 `credentials: 'include'` 설정
- [ ] 폼 제출 시 백엔드 스키마에 정의된 필드만 전송
- [ ] 선택적 필드의 빈 문자열을 `null`로 변환
- [ ] undefined 속성 접근 시 안전한 처리 (옵셔널 체이닝, 기본값)
- [ ] snake_case/camelCase 응답 모두 처리

### 백엔드
- [ ] 파일 업로드 엔드포인트 존재 확인 (`/admin/api/uploads/...`)
- [ ] 단일 파일 조회 엔드포인트 존재 확인 (`GET /files/{file_id}`)
- [ ] Pydantic 스키마에 `empty_str_to_none` validator 추가 (선택적)
- [ ] 로그인 응답에 `access_token` 포함 확인

---

## 관련 파일

| 파일 | 설명 |
|------|------|
| `admin-panel/lib/api.ts` | axios 인스턴스 설정 |
| `admin-panel/app/components/common/uploads/FileUploadBase.tsx` | 파일 업로드 기본 컴포넌트 |
| `admin-panel/app/components/common/uploads/ImageUpload.tsx` | 이미지 업로드 컴포넌트 |
| `app/routes/admin_uploads.py` | 파일 업로드 API 라우터 |
| `app/schemas/*.py` | Pydantic 스키마 정의 |

---

## 히스토리

| 날짜 | 페이지 | 해결한 오류 |
|------|--------|-------------|
| 2025-12 | 성우 프로필 이미지 | JWT 토큰 오류, withCredentials 추가 |
| 2025-12 | 영화 편집 페이지 | JWT 토큰 오류, 422 오류, 405 오류, split 오류 |
