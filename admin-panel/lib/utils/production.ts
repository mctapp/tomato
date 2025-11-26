// lib/utils/production.ts

/**
 * 제작 진행률 계산
 */
export function calculateProgress(completed: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((completed / total) * 100);
}

/**
 * 제작 상태 유효성 검사
 */
export function isValidProductionStatus(status: string): boolean {
  return ['planning', 'in_progress', 'review', 'completed', 'cancelled'].includes(status);
}

/**
 * 우선순위 유효성 검사
 */
export function isValidPriority(priority: number): boolean {
  return Number.isInteger(priority) && priority >= 1 && priority <= 5;
}

/**
 * 단계별 진행률 계산
 */
export function calculateStageProgress(stage: string, progress: number): number {
  const stageRanges: Record<string, { min: number; max: number }> = {
    planning: { min: 0, max: 20 },
    script: { min: 20, max: 40 },
    recording: { min: 40, max: 70 },
    editing: { min: 70, max: 90 },
    review: { min: 90, max: 99 },
    completed: { min: 100, max: 100 }
  };

  const range = stageRanges[stage];
  if (!range) return progress;

  return Math.min(Math.max(progress, range.min), range.max);
}

/**
 * 전체 진행률 계산
 */
export function calculateTotalProgress(stages: Array<{ stage: string; progress: number }>): number {
  if (!stages || stages.length === 0) return 0;

  const total = stages.reduce((sum, s) => sum + s.progress, 0);
  return Math.round(total / stages.length);
}

/**
 * 진행률에 따른 목표 단계 결정
 */
export function getTargetStageByProgress(progress: number): string {
  if (progress >= 100) return 'completed';
  if (progress >= 90) return 'review';
  if (progress >= 70) return 'editing';
  if (progress >= 40) return 'recording';
  if (progress >= 20) return 'script';
  return 'planning';
}
