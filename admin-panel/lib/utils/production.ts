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
 * 단계별 진행률 계산 (tasks 배열 기반)
 */
export function calculateStageProgress(tasks: any[]): number {
  if (!tasks || tasks.length === 0) return 0;

  // calculateTaskProgress가 외부에서 import되어 사용되므로
  // 여기서는 tasks의 진행률을 단순 평균으로 계산
  // 실제 calculateTaskProgress는 TaskCard에서 import됨
  const totalProgress = tasks.reduce((sum, task) => {
    // task에 progress 필드가 있다고 가정
    const taskProgress = task.progress || 0;
    return sum + taskProgress;
  }, 0);

  return Math.round(totalProgress / tasks.length);
}

/**
 * 전체 진행률 계산
 */
export function calculateTotalProgress(stages: Array<{ stageProgress: number }>, currentStage?: number): number {
  if (!stages || stages.length === 0) return 0;

  const total = stages.reduce((sum, s) => sum + (s.stageProgress || 0), 0);
  return Math.round(total / stages.length);
}

/**
 * 진행률에 따른 목표 단계 결정 (스테이지 번호 반환)
 * StageNumber는 1-4만 가능: 1=planning, 2=script, 3=recording, 4=editing
 */
export function getTargetStageByProgress(progress: number): 1 | 2 | 3 | 4 {
  if (progress >= 70) return 4;  // editing
  if (progress >= 40) return 3;  // recording
  if (progress >= 20) return 2;  // script
  return 1; // planning
}
