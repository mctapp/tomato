// components/production/ProductionKanban.tsx

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  DndContext,
  DragOverlay,
  closestCorners
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useDroppable } from '@dnd-kit/core';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import { Filter, Settings, BarChart3, AlertTriangle, Loader2, RefreshCw, List, LayoutGrid, ArrowLeft } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ProductionCard } from './ProductionCard';
import { ProductionCardCompact } from './ProductionCardCompact';
import { 
  StageNumber,
  ProductionCardData,
  KanbanStageData,
  LayoutMode,
} from '@/types/production';
import { STAGE_SIMPLE_NAMES } from '@/lib/constants/production';
import { cn } from '@/lib/utils';
import { useProductionKanban } from '@/hooks/useProductionKanban';
import { useProductionKanbanDnD } from '@/hooks/useProductionKanbanDnD';
import { STAGE_PROGRESS_RANGES, COMPACT_THRESHOLD } from '@/lib/constants/production-kanban';
import dynamic from 'next/dynamic';

// Dynamic imports
const ProductionDetailModal = dynamic(() => import('./ProductionDetailModal'), {
  ssr: false
});

const ProductionMemoModal = dynamic(() => import('./ProductionMemoModal'), {
  ssr: false,
  loading: () => null
});

// ── SortableProductionCard 래퍼 컴포넌트 ──────────────────────────────────

interface SortableProductionCardProps {
  card: ProductionCardData;
  onOpenDetail?: (projectId: number) => void;
  onTogglePin?: (projectId: number) => void;
  onOpenMemo?: (projectId: number) => void;
}

function SortableProductionCard({ card, onOpenDetail, onTogglePin, onOpenMemo }: SortableProductionCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `card-${card.id}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: 'grab',
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <ProductionCard 
        card={card} 
        isDragging={isDragging} 
        onOpenDetail={onOpenDetail}
        onTogglePin={onTogglePin}
        onOpenMemo={onOpenMemo}
      />
    </div>
  );
}

// ── SortableProductionCardCompact 래퍼 컴포넌트 (새로 추가) ──────────────────────────────────

interface SortableProductionCardCompactProps {
  card: ProductionCardData;
  onOpenDetail?: (projectId: number) => void;
  onTogglePin?: (projectId: number) => void;
  onOpenMemo?: (projectId: number) => void;
}

function SortableProductionCardCompact({ card, onOpenDetail, onTogglePin, onOpenMemo }: SortableProductionCardCompactProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `card-${card.id}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: 'grab',
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <ProductionCardCompact 
        card={card} 
        onOpenDetail={onOpenDetail || (() => {})}
        onOpenMemo={onOpenMemo}
        onTogglePin={onTogglePin}
      />
    </div>
  );
}

// ── 완료 영역 컴포넌트 ──────────────────────────────────────────────────

interface CompletionDropZoneProps {
  visible: boolean;
}

function CompletionDropZone({ visible }: CompletionDropZoneProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'completion-zone',
  });

  if (!visible) return null;

  return (
    <div
      ref={setNodeRef}
      className={`
        border-2 border-dashed ${isOver ? 'border-[#4da34c] bg-[#f5fbf5]' : 'border-gray-300 bg-gray-50'}
        rounded-lg p-8 text-center transition-all
      `}
    >
      <div className={`${isOver ? 'text-[#4da34c]' : 'text-gray-400'}`}>
        <div className="font-medium text-lg">프로젝트 완료</div>
        <div className="text-sm mt-1">카드를 여기로 드래그하여 완료 처리</div>
      </div>
    </div>
  );
}

// ── KanbanColumn 컴포넌트 ──────────────────────────────────────────────

interface KanbanColumnProps {
  stage: KanbanStageData;
  loading?: boolean;
  layoutMode?: LayoutMode;
  onOpenDetail?: (projectId: number) => void;
  onTogglePin?: (projectId: number) => void;
  onOpenMemo?: (projectId: number) => void;
}

function KanbanColumn({ 
  stage, 
  loading = false, 
  layoutMode = LayoutMode.STANDARD,
  onOpenDetail,
  onTogglePin,
  onOpenMemo
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `stage-${stage.stageNumber}`,
  });

  // 메모 모달 상태 추가
  const [memoModalState, setMemoModalState] = useState<{
    isOpen: boolean;
    projectId: number | null;
    projectTitle: string;
  }>({
    isOpen: false,
    projectId: null,
    projectTitle: ''
  });

  const stageNumber = stage.stageNumber as StageNumber;
  const progressRange = STAGE_PROGRESS_RANGES[stageNumber];
  
  // 컴팩트 모드 자동 전환 임계값
  const shouldSuggestCompact = layoutMode === LayoutMode.STANDARD && stage.cards.length >= COMPACT_THRESHOLD;
  
  // Pin된 카드를 상단에 배치
  const sortedCards = [...stage.cards].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return 0;
  });

  // 메모 모달 핸들러
  const handleOpenMemo = (projectId: number) => {
    if (onOpenMemo) {
      onOpenMemo(projectId);
    } else {
      const card = stage.cards.find(c => c.id === projectId);
      if (card) {
        setMemoModalState({
          isOpen: true,
          projectId: projectId,
          projectTitle: card.movieTitle || '제목 없음'
        });
      }
    }
  };

  return (
    <>
      <Card className={`h-full border-gray-200 ${isOver ? 'ring-2 ring-[#ff6246]' : ''} shadow-sm hover:shadow-md transition-all duration-300`}>
        <CardHeader className="pb-2 px-3">
          <div className="flex justify-between items-center">
            <CardTitle className="text-sm font-semibold text-[#333333]">
              {stage.stageName}
            </CardTitle>
            <div className="flex gap-2 items-center">
              {loading && <Loader2 className="h-3 w-3 animate-spin text-gray-400" />}
              <Badge className="text-xs bg-gray-100 text-gray-700">
                {stage.cards.length}
              </Badge>
            </div>
          </div>
          <div className="text-xs text-gray-500 mt-1">
            진행률: {progressRange.min}% - {progressRange.max}%
          </div>
          {shouldSuggestCompact && (
            <div className="text-xs text-orange-600 mt-1">
              많은 카드가 있습니다. 간소 보기를 사용해보세요.
            </div>
          )}
        </CardHeader>
        
        <CardContent className="pt-0 px-2 pb-2">
          <SortableContext
            items={sortedCards.map(card => `card-${card.id}`)}
            strategy={verticalListSortingStrategy}
          >
            <div 
              ref={setNodeRef}
              className={`
                space-y-1 min-h-[500px] py-2
                ${isOver ? 'ring-2 ring-[#ff6246] ring-opacity-50 rounded-lg' : ''}
                transition-all
              `}
            >
              {sortedCards.length > 0 ? (
                sortedCards.map(card => {
                  // 컴팩트 모드에서도 Pin된 카드는 표준 모드로 표시
                  const useCompact = layoutMode === LayoutMode.COMPACT && !card.isPinned;
                  
                  return useCompact ? (
                    <SortableProductionCardCompact
                      key={card.id}
                      card={card}
                      onOpenDetail={onOpenDetail}
                      onOpenMemo={handleOpenMemo}
                      onTogglePin={onTogglePin}
                    />
                  ) : (
                    <SortableProductionCard
                      key={card.id}
                      card={card}
                      onOpenDetail={onOpenDetail}
                      onTogglePin={onTogglePin}
                      onOpenMemo={handleOpenMemo}
                    />
                  );
                })
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <div className="text-sm">작업이 없습니다</div>
                </div>
              )}
            </div>
          </SortableContext>
        </CardContent>
      </Card>
      
      {/* 메모 모달 */}
      {memoModalState.isOpen && memoModalState.projectId && (
        <React.Suspense fallback={null}>
          <ProductionMemoModal
            isOpen={memoModalState.isOpen}
            onClose={() => setMemoModalState({ isOpen: false, projectId: null, projectTitle: '' })}
            projectId={memoModalState.projectId}
            projectTitle={memoModalState.projectTitle}
            taskId={null}
          />
        </React.Suspense>
      )}
    </>
  );
}

// ── 메인 컴포넌트 ──────────────────────────────────────────────────────

export function ProductionKanban() {
  const router = useRouter();
  const [showHiddenLink, setShowHiddenLink] = useState(false);
  
  // 커스텀 훅 사용
  const {
    kanbanData,
    kanbanLoading,
    kanbanError,
    filterOptions,
    selectedProjectId,
    mediaTypeFilter,
    speedTypeFilter,
    layoutMode,
    refetchKanban,
    setSelectedProjectId,
    setMediaTypeFilter,
    setSpeedTypeFilter,
    handleProjectUpdate,
    handleTogglePin,
    handleLayoutModeChange,
    handleOpenDetail,
    moveCardMutation,
    completeProjectMutation
  } = useProductionKanban();

  // DnD 커스텀 훅 사용
  const {
    activeCard,
    isDragging,
    showBackwardConfirm,
    sensors,
    handleDragStart,
    handleDragEnd,
    confirmBackwardMove,
    cancelBackwardMove
  } = useProductionKanbanDnD({
    kanbanData,
    moveCardMutation,
    completeProjectMutation
  });

  // ── 렌더링 ───────────────────────────────────────────────────────────

  if (kanbanLoading && !kanbanData) {
    return (
      <div className="max-w-[1200px] mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-[#ff6246]" />
            <div className="text-gray-500">칸반보드를 불러오는 중...</div>
          </div>
        </div>
      </div>
    );
  }

  if (kanbanError && !kanbanData) {
    return (
      <div className="max-w-[1200px] mx-auto p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="flex justify-between items-center">
            <span>{kanbanError instanceof Error ? kanbanError.message : '데이터를 불러올 수 없습니다.'}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchKanban()}
              disabled={kanbanLoading}
            >
              {kanbanLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                '다시 시도'
              )}
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="max-w-[1200px] mx-auto py-6 space-y-6">
        {/* 헤더 */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#333333]">접근성 미디어 제작 관리</h1>
            <p className="text-muted-foreground mt-1">
              총 {kanbanData.totalProjects}개 프로젝트
            </p>
          </div>
          
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => router.push('/production/templates')}
              className="hover:bg-[#f5fbf5] hover:text-[#4da34c] hover:border-[#4da34c]"
            >
              <Settings className="w-4 h-4 mr-2" />
              템플릿 설정
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push('/production/analytics')}
              className="hover:bg-[#fff5f3] hover:text-[#ff6246] hover:border-[#ff6246]"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              성과 분석
            </Button>
          </div>
        </div>

        {/* 필터 */}
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex gap-4 items-center flex-1">
            <Filter className="w-4 h-4 text-gray-500" />
            
            <Select value={mediaTypeFilter} onValueChange={setMediaTypeFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="미디어 유형" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                {filterOptions.mediaTypes?.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={speedTypeFilter} onValueChange={setSpeedTypeFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="작업 속도" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                {filterOptions.speedTypes?.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {(mediaTypeFilter !== 'all' || speedTypeFilter !== 'all') && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setMediaTypeFilter('all');
                  setSpeedTypeFilter('all');
                }}
                className="flex items-center"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                필터 초기화
              </Button>
            )}
          </div>
          
          {/* 레이아웃 모드 토글 - 버그 수정: 실제 layoutMode와 동기화 */}
          <div className="flex gap-1 border rounded-md p-1 bg-white">
            <Button
              variant={layoutMode === LayoutMode.STANDARD ? "default" : "ghost"}
              size="sm"
              onClick={() => handleLayoutModeChange(LayoutMode.STANDARD)}
              className={cn(
                "h-8 px-3",
                layoutMode === LayoutMode.STANDARD ? "bg-[#ff6246] hover:bg-[#ff6246]/90 text-white" : "hover:bg-gray-100"
              )}
              aria-label="표준 보기"
              title="표준 보기"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={layoutMode === LayoutMode.COMPACT ? "default" : "ghost"}
              size="sm"
              onClick={() => handleLayoutModeChange(LayoutMode.COMPACT)}
              className={cn(
                "h-8 px-3",
                layoutMode === LayoutMode.COMPACT ? "bg-[#ff6246] hover:bg-[#ff6246]/90 text-white" : "hover:bg-gray-100"
              )}
              aria-label="간소 보기"
              title="간소 보기"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* 칸반보드 */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-3 h-full min-h-[600px]">
              {kanbanData.stages.map(stage => (
                <KanbanColumn
                  key={stage.stageNumber}
                  stage={stage}
                  loading={kanbanLoading}
                  layoutMode={layoutMode}
                  onOpenDetail={handleOpenDetail}
                  onTogglePin={handleTogglePin}
                />
              ))}
            </div>
            
            {/* 완료 영역 */}
            <CompletionDropZone visible={isDragging} />
          </div>
          
          <DragOverlay>
            {activeCard ? (
              <div className="rotate-3 opacity-90">
                <ProductionCard card={activeCard} isDragging={true} />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>

        {/* ProductionDetailModal에 onUpdate 콜백 전달 */}
        {selectedProjectId && (
          <ProductionDetailModal
            isOpen={!!selectedProjectId}
            onClose={() => setSelectedProjectId(null)}
            projectId={selectedProjectId}
            onUpdate={handleProjectUpdate}
          />
        )}
        
        {/* 역방향 이동 확인 다이얼로그 */}
        <AlertDialog open={showBackwardConfirm} onOpenChange={(open) => !open && cancelBackwardMove()}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>이전 단계로 되돌리시겠습니까?</AlertDialogTitle>
              <AlertDialogDescription>
                이전 단계로 돌아가면 현재 단계의 작업 진행 상황이 초기화될 수 있습니다.
                정말로 계속하시겠습니까?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={cancelBackwardMove}>
                취소
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmBackwardMove}
                className="bg-red-600 hover:bg-red-700"
              >
                되돌리기
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      
      {/* 히든 호버 영역 - 화면 좌측 (FAB 포함) */}
      <div 
        className="fixed left-0 top-0 bottom-0 w-32 z-40"
        onMouseEnter={() => setShowHiddenLink(true)}
        onMouseLeave={() => setShowHiddenLink(false)}
      >
        {/* FAB 스타일 대시보드 버튼 */}
        <Link 
          href="/dashboard"
          className={`
            absolute bottom-8 left-8
            transition-all duration-300 ease-in-out
            ${showHiddenLink 
              ? 'opacity-100 scale-100' 
              : 'opacity-0 scale-0 pointer-events-none'
            }
            group
          `}
        >
          {/* 메인 FAB 버튼 */}
          <div className={`
            w-14 h-14 rounded-full
            bg-gradient-to-br from-[#4da34c] to-[#3d8a3c]
            shadow-lg
            flex items-center justify-center
            transition-shadow duration-300
            hover:shadow-xl
            relative
          `}>
            <ArrowLeft className="h-6 w-6 text-white" />
          </div>
          
          {/* 라벨 툴팁 */}
          <div className={`
            absolute left-0 bottom-full mb-2
            px-3 py-1.5 bg-gray-900 text-white text-xs rounded-lg
            whitespace-nowrap
            transition-opacity duration-300
            opacity-0 group-hover:opacity-90
            pointer-events-none
          `}>
            대시보드
            <div className="absolute left-1/2 -translate-x-1/2 -bottom-1 
                          w-2 h-2 bg-gray-900 rotate-45" />
          </div>
        </Link>
      </div>
    </div>
  );
}
