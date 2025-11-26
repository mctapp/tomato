// components/production/ProductionDetailModal.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { toast } from 'sonner';
import {
  AlertCircle,
  Loader2,
  ChevronRight,
  ChevronDown,
  Gauge,
  UserCheck,
  ListChecks,
  CheckCircle2
} from 'lucide-react';
import { fetchApi } from '@/lib/api';
import { format, addDays } from 'date-fns';
import { ko } from 'date-fns/locale';
import TaskCard, { calculateTaskProgress } from './TaskCard';

// 타입 및 상수 임포트
import {
  WorkSpeedType,
  StageNumber,
  ProjectDetail,
  TaskDetail,
  StageProgress,
  TaskUpdatePayload
} from '@/types/production';
import {
  SPEED_TYPE_INFO,
  STAGE_WEIGHTS,
  STAGE_SIMPLE_NAMES,
  STAGE_COLORS,
  PROGRESS_STAGE_THRESHOLDS
} from '@/lib/constants/production';
import {
  calculateStageProgress,
  calculateTotalProgress,
  getTargetStageByProgress
} from '@/lib/utils/production';

interface ProductionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: number;
  onRefresh?: () => void;
  onUpdate?: (projectId: number, updates: {
    progressPercentage?: number;
    currentStage?: StageNumber;
    workSpeedType?: WorkSpeedType;
    daysRemaining?: number;
    isOverdue?: boolean;
    estimatedCompletionDate?: string;
  }) => void;
}

export default function ProductionDetailModal({
  isOpen,
  onClose,
  projectId,
  onRefresh,
  onUpdate
}: ProductionDetailModalProps) {
  const queryClient = useQueryClient();
  const [selectedStage, setSelectedStage] = useState<StageNumber>(1);
  const [changingSpeed, setChangingSpeed] = useState(false);
  const [showAllStages, setShowAllStages] = useState(false);
  const [hasAutoMoved, setHasAutoMoved] = useState(false);
  const [lastUpdatedProgress, setLastUpdatedProgress] = useState<number | null>(null);

  // 프로젝트 상세 정보 조회
  const { data: project, isLoading: projectLoading, refetch: refetchProject } = useQuery({
    queryKey: ['production-project-detail', projectId],
    queryFn: async () => {
      const response = await fetchApi<ProjectDetail>(`/admin/api/production/kanban/projects/${projectId}/details`);
      return response;
    },
    enabled: isOpen
  });

  // 태스크 목록 조회
  const { data: tasks = [], isLoading: tasksLoading, refetch: refetchTasks } = useQuery({
    queryKey: ['production-tasks', projectId],
    queryFn: async () => {
      const response = await fetchApi<TaskDetail[]>(`/admin/api/production/kanban/projects/${projectId}/tasks`);
      return response || [];
    },
    enabled: isOpen
  });

  // 제작 속도 변경
  const changeSpeedMutation = useMutation({
    mutationFn: async (newSpeed: WorkSpeedType) => {
      const response = await fetchApi<any>(`/admin/api/production/kanban/projects/${projectId}/speed`, {
        method: 'PATCH',
        body: JSON.stringify({ workSpeedType: newSpeed })
      });
      return response;
    },
    onSuccess: (data) => {
      toast.success('제작 속도가 변경되었습니다.');
      refetchProject();
      refetchTasks();
      
      // 칸반보드에 즉시 반영
      if (onUpdate && data) {
        onUpdate(projectId, {
          workSpeedType: data.new_speed,
          estimatedCompletionDate: data.estimated_completion_date
        });
      }
    },
    onError: () => {
      toast.error('제작 속도 변경에 실패했습니다.');
    },
    onSettled: () => {
      setChangingSpeed(false);
    }
  });

  // 태스크 완료 상태 업데이트 - 단순화된 버전
  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, field, value }: TaskUpdatePayload) => {
      const response = await fetchApi<any>(`/admin/api/production/kanban/tasks/${taskId}/completion`, {
        method: 'PATCH',
        body: JSON.stringify({ [field]: value })
      });
      return response;
    },
    onSuccess: async (data) => {
      // 서버 데이터로 동기화
      await refetchTasks();
      await refetchProject();
      
      // 서버에서 받은 실제 진행률로 업데이트 (중복 방지)
      if (onUpdate && data && data.project_progress !== undefined) {
        const newProgress = Math.round(data.project_progress);
        if (newProgress !== lastUpdatedProgress) {
          setLastUpdatedProgress(newProgress);
          onUpdate(projectId, {
            progressPercentage: newProgress,
            currentStage: data.current_stage as StageNumber
          });
        }
      }
    },
    onError: () => {
      toast.error('작업 상태 업데이트에 실패했습니다.');
    }
  });

  // 단계별 데이터 그룹화
  const stageData: StageProgress[] = React.useMemo(() => {
    const grouped: Record<StageNumber, TaskDetail[]> = {
      1: [],
      2: [],
      3: [],
      4: []
    };

    tasks.forEach(task => {
      if (grouped[task.stageNumber]) {
        grouped[task.stageNumber].push(task);
      }
    });

    return Object.entries(grouped).map(([stageNum, stageTasks]) => {
      const stageNumber = parseInt(stageNum) as StageNumber;
      const stageProgress = calculateStageProgress(stageTasks);
      
      return {
        stageNumber,
        stageName: STAGE_SIMPLE_NAMES[stageNumber],
        tasks: stageTasks.sort((a, b) => a.taskOrder - b.taskOrder),
        completedCount: stageTasks.filter(t => calculateTaskProgress(t) === 100).length,
        totalCount: stageTasks.length,
        stageProgress
      };
    });
  }, [tasks]);

  // 전체 진행률 계산
  const totalProgress = React.useMemo(() => {
    if (!project) return 0;
    return calculateTotalProgress(stageData);
  }, [stageData, project]);

  // 현재 단계 태스크
  const currentStageTasks = React.useMemo(() => {
    if (!project) return [];
    return stageData.find(s => s.stageNumber === project.currentStage)?.tasks || [];
  }, [project, stageData]);

  // 특정 단계로 이동
  const moveToStage = async (targetStage: StageNumber) => {
    try {
      const response = await fetchApi<any>(`/admin/api/production/kanban/move-card`, {
        method: 'POST',
        body: JSON.stringify({
          projectId: projectId,
          targetStage: targetStage
        })
      });
      
      toast.success(`${STAGE_SIMPLE_NAMES[targetStage]} 단계로 자동 이동했습니다.`);
      setHasAutoMoved(true);
      refetchProject();
      setSelectedStage(targetStage);
      
      // 칸반보드에 즉시 반영
      if (onUpdate && response) {
        onUpdate(projectId, {
          currentStage: targetStage,
          progressPercentage: Math.round(response.progress_percentage)
        });
      }
    } catch (error) {
      console.error('Stage transition error:', error);
    }
  };

  // 진행률 변경 시 자동으로 단계 이동 체크
  useEffect(() => {
    if (!project || hasAutoMoved || totalProgress === 0) return;

    const targetStage = getTargetStageByProgress(totalProgress);
    
    if (targetStage > project.currentStage) {
      moveToStage(targetStage);
    }
  }, [totalProgress, project, hasAutoMoved]);

  // 예상 완료일 재계산
  const recalculateCompletionDate = React.useCallback(() => {
    if (!project || !tasks.length) return null;

    const remainingHours = tasks
      .filter(task => calculateTaskProgress(task) < 100)
      .reduce((sum, task) => {
        let hours = task.plannedHours || 0;
        if (task.reviewRequired && !task.isReviewCompleted) hours += 2;
        if (task.monitoringRequired && !task.isMonitoringCompleted) hours += 1;
        return sum + hours;
      }, 0);

    const remainingDays = Math.ceil(remainingHours / 8);
    return addDays(new Date(), remainingDays);
  }, [project, tasks]);

  // 현재 단계로 선택된 탭 설정
  useEffect(() => {
    if (project) {
      setSelectedStage(project.currentStage);
    }
  }, [project]);

  // 모달이 닫힐 때 상태 초기화
  useEffect(() => {
    if (!isOpen) {
      setLastUpdatedProgress(null);
      setHasAutoMoved(false);
    }
  }, [isOpen]);

  const isLoading = projectLoading || tasksLoading;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-[900px] h-[90vh] p-0 flex flex-col overflow-hidden" 
        onPointerDown={(e) => e.stopPropagation()}
      >
        {/* 헤더 - 고정 */}
        <DialogHeader className="px-6 py-4 border-b bg-gradient-to-r from-[#fff5f3] to-white flex-shrink-0">
          <div className="flex items-start gap-4">
            {/* 영화 포스터 */}
            {project?.moviePoster && (
              <div className="w-16 h-24 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
                <img 
                  src={project.moviePoster} 
                  alt={project.movieTitle}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            
            <div className="flex-1">
              <DialogTitle className="text-2xl font-bold text-[#333333] mb-2">
                {project?.movieTitle || '로딩 중...'}
              </DialogTitle>
              
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <Badge className="bg-[#ff6246] text-white">
                    {project?.mediaTypeName}
                  </Badge>
                  
                  {/* 프로듀서 정보 */}
                  {project?.staffInfo.producer && (
                    <div className="flex items-center gap-2 text-sm">
                      <UserCheck className="h-4 w-4 text-gray-600" />
                      <span className="text-gray-600">프로듀서:</span>
                      <span className="font-medium">{project.staffInfo.producer.name}</span>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-3">
                  {/* 제작 속도 선택 */}
                  {project && project.currentStage === 1 ? (
                    <Select
                      value={project.workSpeedType}
                      onValueChange={(value: WorkSpeedType) => {
                        setChangingSpeed(true);
                        changeSpeedMutation.mutate(value);
                      }}
                      disabled={changingSpeed}
                    >
                      <SelectTrigger className="w-32 h-7 text-sm">
                        <Gauge className="h-3 w-3 mr-1" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(SPEED_TYPE_INFO).map(([type, info]) => (
                          <SelectItem key={type} value={type}>
                            <div className="flex items-center gap-2">
                              <Badge className={`text-xs ${info.color}`}>
                                {type}
                              </Badge>
                              <span>{info.label}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge className={SPEED_TYPE_INFO[project?.workSpeedType || WorkSpeedType.B].color}>
                      <Gauge className="h-3 w-3 mr-1" />
                      {SPEED_TYPE_INFO[project?.workSpeedType || WorkSpeedType.B].label}
                    </Badge>
                  )}
                  
                  <Badge variant="outline" className="text-sm">
                    {STAGE_SIMPLE_NAMES[project?.currentStage || 1]}
                  </Badge>
                  
                  {/* 진행률 */}
                  <div className="ml-auto text-right">
                    <span className="text-2xl font-bold text-[#ff6246]">{totalProgress}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* 진행률 바 */}
          <div className="mt-4">
            <Progress 
              value={totalProgress} 
              className="h-3"
              indicatorClassName="bg-gradient-to-r from-[#ff6246] to-[#4da34c]"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>시작: {project && format(new Date(project.startDate), 'yyyy.MM.dd', { locale: ko })}</span>
              <span>예상 완료: {recalculateCompletionDate() && format(recalculateCompletionDate()!, 'yyyy.MM.dd', { locale: ko })}</span>
            </div>
          </div>
          
          <DialogDescription className="sr-only">
            프로젝트 상세 정보 및 작업 진행 상황
          </DialogDescription>
        </DialogHeader>

        {/* 본문 - 스크롤 가능 영역 */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center p-20">
              <Loader2 className="h-8 w-8 animate-spin text-[#ff6246]" />
            </div>
          ) : (
            <div className="p-6">
              {/* 현재 단계 태스크 */}
              <div className="mb-4">
                <h3 className="font-semibold text-lg flex items-center gap-2 mb-3 text-[#333333]">
                  <ListChecks className="h-5 w-5 text-[#ff6246]" />
                  현재 단계 태스크
                </h3>
                
                {project && (
                  <Card className={`${STAGE_COLORS[project.currentStage].bg} ${STAGE_COLORS[project.currentStage].border}`}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center justify-between">
                        <span>{STAGE_SIMPLE_NAMES[project.currentStage]}</span>
                        <Badge 
                          className={`text-xs ${
                            currentStageTasks.filter(t => calculateTaskProgress(t) === 100).length === currentStageTasks.length 
                              ? 'bg-[#4da34c] text-white' 
                              : 'bg-gray-200 text-gray-700'
                          }`}
                        >
                          {currentStageTasks.filter(t => calculateTaskProgress(t) === 100).length}/{currentStageTasks.length}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {currentStageTasks.length === 0 ? (
                        <Alert>
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            이 단계에 작업이 없습니다.
                          </AlertDescription>
                        </Alert>
                      ) : (
                        currentStageTasks.map(task => (
                          <TaskCard
                            key={task.id}
                            task={task}
                            onUpdate={(field, value) => 
                              updateTaskMutation.mutate({
                                taskId: task.id,
                                field,
                                value
                              })
                            }
                            disabled={updateTaskMutation.isPending}
                            showCompletionTime={true}
                          />
                        ))
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* 전체 작업 단계 태스크 확인 */}
              <Collapsible open={showAllStages} onOpenChange={setShowAllStages}>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" className="w-full">
                    <span className="flex items-center gap-2">
                      {showAllStages ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      전체 작업 단계 태스크 확인
                    </span>
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-4">
                  <div className="space-y-4">
                    {stageData.map(stage => (
                      <Card key={stage.stageNumber} className="overflow-hidden">
                        <CardHeader className={`py-3 ${STAGE_COLORS[stage.stageNumber].bg} ${STAGE_COLORS[stage.stageNumber].border}`}>
                          <div className="flex items-center justify-between">
                            <CardTitle className={`text-sm ${STAGE_COLORS[stage.stageNumber].text}`}>
                              {stage.stageName}
                            </CardTitle>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="text-xs">
                                가중치 {STAGE_WEIGHTS[stage.stageNumber]}%
                              </Badge>
                              <Badge 
                                className={`text-xs ${
                                  stage.stageProgress === 100 
                                    ? 'bg-[#4da34c] text-white' 
                                    : 'bg-gray-200 text-gray-700'
                                }`}
                              >
                                {Math.round(stage.stageProgress)}%
                              </Badge>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="p-3">
                          {stage.tasks.length === 0 ? (
                            <div className="text-sm text-gray-500 text-center py-2">
                              작업 없음
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {stage.tasks.map(task => {
                                const progress = calculateTaskProgress(task);
                                const isCompleted = progress === 100;
                                
                                return (
                                  <div 
                                    key={task.id} 
                                    className={`text-sm p-2 rounded-md ${
                                      isCompleted ? 'bg-green-50' : 'bg-white'
                                    } border ${
                                      isCompleted ? 'border-green-200' : 'border-gray-200'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between mb-1">
                                      <span className={`font-medium ${
                                        isCompleted ? 'text-green-700' : 'text-gray-700'
                                      }`}>
                                        {task.taskName}
                                      </span>
                                      {isCompleted ? (
                                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                                      ) : (
                                        <span className="text-xs text-gray-500">
                                          {Math.round(progress)}%
                                        </span>
                                      )}
                                    </div>
                                    
                                    {/* 완료 시간 표시 */}
                                    {task.mainCompletedAt && (
                                      <div className="text-xs text-gray-500 mt-1">
                                        완료: {format(new Date(task.mainCompletedAt), 'MM.dd HH:mm', { locale: ko })}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
