// components/production/ProductionKanbanView.tsx

'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  UniqueIdentifier,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from 'sonner';
import { fetchApi } from '@/lib/api';
import { ProductionColumn } from './ProductionColumn';
import { ProductionCard } from './ProductionCard';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, AlertTriangle } from 'lucide-react';

// ── 타입 정의 ──────────────────────────────────────────────────────────

interface StaffInfo {
  name: string;
  role: string;
  isPrimary?: boolean;
}

interface ProjectStaffInfo {
  mainWriter?: StaffInfo | null;
  producer?: StaffInfo | null;
  reviewers?: StaffInfo[] | null;
  monitors?: StaffInfo[] | null;
  voiceArtists?: StaffInfo[] | null;
  otherStaff?: StaffInfo[] | null;
}

interface ChecklistItem {
  id: number;
  item: string;
  required: boolean;
  checked: boolean;
}

interface KanbanCard {
  id: number;
  movieTitle: string;
  moviePoster?: string | null;
  mediaType: string;
  mediaTypeName?: string | null;
  assetName?: string | null;
  workSpeedType?: string | null;
  currentStage?: number | null;
  progressPercentage?: number | null;
  staffInfo?: ProjectStaffInfo | null;
  daysRemaining?: number | null;
  isOverdue?: boolean | null;
  memoCount?: number | null;
  startDate?: string | null;
  estimatedCompletionDate?: string | null;
  projectStatus?: string | null;
  taskId?: number | null;
  checklistItems?: ChecklistItem[] | null;
  checklistProgress?: Record<string, boolean> | null;
}

interface KanbanColumn {
  id: string;
  title: string;
  stageNumber?: number;
  cards: KanbanCard[];
  cardCount: number;
  color: string;
  borderColor: string;
  bgColor: string;
}

interface KanbanData {
  columns: KanbanColumn[];
  totalProjects: number;
  completedProjects: number;
  activeProjects: number;
}

interface PendingMove {
  cardId: number;
  sourceColumn: string;
  targetColumn: string;
  targetStage: number;
}

// ── 유틸리티 함수 ──────────────────────────────────────────────────────

const getCardsByColumn = (cards: KanbanCard[], columnId: string): KanbanCard[] => {
  if (columnId === 'stage-1') return cards.filter(card => card.currentStage === 1);
  if (columnId === 'stage-2') return cards.filter(card => card.currentStage === 2);
  if (columnId === 'stage-3') return cards.filter(card => card.currentStage === 3);
  if (columnId === 'stage-4') return cards.filter(card => card.currentStage === 4);
  if (columnId === 'completed') return cards.filter(card => card.projectStatus === 'completed');
  return [];
};

// ── 메인 컴포넌트 ──────────────────────────────────────────────────────

export default function ProductionKanbanView() {
  const queryClient = useQueryClient();
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [overId, setOverId] = useState<UniqueIdentifier | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showBackwardConfirm, setShowBackwardConfirm] = useState(false);
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);
  const [pendingMove, setPendingMove] = useState<PendingMove | null>(null);
  const dragStartTime = useRef<number>(0);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
        delay: 200,
      },
    })
  );

  // 칸반 데이터 조회
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['production-kanban'],
    queryFn: async () => {
      const response = await fetchApi<KanbanData>('/admin/api/production/kanban');
      return response;
    },
    refetchInterval: 30000, // 30초마다 자동 새로고침
  });

  // 카드 이동 뮤테이션
  const moveCardMutation = useMutation({
    mutationFn: async ({ cardId, targetStage }: { cardId: number; targetStage: number }) => {
      await fetchApi('/admin/api/production/kanban/move-card', {
        method: 'POST',
        body: JSON.stringify({
          projectId: cardId,
          targetStage: targetStage
        })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production-kanban'] });
      toast.success('카드가 이동되었습니다.');
    },
    onError: (error) => {
      console.error('Move card error:', error);
      toast.error('카드 이동에 실패했습니다.');
    }
  });

  // 카드 순서 변경 뮤테이션
  const reorderCardsMutation = useMutation({
    mutationFn: async ({ 
      columnId, 
      cardIds 
    }: { 
      columnId: string; 
      cardIds: number[] 
    }) => {
      await fetchApi('/admin/api/production/kanban/reorder', {
        method: 'POST',
        body: JSON.stringify({
          columnId,
          cardIds
        })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production-kanban'] });
    },
    onError: (error) => {
      console.error('Reorder error:', error);
      toast.error('순서 변경에 실패했습니다.');
    }
  });

  // 드래그 중인 카드 찾기
  const findCard = useCallback((id: UniqueIdentifier): KanbanCard | undefined => {
    if (!data) return undefined;
    
    const cardId = typeof id === 'string' && id.startsWith('card-') 
      ? parseInt(id.replace('card-', ''))
      : typeof id === 'number' ? id : undefined;
      
    if (!cardId) return undefined;
    
    for (const column of data.columns) {
      const card = column.cards.find(c => c.id === cardId);
      if (card) return card;
    }
    return undefined;
  }, [data]);

  // 컬럼 찾기
  const findColumn = useCallback((cardId: number): KanbanColumn | undefined => {
    if (!data) return undefined;
    
    return data.columns.find(column => 
      column.cards.some(card => card.id === cardId)
    );
  }, [data]);

  // 대상 스테이지 번호 가져오기
  const getTargetStageNumber = (columnId: string): number => {
    if (columnId === 'stage-1') return 1;
    if (columnId === 'stage-2') return 2;
    if (columnId === 'stage-3') return 3;
    if (columnId === 'stage-4') return 4;
    if (columnId === 'completed') return 5;
    return 0;
  };

  // 뒤로 가는지 확인
  const isMovingBackward = (currentStage: number, targetStage: number): boolean => {
    return targetStage < currentStage;
  };

  // 완료로 바로 이동하는지 확인
  const isMovingToCompleteEarly = (currentStage: number, targetStage: number): boolean => {
    return targetStage === 5 && currentStage < 4;
  };

  // 드래그 시작
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id);
    setIsDragging(true);
    dragStartTime.current = Date.now();
  };

  // 드래그 오버
  const handleDragOver = (event: DragOverEvent) => {
    setOverId(event.over?.id || null);
  };

  // 드래그 종료
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    setActiveId(null);
    setOverId(null);
    setIsDragging(false);

    if (!over || !data) return;

    const activeCardId = typeof active.id === 'string' && active.id.startsWith('card-')
      ? parseInt(active.id.replace('card-', ''))
      : undefined;

    if (!activeCardId) return;

    const activeCard = findCard(active.id);
    const sourceColumn = findColumn(activeCardId);
    
    if (!activeCard || !sourceColumn) return;

    // 대상 컬럼 ID 추출
    let targetColumnId: string;
    if (typeof over.id === 'string' && over.id.startsWith('column-')) {
      targetColumnId = over.id.replace('column-', '');
    } else if (typeof over.id === 'string' && over.id.startsWith('card-')) {
      const overCard = findCard(over.id);
      const overColumn = overCard ? findColumn(overCard.id) : undefined;
      targetColumnId = overColumn?.id || '';
    } else {
      return;
    }

    const targetColumn = data.columns.find(col => col.id === targetColumnId);
    if (!targetColumn) return;

    // 같은 컬럼 내에서의 이동
    if (sourceColumn.id === targetColumn.id) {
      const oldIndex = sourceColumn.cards.findIndex(c => c.id === activeCardId);
      const newIndex = over.data.current?.sortable?.index ?? oldIndex;
      
      if (oldIndex !== newIndex) {
        const newCards = arrayMove(sourceColumn.cards, oldIndex, newIndex);
        reorderCardsMutation.mutate({
          columnId: sourceColumn.id,
          cardIds: newCards.map(c => c.id)
        });
      }
      return;
    }

    // 다른 컬럼으로의 이동
    const currentStage = activeCard.currentStage || 1;
    const targetStage = getTargetStageNumber(targetColumnId);

    // 이동 제약 확인
    if (isMovingBackward(currentStage, targetStage)) {
      setPendingMove({
        cardId: activeCardId,
        sourceColumn: sourceColumn.id,
        targetColumn: targetColumn.id,
        targetStage
      });
      setShowBackwardConfirm(true);
      return;
    }

    if (isMovingToCompleteEarly(currentStage, targetStage)) {
      setPendingMove({
        cardId: activeCardId,
        sourceColumn: sourceColumn.id,
        targetColumn: targetColumn.id,
        targetStage
      });
      setShowCompleteConfirm(true);
      return;
    }

    // 정상적인 이동
    moveCardMutation.mutate({
      cardId: activeCardId,
      targetStage
    });
  };

  // 뒤로 이동 확인
  const confirmBackwardMove = () => {
    if (pendingMove) {
      moveCardMutation.mutate({
        cardId: pendingMove.cardId,
        targetStage: pendingMove.targetStage
      });
      setShowBackwardConfirm(false);
      setPendingMove(null);
    }
  };

  // 완료 이동 확인
  const confirmCompleteMove = () => {
    if (pendingMove) {
      moveCardMutation.mutate({
        cardId: pendingMove.cardId,
        targetStage: pendingMove.targetStage
      });
      setShowCompleteConfirm(false);
      setPendingMove(null);
    }
  };

  // 취소
  const cancelMove = () => {
    setShowBackwardConfirm(false);
    setShowCompleteConfirm(false);
    setPendingMove(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-[#ff6246]" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <AlertTriangle className="h-12 w-12 text-gray-400" />
        <p className="text-gray-500">데이터를 불러올 수 없습니다.</p>
        <Button onClick={() => refetch()} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          다시 시도
        </Button>
      </div>
    );
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 p-6 overflow-x-auto min-h-[calc(100vh-200px)]">
          {data.columns.map((column) => (
            <SortableContext
              key={column.id}
              id={`column-${column.id}`}
              items={column.cards.map(card => `card-${card.id}`)}
              strategy={verticalListSortingStrategy}
            >
              <ProductionColumn
                column={column}
                cards={column.cards}
                isDraggingOver={overId === `column-${column.id}`}
                isDragging={isDragging}
              />
            </SortableContext>
          ))}
        </div>

        <DragOverlay>
          {activeId ? (
            <div className="rotate-3 opacity-90">
              <ProductionCard
                card={findCard(activeId)!}
                isDragging={true}
                isInDragOverlay={true}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* 뒤로 가기 확인 대화상자 */}
      <AlertDialog open={showBackwardConfirm} onOpenChange={setShowBackwardConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>진행된 작업을 취소하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              이전 단계로 돌아가면 현재 단계의 작업 진행 상황이 초기화될 수 있습니다.
              정말로 이동하시겠습니까?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelMove}>
              아니오
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmBackwardMove}
              className="bg-red-600 hover:bg-red-700"
            >
              예
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 프로젝트 완료 확인 대화상자 */}
      <AlertDialog open={showCompleteConfirm} onOpenChange={setShowCompleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>프로젝트를 완료하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              프로젝트가 완료되면 다시 되돌릴 수 없습니다. 
              계속 진행하시겠습니까?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelMove}>
              아니오
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmCompleteMove}
              className="bg-green-600 hover:bg-green-700"
            >
              예
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
