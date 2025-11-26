// lib/constants/production.ts

/**
 * 제작 상태 표시 맵
 */
export const PRODUCTION_STATUS_DISPLAY: Record<string, string> = {
  planning: '기획',
  in_progress: '진행 중',
  review: '검토',
  completed: '완료',
  cancelled: '취소'
};

/**
 * 제작 상태별 색상
 */
export const PRODUCTION_STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  planning: {
    bg: 'bg-yellow-50',
    text: 'text-yellow-700',
    border: 'border-yellow-200'
  },
  in_progress: {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200'
  },
  review: {
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-200'
  },
  completed: {
    bg: 'bg-green-50',
    text: 'text-green-700',
    border: 'border-green-200'
  },
  cancelled: {
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200'
  }
};

/**
 * 미디어 타입 표시 맵
 */
export const MEDIA_TYPE_DISPLAY: Record<string, string> = {
  AD: '음성해설',
  CC: '화면해설 자막',
  SL: '수어영상'
};

/**
 * 제작 단계 간단한 이름
 */
export const STAGE_SIMPLE_NAMES: Record<string, string> = {
  planning: '기획',
  script: '대본',
  recording: '녹음',
  editing: '편집',
  review: '검토',
  completed: '완료'
};

/**
 * 제작 단계별 색상
 */
export const STAGE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  planning: {
    bg: 'bg-yellow-50',
    text: 'text-yellow-700',
    border: 'border-yellow-200'
  },
  script: {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200'
  },
  recording: {
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-200'
  },
  editing: {
    bg: 'bg-orange-50',
    text: 'text-orange-700',
    border: 'border-orange-200'
  },
  review: {
    bg: 'bg-pink-50',
    text: 'text-pink-700',
    border: 'border-pink-200'
  },
  completed: {
    bg: 'bg-green-50',
    text: 'text-green-700',
    border: 'border-green-200'
  }
};

/**
 * 제작 단계별 가중치
 */
export const STAGE_WEIGHTS: Record<string, number> = {
  planning: 10,
  script: 20,
  recording: 30,
  editing: 25,
  review: 10,
  completed: 5
};

/**
 * 속도 타입 정보
 */
export const SPEED_TYPE_INFO: Record<string, { label: string; color: string }> = {
  normal: { label: '보통', color: 'blue' },
  fast: { label: '빠름', color: 'orange' },
  urgent: { label: '긴급', color: 'red' }
};

/**
 * 진행률 단계별 임계값
 */
export const PROGRESS_STAGE_THRESHOLDS: Record<string, { min: number; max: number }> = {
  planning: { min: 0, max: 20 },
  script: { min: 20, max: 40 },
  recording: { min: 40, max: 70 },
  editing: { min: 70, max: 90 },
  review: { min: 90, max: 99 },
  completed: { min: 100, max: 100 }
};
