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
