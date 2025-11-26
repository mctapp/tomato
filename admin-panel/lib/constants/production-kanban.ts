// lib/constants/production-kanban.ts
import { StageNumber } from '@/types/production';

// React Query 설정
export const REFETCH_INTERVAL = 30000; // 30초마다 자동 갱신
export const KANBAN_STALE_TIME = 10000; // 10초 후 stale 처리
export const FILTERS_STALE_TIME = 60000; // 1분 후 stale 처리

// 레이아웃 모드 localStorage 키
export const KANBAN_LAYOUT_MODE_KEY = 'kanban-layout-mode';

// 드래그 앤 드롭 설정
export const DND_ACTIVATION_DISTANCE = 8; // 드래그 시작 거리 (픽셀)

// 컴팩트 모드 자동 전환 임계값
export const COMPACT_THRESHOLD = 8; // 카드가 8개 이상이면 컴팩트 모드 제안

// 단계별 진행률 범위 (백엔드와 동기화)
export const STAGE_PROGRESS_RANGES: Record<StageNumber, { min: number; max: number; weight: number }> = {
  1: { min: 0, max: 10, weight: 10 },   // 기획
  2: { min: 10, max: 60, weight: 50 },  // 제작
  3: { min: 60, max: 85, weight: 25 },  // 검수
  4: { min: 85, max: 100, weight: 15 }, // 완료
};
