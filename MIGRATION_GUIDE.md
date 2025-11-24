# 포스터 URL 마이그레이션 가이드

## 개요
Movie 테이블에 `poster_url` 필드를 추가하여 S3 public URL을 직접 저장합니다.
이를 통해 포스터 이미지 로딩 성능을 개선하고, `/api/files/{id}` 엔드포인트 의존성을 제거합니다.

## 변경 사항

### 데이터베이스
- `movie` 테이블에 `poster_url VARCHAR(500)` 컬럼 추가

### 백엔드
- `app/models/movies.py`: `poster_url` 필드 추가
- `app/schemas/movie.py`: 모든 movie 스키마에 `poster_url` 추가

### 프론트엔드
- `components/movies/MovieForm.tsx`:
  - `api.ts` 사용으로 camelCase ↔ snake_case 자동 변환
  - poster URL 저장 로직 추가
- `types/movie.ts`: `posterUrl` 필드 추가

### ✅ 중요: 자동 필드명 변환
프론트엔드는 `posterUrl` (camelCase), 백엔드는 `poster_url` (snake_case)을 사용합니다.
`lib/api.ts`의 axios 인터셉터가 자동으로 변환하므로 **새로 업로드하면 자동으로 저장**됩니다!

## 마이그레이션 순서

### 1. 데이터베이스 스키마 마이그레이션

#### 방법 A: Alembic 사용 (권장)

```bash
# 1. 마이그레이션 실행
alembic upgrade head

# 2. 마이그레이션 확인
alembic current
# 출력: 172221300b9a (head)
```

#### 방법 B: 직접 SQL 실행

```sql
-- PostgreSQL
ALTER TABLE movie ADD COLUMN poster_url VARCHAR(500);

-- MySQL
ALTER TABLE movie ADD COLUMN poster_url VARCHAR(500) NULL;
```

### 2. 기존 데이터 마이그레이션

기존 영화의 `poster_file_id`가 있는 경우, 해당하는 S3 URL을 `poster_url`에 채워넣습니다.

#### 방법 A: Python 스크립트 사용 (권장)

```bash
# 1. Dry-run으로 먼저 테스트
python scripts/migrate_poster_urls.py --dry-run

# 2. 실제 마이그레이션 실행
python scripts/migrate_poster_urls.py

# 3. 일부만 테스트하려면
python scripts/migrate_poster_urls.py --dry-run --limit 10
```

#### 방법 B: SQL로 직접 실행

```sql
-- PostgreSQL
UPDATE movie m
SET poster_url = (
    SELECT CONCAT(
        'https://',
        CASE
            WHEN fa.is_public THEN 'tomato-public'
            ELSE 'tomato-private'
        END,
        '.s3.ap-northeast-2.amazonaws.com/',
        fa.s3_key
    )
    FROM file_assets fa
    WHERE fa.id = m.poster_file_id
      AND fa.status = 'active'
      AND fa.is_public = true
)
WHERE m.poster_file_id IS NOT NULL
  AND m.poster_url IS NULL;
```

### 3. 애플리케이션 재시작

```bash
# 백엔드 재시작
pm2 restart tomato-api

# 또는
systemctl restart tomato-api
```

### 4. 프론트엔드 빌드 및 배포

```bash
cd admin-panel

# 빌드
npm run build

# 배포 (방법에 따라 다름)
# 예: Vercel
vercel --prod

# 예: 직접 배포
pm2 restart tomato-admin
```

## 검증

### 1. 데이터베이스 검증

```sql
-- poster_url이 채워진 영화 개수 확인
SELECT COUNT(*) as movies_with_poster_url
FROM movie
WHERE poster_url IS NOT NULL;

-- poster_file_id는 있지만 poster_url이 없는 영화 확인 (문제 있는 경우)
SELECT id, title, poster_file_id, poster_url
FROM movie
WHERE poster_file_id IS NOT NULL
  AND poster_url IS NULL;

-- 샘플 데이터 확인
SELECT id, title, poster_url
FROM movie
WHERE poster_url IS NOT NULL
LIMIT 5;
```

### 2. 애플리케이션 테스트

1. **영화 목록 페이지**
   - 기존 영화의 포스터 이미지가 정상적으로 표시되는지 확인

2. **영화 상세 페이지**
   - 포스터 이미지가 정상적으로 로드되는지 확인

3. **새 영화 등록**
   - 포스터 업로드 시 JWT 토큰 에러 없이 업로드되는지 확인
   - 업로드 후 즉시 이미지가 표시되는지 확인
   - DB에 `poster_url`이 저장되었는지 확인

4. **기존 영화 수정**
   - 포스터 변경 시 정상 작동하는지 확인
   - 새 `poster_url`이 저장되는지 확인

## 문제 해결

### 이미지가 표시되지 않는 경우

1. **브라우저 콘솔 확인**
   ```
   - CORS 에러: S3 bucket CORS 설정 확인
   - 403 Forbidden: 파일이 public이 아닐 수 있음
   - 404 Not Found: S3에 파일이 없거나 URL이 잘못됨
   ```

2. **데이터베이스 확인**
   ```sql
   -- 해당 영화의 poster_url 확인
   SELECT id, title, poster_url, poster_file_id
   FROM movie
   WHERE id = <영화ID>;

   -- FileAsset 정보 확인
   SELECT id, s3_key, is_public, status
   FROM file_assets
   WHERE id = <poster_file_id>;
   ```

3. **S3에서 직접 확인**
   - AWS Console에서 S3 bucket 확인
   - 파일이 실제로 존재하는지 확인
   - 파일이 public-read ACL을 가지고 있는지 확인

### JWT 토큰 에러가 여전히 발생하는 경우

1. **localStorage 확인**
   ```javascript
   // 브라우저 콘솔에서 실행
   console.log('accessToken:', localStorage.getItem('accessToken'));
   console.log('token (legacy):', localStorage.getItem('token'));
   ```

2. **토큰이 없는 경우**
   - 다시 로그인
   - 로그인 후 `accessToken`이 저장되는지 확인

3. **토큰이 있는데도 에러가 발생하는 경우**
   - 토큰이 만료되었을 수 있음 → 다시 로그인
   - 네트워크 탭에서 Authorization 헤더가 전송되는지 확인

## 롤백

문제가 발생한 경우 롤백:

### 1. 데이터베이스 롤백

```bash
# Alembic으로 롤백
alembic downgrade -1

# 또는 SQL로 직접
# ALTER TABLE movie DROP COLUMN poster_url;
```

### 2. 코드 롤백

```bash
git revert <commit-hash>
git push
```

## 주의 사항

- ⚠️ **운영 환경에서는 반드시 백업 후 진행**
- ⚠️ **Dry-run 테스트를 먼저 실행**
- ⚠️ **트래픽이 적은 시간대에 배포**
- ✅ **모니터링 준비: 에러 로그, S3 요청 수, 응답 시간**

## 관련 파일

- 마이그레이션: `migrations/versions/172221300b9a_add_poster_url_to_movie.py`
- 데이터 마이그레이션: `scripts/migrate_poster_urls.py`
- 백엔드 모델: `app/models/movies.py`
- 프론트엔드 폼: `admin-panel/components/movies/MovieForm.tsx`
