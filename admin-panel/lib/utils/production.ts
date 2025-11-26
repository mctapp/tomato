// lib/utils/production.ts
import { StageNumber, StageProgress, TaskDetail, TaskStatus } from '@/types/production';
import { STAGE_WEIGHTS, PROGRESS_STAGE_THRESHOLDS } from '@/lib/constants/production';

/**
 * Calculate progress for a single stage
 */
export function calculateStageProgress(tasks: TaskDetail[]): number {
  if (!tasks || tasks.length === 0) return 0;

  const completedTasks = tasks.filter(
    task => task.taskStatus === TaskStatus.COMPLETED
  ).length;

  return Math.round((completedTasks / tasks.length) * 100);
}

/**
 * Calculate total project progress based on stage weights
 */
export function calculateTotalProgress(stages: StageProgress[]): number {
  if (!stages || stages.length === 0) return 0;

  let totalProgress = 0;

  stages.forEach(stage => {
    const stageWeight = STAGE_WEIGHTS[stage.stageNumber] || 0;
    const stageContribution = (stage.stageProgress / 100) * stageWeight;
    totalProgress += stageContribution;
  });

  return Math.round(totalProgress);
}

/**
 * Get target stage based on progress percentage
 */
export function getTargetStageByProgress(progress: number): StageNumber {
  for (const [stage, threshold] of Object.entries(PROGRESS_STAGE_THRESHOLDS)) {
    if (progress >= threshold.min && progress < threshold.max) {
      return parseInt(stage) as StageNumber;
    }
  }
  return progress >= 90 ? 4 : 1;
}

/**
 * Calculate days remaining until deadline
 */
export function calculateDaysRemaining(estimatedCompletionDate: string | null | undefined): number | null {
  if (!estimatedCompletionDate) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const deadline = new Date(estimatedCompletionDate);
  deadline.setHours(0, 0, 0, 0);

  const diffTime = deadline.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}

/**
 * Check if project is overdue
 */
export function isProjectOverdue(
  estimatedCompletionDate: string | null | undefined,
  progressPercentage: number
): boolean {
  if (!estimatedCompletionDate || progressPercentage >= 100) return false;

  const daysRemaining = calculateDaysRemaining(estimatedCompletionDate);
  return daysRemaining !== null && daysRemaining < 0;
}

/**
 * Get urgency level based on days remaining
 */
export function getUrgencyLevel(
  daysRemaining: number | null
): 'low' | 'medium' | 'high' | 'critical' {
  if (daysRemaining === null) return 'low';
  if (daysRemaining < 0) return 'critical';
  if (daysRemaining <= 3) return 'high';
  if (daysRemaining <= 7) return 'medium';
  return 'low';
}

/**
 * Format stage name with number
 */
export function formatStageName(stageNumber: StageNumber): string {
  const stageNames: Record<StageNumber, string> = {
    1: '1단계: 기획/분석',
    2: '2단계: 제작/개발',
    3: '3단계: 검수/테스트',
    4: '4단계: 완료/배포',
  };
  return stageNames[stageNumber] || `단계 ${stageNumber}`;
}
