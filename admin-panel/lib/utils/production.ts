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
