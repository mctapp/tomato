// lib/constants/production.ts
import { StageNumber, WorkSpeedType } from '@/types/production';

export const STAGE_WEIGHTS: Record<StageNumber, number> = {
  1: 15, // 기획/분석
  2: 50, // 제작/개발
  3: 25, // 검수/테스트
  4: 10, // 완료/배포
};

export const STAGE_SIMPLE_NAMES: Record<StageNumber, string> = {
  1: '기획',
  2: '제작',
  3: '검수',
  4: '완료',
};

export const STAGE_COLORS: Record<StageNumber, string> = {
  1: 'bg-blue-100 text-blue-800 border-blue-300',
  2: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  3: 'bg-purple-100 text-purple-800 border-purple-300',
  4: 'bg-green-100 text-green-800 border-green-300',
};

export const PROGRESS_STAGE_THRESHOLDS: Record<StageNumber, { min: number; max: number }> = {
  1: { min: 0, max: 15 },
  2: { min: 15, max: 65 },
  3: { min: 65, max: 90 },
  4: { min: 90, max: 100 },
};

export const SPEED_TYPE_INFO: Record<WorkSpeedType, { name: string; description: string; color: string }> = {
  A: {
    name: '빠름',
    description: '긴급 작업, 빠른 완료 필요',
    color: 'bg-red-100 text-red-800 border-red-300',
  },
  B: {
    name: '보통',
    description: '일반적인 작업 속도',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  },
  C: {
    name: '여유',
    description: '여유로운 일정',
    color: 'bg-green-100 text-green-800 border-green-300',
  },
};

export const PROJECT_STATUS_COLORS: Record<string, string> = {
  active: 'bg-blue-100 text-blue-800 border-blue-300',
  completed: 'bg-green-100 text-green-800 border-green-300',
  paused: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  cancelled: 'bg-red-100 text-red-800 border-red-300',
};

export const TASK_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-800 border-gray-300',
  in_progress: 'bg-blue-100 text-blue-800 border-blue-300',
  completed: 'bg-green-100 text-green-800 border-green-300',
  blocked: 'bg-red-100 text-red-800 border-red-300',
};
