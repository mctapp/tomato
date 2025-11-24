// components/production/TaskCard.tsx

'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { CheckCircle2, Circle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

interface TaskDetail {
  id: number;
  stageNumber: number;
  taskName: string;
  taskOrder: number;
  taskStatus: string;
  plannedHours: number;
  actualHours?: number | null;
  reviewRequired: boolean;
  monitoringRequired: boolean;
  isMainCompleted: boolean;
  isReviewCompleted: boolean;
  isMonitoringCompleted: boolean;
  assignedPerson?: string | null;
  reviewerPerson?: string | null;
  monitorPerson?: string | null;
  actualStartDate?: string | null;
  actualEndDate?: string | null;
  mainCompletedAt?: string | null;
  reviewCompletedAt?: string | null;
  monitoringCompletedAt?: string | null;
}

interface TaskCardProps {
  task: TaskDetail;
  onUpdate: (field: 'isMainCompleted' | 'isReviewCompleted' | 'isMonitoringCompleted', value: boolean) => void;
  disabled?: boolean;
  showCompletionTime?: boolean;
}

export const calculateTaskProgress = (task: TaskDetail): number => {
  let completed = 0;
  let total = 1;

  if (task.isMainCompleted) completed++;
  
  if (task.reviewRequired) {
    total++;
    if (task.isReviewCompleted) completed++;
  }
  
  if (task.monitoringRequired) {
    total++;
    if (task.isMonitoringCompleted) completed++;
  }

  return (completed / total) * 100;
};

export default function TaskCard({ task, onUpdate, disabled, showCompletionTime = true }: TaskCardProps) {
  const progress = calculateTaskProgress(task);
  const isCompleted = progress === 100;

  const formatCompletionDate = (dateString?: string | null) => {
    if (!dateString) return null;
    try {
      return format(new Date(dateString), 'MM.dd HH:mm', { locale: ko });
    } catch {
      return null;
    }
  };

  return (
    <Card className={`${isCompleted ? 'bg-green-50 border-green-200' : ''} hover:shadow-sm transition-shadow`}>
      <CardContent className="py-3 px-4">
        <div className="space-y-2">
          {/* 메인 작업 */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => onUpdate('isMainCompleted', !task.isMainCompleted)}
              disabled={disabled}
              className="flex items-center gap-2 flex-1 text-left hover:bg-gray-50 rounded px-2 py-1 -mx-2 transition-colors"
            >
              {task.isMainCompleted ? (
                <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
              ) : (
                <Circle className="h-5 w-5 text-gray-400 flex-shrink-0" />
              )}
              <span className={`text-sm flex-1 ${task.isMainCompleted ? 'text-gray-600' : ''}`}>
                {task.taskName}
              </span>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Clock className="h-3 w-3" />
                <span>예상: {task.plannedHours}시간</span>
              </div>
            </button>
            {task.assignedPerson && (
              <span className="text-xs text-gray-500">{task.assignedPerson}</span>
            )}
            {showCompletionTime && task.mainCompletedAt && (
              <span className="text-xs text-gray-400">{formatCompletionDate(task.mainCompletedAt)}</span>
            )}
          </div>

          {/* 감수 */}
          {task.reviewRequired && (
            <div className="flex items-center gap-3 pl-7">
              <button
                onClick={() => onUpdate('isReviewCompleted', !task.isReviewCompleted)}
                disabled={disabled || !task.isMainCompleted}
                className={`flex items-center gap-2 flex-1 text-left hover:bg-gray-50 rounded px-2 py-1 -mx-2 transition-colors ${
                  !task.isMainCompleted ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {task.isReviewCompleted ? (
                  <CheckCircle2 className="h-4 w-4 text-orange-600 flex-shrink-0" />
                ) : (
                  <Circle className="h-4 w-4 text-gray-400 flex-shrink-0" />
                )}
                <span className={`text-sm flex-1 ${task.isReviewCompleted ? 'text-gray-600' : ''}`}>
                  감수 완료
                </span>
              </button>
              {task.reviewerPerson && (
                <span className="text-xs text-gray-500">{task.reviewerPerson}</span>
              )}
              {showCompletionTime && task.reviewCompletedAt && (
                <span className="text-xs text-gray-400">{formatCompletionDate(task.reviewCompletedAt)}</span>
              )}
            </div>
          )}

          {/* 모니터링 */}
          {task.monitoringRequired && (
            <div className="flex items-center gap-3 pl-7">
              <button
                onClick={() => onUpdate('isMonitoringCompleted', !task.isMonitoringCompleted)}
                disabled={disabled || !task.isMainCompleted}
                className={`flex items-center gap-2 flex-1 text-left hover:bg-gray-50 rounded px-2 py-1 -mx-2 transition-colors ${
                  !task.isMainCompleted ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {task.isMonitoringCompleted ? (
                  <CheckCircle2 className="h-4 w-4 text-red-600 flex-shrink-0" />
                ) : (
                  <Circle className="h-4 w-4 text-gray-400 flex-shrink-0" />
                )}
                <span className={`text-sm flex-1 ${task.isMonitoringCompleted ? 'text-gray-600' : ''}`}>
                  모니터링 완료
                </span>
              </button>
              {task.monitorPerson && (
                <span className="text-xs text-gray-500">{task.monitorPerson}</span>
              )}
              {showCompletionTime && task.monitoringCompletedAt && (
                <span className="text-xs text-gray-400">{formatCompletionDate(task.monitoringCompletedAt)}</span>
              )}
            </div>
          )}
        </div>

        {/* 진행률 바 */}
        <div className="mt-2">
          <Progress value={progress} className="h-1.5" indicatorClassName="bg-[#4da34c]" />
        </div>
      </CardContent>
    </Card>
  );
}
