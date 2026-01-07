# 🍅 TOMATO - 사이트 분석 보고서

> **작성일**: 2026-01-08
> **프로젝트명**: TOMATO (접근성 영화 관리 시스템)
> **URL**: https://tomato.mct.kr

---

## 1. 프로젝트 개요

**TOMATO**는 시각/청각 장애인을 위한 **접근성 영화 콘텐츠**(음성해설, 수어해설, 자막 등)의 제작, 관리, 배포를 위한 통합 관리 플랫폼입니다.

### 핵심 목적
- 접근성 미디어 콘텐츠의 체계적인 관리
- 제작 워크플로우 자동화 (칸반 보드)
- 엔터프라이즈급 보안 시스템 구축
- 인력(성우, 작가, 통역사) 통합 관리

---

## 2. 주요 기능

### 2.1 콘텐츠 관리
| 기능 | 설명 |
|------|------|
| **영화 관리** | 영화 정보, 가시성(기간제/공개/비공개), 배포자 연동 |
| **접근성 자산** | AD(음성해설), CC(자막), SL(수어) 등 9가지 미디어 타입 지원 |
| **파일 관리** | AWS S3 연동, Presigned URL 기반 보안 다운로드 |

### 2.2 프로덕션 관리
| 기능 | 설명 |
|------|------|
| **칸반 보드** | 드래그&드롭 기반 작업 관리 (4단계 워크플로우) |
| **프로젝트 관리** | 상태 추적, 진행률 관리, 마감일 설정 |
| **템플릿** | 반복 작업용 템플릿 시스템 |
| **분석/통계** | 프로젝트별 분석 리포트, 타임라인 |

### 2.3 인력 관리
| 대상 | 관리 항목 |
|------|----------|
| **성우** | 프로필, 샘플 음성, 작업 이력 |
| **각본 작가** | 전문분야, 포트폴리오 |
| **수어 통역사** | 경력, 샘플 영상 |
| **스태프** | 역할별 관리, 포트폴리오 |

### 2.4 대시보드
- 만료 임박 영화 알림
- 전체 통계 (영화, 자산, 프로젝트)
- 게시 상태 현황
- 커스터마이즈 가능한 위젯

---

## 3. 차별화된 기능 (보안 중심)

### 3.1 Zero Trust Architecture
```
모든 요청에 대해 지속적 신원 검증
├─ 사용자 신원 확인
├─ 디바이스 신뢰도 평가
├─ IP 주소 분석
├─ 행동 패턴 분석
└─ 위험도 점수 산출 (LOW/MEDIUM/HIGH)
```

### 3.2 다중 인증 (MFA)
- **TOTP**: Google Authenticator 호환
- **SMS**: 휴대폰 문자 인증
- **Email**: 이메일 코드 인증
- **백업 코드**: 8개 복구 코드 제공
- **디바이스 신뢰**: 신뢰 디바이스 등록/관리

### 3.3 고급 Rate Limiting
```python
# 사용자 티어별 차등 제한
Anonymous:   60/min,   600/hour,   3,000/day
Basic:      120/min,  2,000/hour,  20,000/day
Premium:    300/min, 10,000/hour, 100,000/day
Enterprise: 1,000/min, 30,000/hour, 300,000/day

# 엔드포인트별 가중치 적용
고부하 작업 → 높은 가중치 → 더 빠른 제한
```

### 3.4 이상 탐지 (Anomaly Detection)
- ML 모델 기반 비정상 패턴 탐지
- 규칙 기반 위협 탐지 (SQL Injection, XSS 등)
- 스캐너 도구 자동 차단
- 과도한 404 에러 시 자동 블랙리스트

### 3.5 API Gateway
- Throttling (속도 제한)
- Quota 관리 (할당량)
- 입력 검증 (Input Validation)
- 출력 새니타이제이션 (민감정보 마스킹)
- Circuit Breaker (장애 격리)

### 3.6 IP 관리
- DB 기반 동적 화이트리스트
- CIDR 범위 지원
- 국가별 차단 옵션
- 관리자 경로(`/admin/api`) 특별 보호

---

## 4. 기술 스택

### 4.1 백엔드
| 분류 | 기술 | 용도 |
|------|------|------|
| 프레임워크 | **FastAPI** | REST API 서버 |
| 언어 | **Python 3.11** | 백엔드 개발 |
| ORM | **SQLModel + SQLAlchemy** | 데이터베이스 매핑 |
| 데이터베이스 | **PostgreSQL** | 메인 DB |
| 캐싱 | **Redis** | 세션, 캐시 |
| 인증 | **JWT + OAuth2** | 토큰 기반 인증 |
| 암호화 | **passlib (Bcrypt)** | 비밀번호 해싱 |
| 클라우드 | **AWS S3, KMS** | 파일 저장, 암호화 |
| ML | **scikit-learn** | 이상 탐지 |
| 모니터링 | **Sentry, Prometheus** | 에러 추적, 메트릭 |

### 4.2 프론트엔드
| 분류 | 기술 | 용도 |
|------|------|------|
| 프레임워크 | **Next.js 14** | React 풀스택 |
| 언어 | **TypeScript** | 타입 안전성 |
| UI | **Radix UI** | 접근성 컴포넌트 |
| 스타일 | **Tailwind CSS** | 유틸리티 스타일링 |
| 상태관리 | **TanStack Query** | 서버 상태 관리 |
| 폼 | **React Hook Form + Zod** | 폼 검증 |
| 테이블 | **TanStack Table** | 데이터 테이블 |
| DnD | **dnd-kit** | 드래그 앤 드롭 |
| 차트 | **Recharts** | 데이터 시각화 |

### 4.3 인프라
```
AWS
├─ S3: 파일 저장소 (공개/비공개 버킷)
├─ KMS: 암호화 키 관리
├─ CloudFront: CDN (예상)
└─ EC2/ECS: 애플리케이션 실행

데이터
├─ PostgreSQL: 관계형 데이터베이스
└─ Redis: 세션 및 캐시 저장소

모니터링
├─ Sentry: 에러 추적
├─ Prometheus: 메트릭 수집
└─ Structured Logging: JSON 로깅
```

---

## 5. 개선 아이디어

### 5.1 기술적 개선 (3가지)

#### 🔧 1. WebSocket 기반 실시간 알림 시스템
**현재**: 폴링 방식으로 데이터 갱신
**개선**: WebSocket을 통한 실시간 푸시 알림

```typescript
// 구현 예시
const socket = new WebSocket('wss://tomato.mct.kr/ws');

socket.onmessage = (event) => {
  const notification = JSON.parse(event.data);
  if (notification.type === 'TASK_ASSIGNED') {
    toast.info(`새 작업이 할당되었습니다: ${notification.taskName}`);
  }
};
```

**기대 효과**:
- 칸반 보드 실시간 동기화
- 작업 할당/완료 즉시 알림
- 서버 부하 감소 (폴링 제거)

---

#### 🔧 2. GraphQL API 레이어 추가
**현재**: REST API만 제공
**개선**: GraphQL 엔드포인트 병행 제공

```graphql
# 클라이언트가 필요한 데이터만 요청
query GetMovieWithAssets($id: ID!) {
  movie(id: $id) {
    title
    description
    accessAssets {
      mediaType
      status
      credits {
        personName
        role
      }
    }
  }
}
```

**기대 효과**:
- 오버페칭/언더페칭 해결
- 프론트엔드 개발 생산성 향상
- 모바일 앱 대응 용이

---

#### 🔧 3. 분산 작업 큐 (Celery/BullMQ) 도입
**현재**: 동기식 처리
**개선**: 비동기 작업 큐로 무거운 작업 분리

```python
# 비동기 작업 예시
@celery.task
def process_video_transcoding(asset_id: int):
    asset = get_asset(asset_id)
    # 영상 트랜스코딩 (시간 소요)
    transcode_video(asset.file_path)
    # 완료 알림
    notify_user(asset.owner_id, "트랜스코딩 완료")
```

**대상 작업**:
- 대용량 파일 업로드/처리
- 분석 리포트 생성
- 이메일/SMS 발송
- S3 파일 동기화

---

### 5.2 기능적 개선 (3가지)

#### 📋 1. AI 기반 자동 자막 생성
**현재**: 수동으로 자막 제작
**개선**: Whisper API 연동으로 자동 자막 생성

```
워크플로우:
1. 영상 업로드
2. AI가 음성 인식하여 자막 초안 생성
3. 작가가 교정/수정
4. 최종 검수 후 배포
```

**기대 효과**:
- 초기 자막 생성 시간 80% 단축
- 작가의 교정 작업에 집중 가능
- 다국어 자막 지원 용이

---

#### 📋 2. 협업 기능 강화
**현재**: 개별 작업 중심
**개선**: 실시간 협업 기능 추가

```
새로운 기능:
├─ 실시간 댓글/멘션 (@username)
├─ 작업 히스토리 (누가 언제 무엇을 변경했는지)
├─ 파일 버전 관리 (이전 버전 복원)
├─ 작업 인수인계 (할당자 변경 시 히스토리 전달)
└─ 팀 캘린더 (마감일, 미팅 일정 공유)
```

---

#### 📋 3. 모바일 앱 (PWA) 지원
**현재**: 웹 전용
**개선**: PWA로 모바일 환경 최적화

```javascript
// next.config.js
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
});

module.exports = withPWA({
  // 기존 설정
});
```

**주요 기능**:
- 오프라인 대시보드 조회
- 푸시 알림 (작업 할당, 마감 임박)
- 홈 화면 추가
- 빠른 로딩 (서비스 워커 캐싱)

---

### 5.3 디자인/스타일 개선 (3가지)

#### 🎨 1. 다크 모드 지원
**현재**: 라이트 모드만 지원
**개선**: 시스템/수동 다크 모드 전환

```css
/* tailwind.config.js */
module.exports = {
  darkMode: 'class', // 또는 'media'
  theme: {
    extend: {
      colors: {
        dark: {
          bg: '#0f172a',
          card: '#1e293b',
          text: '#f1f5f9',
          border: '#334155',
        }
      }
    }
  }
}
```

```tsx
// 다크 모드 토글 컴포넌트
<Button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
  {theme === 'dark' ? <Sun /> : <Moon />}
</Button>
```

**기대 효과**:
- 눈의 피로 감소 (야간 작업 시)
- 배터리 절약 (OLED 디스플레이)
- 사용자 선호도 반영

---

#### 🎨 2. 마이크로 인터랙션 강화
**현재**: 기본 트랜지션
**개선**: Framer Motion 활용한 세련된 애니메이션

```tsx
// 카드 호버 애니메이션
<motion.div
  whileHover={{
    scale: 1.02,
    boxShadow: "0 10px 30px rgba(0,0,0,0.1)"
  }}
  whileTap={{ scale: 0.98 }}
  transition={{ type: "spring", stiffness: 300 }}
>
  <Card>...</Card>
</motion.div>

// 페이지 전환 애니메이션
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -20 }}
>
  {children}
</motion.div>
```

**적용 대상**:
- 칸반 카드 드래그 시 시각적 피드백
- 모달/다이얼로그 열기/닫기
- 데이터 로딩 스켈레톤
- 성공/에러 토스트 알림

---

#### 🎨 3. 반응형 대시보드 그리드 시스템
**현재**: 고정 레이아웃
**개선**: react-grid-layout으로 드래그 가능한 대시보드

```tsx
import GridLayout from 'react-grid-layout';

const DashboardGrid = () => {
  const [layout, setLayout] = useState([
    { i: 'stats', x: 0, y: 0, w: 2, h: 2 },
    { i: 'chart', x: 2, y: 0, w: 2, h: 2 },
    { i: 'recent', x: 0, y: 2, w: 4, h: 2 },
  ]);

  return (
    <GridLayout
      className="layout"
      layout={layout}
      cols={4}
      rowHeight={150}
      onLayoutChange={setLayout}
      draggableHandle=".drag-handle"
    >
      <div key="stats"><StatsWidget /></div>
      <div key="chart"><ChartWidget /></div>
      <div key="recent"><RecentMoviesWidget /></div>
    </GridLayout>
  );
};
```

**기대 효과**:
- 사용자별 대시보드 커스터마이징
- 위젯 크기 조절 가능
- 레이아웃 저장/복원
- 모바일에서 자동 스택 레이아웃

---

## 6. 보안 체크리스트 현황

| 항목 | 상태 | 비고 |
|------|------|------|
| HTTPS/TLS | ✅ | 프로덕션 강제 |
| HSTS | ✅ | 31536000초 |
| CORS | ✅ | 화이트리스트 기반 |
| CSRF | ✅ | SameSite 쿠키 |
| XSS | ✅ | CSP + X-XSS-Protection |
| SQL Injection | ✅ | Parameterized Query |
| Rate Limiting | ✅ | 3단계 제한 |
| MFA | ✅ | TOTP/SMS/Email |
| 암호화 | ✅ | Bcrypt + AES |
| 감사 로그 | ✅ | 전체 기록 |
| Zero Trust | ✅ | 지속적 검증 |

---

## 7. 결론

TOMATO는 **접근성 콘텐츠 제작**이라는 사회적 가치와 **엔터프라이즈급 보안**을 모두 갖춘 잘 설계된 시스템입니다.

### 강점
- 포괄적인 보안 아키텍처 (Zero Trust, MFA, Rate Limiting)
- 체계적인 프로덕션 워크플로우 (칸반, 템플릿)
- 확장 가능한 기술 스택 (FastAPI, Next.js, PostgreSQL)

### 개선 우선순위 (권장)
1. **🔴 High**: 다크 모드 (사용자 경험 즉시 개선)
2. **🟡 Medium**: WebSocket 실시간 알림 (협업 효율 향상)
3. **🟢 Low**: AI 자막 생성 (장기 로드맵)

---

*이 문서는 코드베이스 분석을 기반으로 작성되었습니다.*
