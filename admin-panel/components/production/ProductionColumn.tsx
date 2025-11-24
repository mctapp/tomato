// components/production/ProductionColumn.tsx

'use client';

import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ProductionCard } from './ProductionCard';
import { cn } from '@/lib/utils';

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

interface ProductionColumnProps {
  column: KanbanColumn;
  cards: KanbanCard[];
  isDraggingOver: boolean;
  isDragging: boolean;
}

// ── 메인 컴포넌트 ──────────────────────────────────────────────────────

export function ProductionColumn({ 
  column, 
  cards, 
  isDraggingOver,
  isDragging 
}: ProductionColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `column-${column.id}`,
    data: {
      type: 'column',
      column: column
    }
  });

  const isHighlighted = isDraggingOver || isOver;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex-shrink-0 w-80 transition-all duration-200",
        isHighlighted && "scale-[1.02]"
      )}
    >
      <Card 
        className={cn(
          "border-2 transition-all duration-200",
          column.borderColor,
          isHighlighted && "ring-2 ring-offset-2 ring-[#ff6246]",
          isDragging && !isHighlighted && "opacity-60"
        )}
      >
        <CardHeader className={cn("pb-3", column.bgColor)}>
          <CardTitle className="flex items-center justify-between">
            <span className={cn("text-lg font-semibold", column.color)}>
              {column.title}
            </span>
            <Badge 
              variant="secondary" 
              className={cn(
                "text-xs px-2 py-0.5",
                column.id === 'completed' && cards.length > 0 && "bg-green-100 text-green-700"
              )}
            >
              {cards.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="p-3">
          <div className="space-y-3">
            {cards.length === 0 ? (
              <div 
                className={cn(
                  "text-center py-12 text-sm text-gray-500 border-2 border-dashed rounded-lg transition-colors",
                  isHighlighted ? "border-[#ff6246] bg-[#fff5f3]" : "border-gray-200"
                )}
              >
                {isDragging ? "여기에 놓으세요" : "프로젝트가 없습니다"}
              </div>
            ) : (
              <SortableContext
                items={cards.map(card => `card-${card.id}`)}
                strategy={verticalListSortingStrategy}
              >
                {cards.map((card) => (
                  <ProductionCard
                    key={card.id}
                    card={card}
                    isDragging={false}
                  />
                ))}
              </SortableContext>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
