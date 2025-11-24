// components/production/ProductionCardCompact.tsx

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, MoreVertical } from 'lucide-react';
import { ProductionCardData } from '@/types/production';
import { cn } from '@/lib/utils';

interface ProductionCardCompactProps {
  card: ProductionCardData;
  onOpenDetail: (projectId: number) => void;
  onOpenMemo?: (projectId: number) => void;
  onTogglePin?: (projectId: number) => void;
}

const MEDIA_TYPE_LABELS: Record<string, string> = {
  'AD': 'AD',
  'CC': 'CC',
  'SL': 'SL',
};

const MEDIA_TYPE_COLORS: Record<string, string> = {
  'AD': 'bg-[#4da34c] text-white border-0',
  'CC': 'bg-[#ff7e66] text-white border-0',
  'SL': 'bg-[#8a3033] text-white border-0',
};

export function ProductionCardCompact({ 
  card, 
  onOpenDetail,
  onOpenMemo,
  onTogglePin // 인터페이스는 유지하되 사용하지 않음
}: ProductionCardCompactProps) {
  const memoCount = card.memoCount ?? 0;  // 상단에 변수 선언

  const handleCardClick = (e: React.MouseEvent) => {
    // 버튼 클릭 시 카드 클릭 이벤트 방지
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }
    onOpenDetail(card.id);
  };

  // 진행률 반올림 처리
  const roundedProgress = Math.round(card.progressPercentage ?? 0);

  return (
    <div 
      className={cn(
        "group flex items-center gap-2 p-2 rounded-lg border border-gray-200",
        "hover:bg-gray-50 cursor-pointer transition-colors",
        card.isPinned && "bg-orange-50 border-orange-200"
      )}
      onClick={handleCardClick}
    >
      {/* 영화 제목 - 더 많은 공간 할당 */}
      <h4 className="flex-1 text-sm font-medium text-gray-900 truncate">
        {card.movieTitle}
      </h4>

      {/* 미디어 타입 - 라운디드 배지 스타일 */}
      <Badge className={cn(
        "text-xs px-2 py-0.5 rounded-full",
        MEDIA_TYPE_COLORS[card.mediaType] || "bg-gray-200 text-gray-700 border-0"
      )}>
        {MEDIA_TYPE_LABELS[card.mediaType] || card.mediaType}
      </Badge>

      {/* 진행률 - 반올림된 값 */}
      <span className="text-xs font-medium text-gray-700 min-w-[35px] text-right">
        {roundedProgress}%
      </span>

      {/* 액션 버튼들 - 간격 최소화 */}
      <div className="flex items-center gap-0.5 shrink-0">
        {/* 메모 버튼 - 개수를 아이콘 위에 표시 */}
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 hover:bg-gray-100"
            onClick={(e) => {
              e.stopPropagation();
              onOpenMemo?.(card.id);
            }}
            title="메모"
          >
            <MessageSquare className="h-3.5 w-3.5 text-gray-500" />
          </Button>
          {memoCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full h-4 w-4 flex items-center justify-center">
              {memoCount > 9 ? '9+' : memoCount}
            </span>
          )}
        </div>

        {/* 상세보기 버튼 - MoreVertical 아이콘으로 통일 */}
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 hover:bg-gray-100"
          onClick={(e) => {
            e.stopPropagation();
            onOpenDetail(card.id);
          }}
          title="상세 정보"
        >
          <MoreVertical className="h-3.5 w-3.5 text-gray-500" />
        </Button>
      </div>

      {/* D-day 표시 (필요시) */}
      {card.isOverdue && card.daysRemaining !== null && card.daysRemaining !== undefined && (
        <Badge 
          variant="destructive"
          className="text-[10px] px-1.5 py-0 h-5 rounded-full"
        >
          +{Math.abs(card.daysRemaining)}
        </Badge>
      )}
    </div>
  );
}
