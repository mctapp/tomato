// hooks/useProductionKanban.ts

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { fetchApi } from '@/lib/api';
import {
  StageNumber,
  ProductionCardData,
  KanbanResponse,
  FiltersResponse,
  LayoutMode,
  PinToggleRequest,
  WorkSpeedType
} from '@/types/production';
import { STAGE_SIMPLE_NAMES } from '@/lib/constants/production';
import {
  REFETCH_INTERVAL,
  KANBAN_STALE_TIME,
  FILTERS_STALE_TIME,
  KANBAN_LAYOUT_MODE_KEY
} from '@/lib/constants/production-kanban';

// 기본 필터 옵션 생성
const createDefaultFilterOptions = (): FiltersResponse => ({
  mediaTypes: [],
  speedTypes: [
    { value: 'A', label: '빠름' },
    { value: 'B', label: '보통' },
    { value: 'C', label: '여유' }
  ],
  projectStatuses: []
});

// 빈 칸반 데이터 생성
const createEmptyKanbanData = (): KanbanResponse => ({
  stages: [
    { stageNumber: 1, stageName: STAGE_SIMPLE_NAMES[1], cards: [] },
    { stageNumber: 2, stageName: STAGE_SIMPLE_NAMES[2], cards: [] },
    { stageNumber: 3, stageName: STAGE_SIMPLE_NAMES[3], cards: [] },
    { stageNumber: 4, stageName: STAGE_SIMPLE_NAMES[4], cards: [] }
  ],
  totalProjects: 0,
});

export function useProductionKanban() {
  const queryClient = useQueryClient();
  
  // 상태 관리
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [mediaTypeFilter, setMediaTypeFilter] = useState<string>('all');
  const [speedTypeFilter, setSpeedTypeFilter] = useState<string>('all');
  
  // 레이아웃 모드 상태 (로컬스토리지에서 불러오기)
  const [layoutMode, setLayoutMode] = useState<LayoutMode>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(KANBAN_LAYOUT_MODE_KEY);
      return (saved as LayoutMode) || LayoutMode.COMPACT;
    }
    return LayoutMode.COMPACT;
  });

  // 칸반 데이터 조회
  const {
    data: kanbanData = createEmptyKanbanData(),
    isLoading: kanbanLoading,
    error: kanbanError,
    refetch: refetchKanban
  } = useQuery({
    queryKey: ['production-kanban', mediaTypeFilter, speedTypeFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (mediaTypeFilter !== 'all') params.append('mediaTypeFilter', mediaTypeFilter);
      if (speedTypeFilter !== 'all') params.append('speedTypeFilter', speedTypeFilter);
      
      const response = await fetchApi<KanbanResponse>(`/admin/api/production/kanban?${params.toString()}`);
      return response;
    },
    refetchInterval: REFETCH_INTERVAL,
    staleTime: KANBAN_STALE_TIME,
  });

  // 필터 옵션 조회
  const { data: filterOptions = createDefaultFilterOptions() } = useQuery({
    queryKey: ['production-filters'],
    queryFn: async () => {
      const response = await fetchApi<FiltersResponse>('/admin/api/production/kanban/filters');
      return response;
    },
    staleTime: FILTERS_STALE_TIME,
  });

  // 카드 이동 뮤테이션
  const moveCardMutation = useMutation({
    mutationFn: async ({
      projectId,
      targetStage,
      progressPercentage
    }: {
      projectId: number;
      targetStage: StageNumber;
      progressPercentage?: number;
    }) => {
      const payload: any = {
        projectId,
        targetStage
      };
      
      if (progressPercentage !== undefined) {
        payload.progressPercentage = progressPercentage;
      }
      
      const response = await fetchApi('/admin/api/production/kanban/move-card', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      
      return { projectId, targetStage, response };
    },
    onMutate: async ({ projectId, targetStage }) => {
      await queryClient.cancelQueries({ queryKey: ['production-kanban'] });
      
      const previousData = queryClient.getQueryData<KanbanResponse>(['production-kanban', mediaTypeFilter, speedTypeFilter]);
      
      if (previousData) {
        const newData = { ...previousData };
        let movedCard: ProductionCardData | null = null;
        
        for (const stage of newData.stages) {
          const cardIndex = stage.cards.findIndex(c => c.id === projectId);
          if (cardIndex !== -1) {
            movedCard = stage.cards.splice(cardIndex, 1)[0];
            break;
          }
        }
        
        if (movedCard) {
          const targetStageData = newData.stages.find(s => s.stageNumber === targetStage);
          if (targetStageData) {
            movedCard.currentStage = targetStage;
            targetStageData.cards.push(movedCard);
          }
        }
        
        queryClient.setQueryData(['production-kanban', mediaTypeFilter, speedTypeFilter], newData);
      }
      
      return { previousData };
    },
    onError: (err, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(
          ['production-kanban', mediaTypeFilter, speedTypeFilter],
          context.previousData
        );
      }
      toast.error('카드 이동에 실패했습니다.');
    },
    onSuccess: ({ targetStage }) => {
      toast.success(`카드가 ${STAGE_SIMPLE_NAMES[targetStage]}로 이동되었습니다.`);
      queryClient.invalidateQueries({
        queryKey: ['production-kanban'],
        refetchType: 'active'
      });
    }
  });

  // 프로젝트 완료 뮤테이션
  const completeProjectMutation = useMutation({
    mutationFn: async (projectId: number) => {
      await fetchApi('/admin/api/production/kanban/complete-project', {
        method: 'POST',
        body: JSON.stringify({ projectId })
      });
      return projectId;
    },
    onMutate: async (projectId) => {
      await queryClient.cancelQueries({ queryKey: ['production-kanban'] });
      
      const previousData = queryClient.getQueryData<KanbanResponse>(['production-kanban', mediaTypeFilter, speedTypeFilter]);
      
      if (previousData) {
        const newData = { ...previousData };
        
        for (const stage of newData.stages) {
          const cardIndex = stage.cards.findIndex(c => c.id === projectId);
          if (cardIndex !== -1) {
            stage.cards.splice(cardIndex, 1);
            newData.totalProjects = Math.max(0, newData.totalProjects - 1);
            break;
          }
        }
        
        queryClient.setQueryData(['production-kanban', mediaTypeFilter, speedTypeFilter], newData);
      }
      
      return { previousData };
    },
    onError: (err, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(
          ['production-kanban', mediaTypeFilter, speedTypeFilter],
          context.previousData
        );
      }
      toast.error('프로젝트 완료 처리에 실패했습니다.');
    },
    onSuccess: () => {
      toast.success('프로젝트가 완료되었습니다.');
      queryClient.invalidateQueries({ queryKey: ['production-kanban'] });
    }
  });

  // 프로젝트 업데이트 핸들러
  const handleProjectUpdate = useCallback((projectId: number, updates: {
    progressPercentage?: number;
    currentStage?: StageNumber;
    workSpeedType?: WorkSpeedType;
    daysRemaining?: number;
    isOverdue?: boolean;
    estimatedCompletionDate?: string;
  }) => {
    console.log('[useProductionKanban] Updating project:', projectId, 'with:', updates);
    
    queryClient.setQueryData(
      ['production-kanban', mediaTypeFilter, speedTypeFilter],
      (oldData: KanbanResponse | undefined) => {
        if (!oldData) return oldData;
        
        let foundCard: ProductionCardData | null = null;
        let currentStageNumber: StageNumber | null = null;
        
        for (const stage of oldData.stages) {
          const card = stage.cards.find(c => c.id === projectId);
          if (card) {
            foundCard = card;
            currentStageNumber = stage.stageNumber as StageNumber;
            break;
          }
        }
        
        if (!foundCard) {
          console.log('[useProductionKanban] Card not found');
          return oldData;
        }
        
        const updatedCard = { ...foundCard, ...updates };
        const isStageChanging = updates.currentStage && updates.currentStage !== currentStageNumber;
        
        const newStages = oldData.stages.map(stage => {
          const stageNumber = stage.stageNumber as StageNumber;
          
          if (isStageChanging && stageNumber === currentStageNumber) {
            return {
              ...stage,
              cards: stage.cards.filter(c => c.id !== projectId)
            };
          }
          
          if (isStageChanging && stageNumber === updates.currentStage) {
            return {
              ...stage,
              cards: [...stage.cards, updatedCard]
            };
          }
          
          if (!isStageChanging && stageNumber === currentStageNumber) {
            return {
              ...stage,
              cards: stage.cards.map(card =>
                card.id === projectId ? updatedCard : card
              )
            };
          }
          
          return stage;
        });
        
        console.log('[useProductionKanban] Update complete');
        
        return {
          ...oldData,
          stages: newStages
        };
      }
    );
  }, [mediaTypeFilter, speedTypeFilter, queryClient]);

  // Pin 토글
  const handleTogglePin = useCallback(async (projectId: number) => {
    try {
      let currentPinState = false;
      for (const stage of kanbanData.stages) {
        const card = stage.cards.find(c => c.id === projectId);
        if (card) {
          currentPinState = card.isPinned || false;
          break;
        }
      }

      await fetchApi('/admin/api/production/kanban/toggle-pin', {
        method: 'POST',
        body: JSON.stringify({
          projectId,
          isPinned: !currentPinState
        } as PinToggleRequest)
      });

      queryClient.setQueryData(
        ['production-kanban', mediaTypeFilter, speedTypeFilter],
        (oldData: KanbanResponse | undefined) => {
          if (!oldData) return oldData;
          
          const newStages = oldData.stages.map(stage => ({
            ...stage,
            cards: stage.cards.map(card =>
              card.id === projectId
                ? { ...card, isPinned: !currentPinState }
                : card
            )
          }));
          
          return {
            ...oldData,
            stages: newStages
          };
        }
      );

      toast.success(currentPinState ? '핀 해제됨' : '핀 고정됨');
    } catch (error) {
      toast.error('핀 상태 변경에 실패했습니다');
    }
  }, [kanbanData, queryClient, mediaTypeFilter, speedTypeFilter]);

  // 레이아웃 모드 변경
  const handleLayoutModeChange = useCallback((newMode: string) => {
    const mode = newMode as LayoutMode;
    setLayoutMode(mode);
    if (typeof window !== 'undefined') {
      localStorage.setItem(KANBAN_LAYOUT_MODE_KEY, mode);
    }
  }, []);

  // 상세보기 열기
  const handleOpenDetail = useCallback((projectId: number) => {
    setSelectedProjectId(projectId);
  }, []);

  return {
    // 상태
    kanbanData,
    kanbanLoading,
    kanbanError,
    filterOptions,
    selectedProjectId,
    mediaTypeFilter,
    speedTypeFilter,
    layoutMode,
    
    // 핸들러
    refetchKanban,
    setSelectedProjectId,
    setMediaTypeFilter,
    setSpeedTypeFilter,
    handleProjectUpdate,
    handleTogglePin,
    handleLayoutModeChange,
    handleOpenDetail,
    
    // 뮤테이션
    moveCardMutation,
    completeProjectMutation
  };
}
