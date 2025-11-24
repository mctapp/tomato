// hooks/useProductionKanbanDnD.ts

import { useState } from 'react';
import {
  DragEndEvent,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  StageNumber,
  ProductionCardData,
  KanbanResponse,
} from '@/types/production';
import { STAGE_PROGRESS_RANGES, DND_ACTIVATION_DISTANCE } from '@/lib/constants/production-kanban';

interface UseProductionKanbanDnDProps {
  kanbanData: KanbanResponse;
  moveCardMutation: any;
  completeProjectMutation: any;
}

export function useProductionKanbanDnD({
  kanbanData,
  moveCardMutation,
  completeProjectMutation,
}: UseProductionKanbanDnDProps) {
  const [activeCard, setActiveCard] = useState<ProductionCardData | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showBackwardConfirm, setShowBackwardConfirm] = useState(false);
  const [pendingMove, setPendingMove] = useState<{
    projectId: number;
    targetStage: StageNumber;
    progressPercentage?: number;
  } | null>(null);

  // DnD 센서 설정
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: DND_ACTIVATION_DISTANCE,
      },
    })
  );

  // 드래그 시작 핸들러
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    if (!active?.id) return;
    
    const cardIdString = String(active.id);
    if (!cardIdString.startsWith('card-')) return;
    
    const cardId = parseInt(cardIdString.replace('card-', ''));
    setIsDragging(true);
    
    // 현재 드래그 중인 카드 찾기
    for (const stage of kanbanData.stages) {
      const card = stage.cards.find(c => c.id === cardId);
      if (card) {
        setActiveCard(card);
        break;
      }
    }
  };

  // 드래그 종료 핸들러
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCard(null);
    setIsDragging(false);
    
    if (!over?.id || !active?.id) return;
    
    const cardIdString = String(active.id);
    if (!cardIdString.startsWith('card-')) return;
    
    const cardId = parseInt(cardIdString.replace('card-', ''));
    
    // 완료 영역으로 드롭한 경우
    if (over.id === 'completion-zone') {
      completeProjectMutation.mutate(cardId);
      return;
    }
    
    // 드롭 타겟 분석
    let targetStage: StageNumber | null = null;
    const overIdString = String(over.id);
    
    if (overIdString.startsWith('stage-')) {
      const stageNum = parseInt(overIdString.replace('stage-', ''));
      if ([1, 2, 3, 4].includes(stageNum)) {
        targetStage = stageNum as StageNumber;
      }
    } else if (overIdString.startsWith('card-')) {
      // 다른 카드 위에 드롭한 경우
      const targetCardId = parseInt(overIdString.replace('card-', ''));
      for (const stage of kanbanData.stages) {
        if (stage.cards.find(c => c.id === targetCardId)) {
          targetStage = stage.stageNumber as StageNumber;
          break;
        }
      }
    }
    
    if (!targetStage) return;
    
    // 현재 카드의 단계 찾기
    let currentStage: StageNumber | null = null;
    for (const stage of kanbanData.stages) {
      if (stage.cards.some(c => c.id === cardId)) {
        currentStage = stage.stageNumber as StageNumber;
        break;
      }
    }
    
    // 같은 단계로 이동하는 경우 무시
    if (!currentStage || currentStage === targetStage) return;
    
    // 각 단계별 시작 진행률 설정
    const progressPercentage = STAGE_PROGRESS_RANGES[targetStage].min;
    
    // 역방향 이동 체크 (더 낮은 단계로 이동)
    if (targetStage < currentStage) {
      setPendingMove({ projectId: cardId, targetStage, progressPercentage });
      setShowBackwardConfirm(true);
      return;
    }
    
    // 정방향 이동
    moveCardMutation.mutate({
      projectId: cardId,
      targetStage,
      progressPercentage
    });
  };

  // 역방향 이동 확인
  const confirmBackwardMove = () => {
    if (pendingMove) {
      moveCardMutation.mutate(pendingMove);
      setPendingMove(null);
    }
    setShowBackwardConfirm(false);
  };

  // 역방향 이동 취소
  const cancelBackwardMove = () => {
    setPendingMove(null);
    setShowBackwardConfirm(false);
  };

  return {
    // 상태
    activeCard,
    isDragging,
    showBackwardConfirm,
    pendingMove,
    
    // DnD 설정
    sensors,
    
    // 핸들러
    handleDragStart,
    handleDragEnd,
    confirmBackwardMove,
    cancelBackwardMove,
  };
}
