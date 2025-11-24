// components/dashboard/core/DashboardSettings.tsx
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { CardDefinition } from "@/lib/dashboard/types";
import { Save, RefreshCw, Eye, EyeOff } from "lucide-react";

interface DashboardSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cards: CardDefinition[];
  visibleCardIds: string[];
  cardOrder: string[];
  onToggleVisibility: (cardId: string) => void;
  onReorderCards: (newOrder: string[]) => void;
  onSave: () => Promise<void>;
  onReset: () => void;
  isSaving: boolean;
}

// 정렬 가능한 아이템 컴포넌트
function SortableItem({ card, isVisible, onToggle }: { 
  card: CardDefinition; 
  isVisible: boolean; 
  onToggle: () => void; 
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: card.id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="flex justify-between items-center p-3 bg-white border border-gray-200 rounded-md"
    >
      <div className="flex items-center">
        {card.icon && (
          <div className="mr-2">{card.icon}</div>
        )}
        <span>{card.title}</span>
      </div>
      <div className="flex items-center space-x-2">
        <Switch
          id={`visibility-${card.id}`}
          checked={isVisible}
          onCheckedChange={onToggle}
        />
        <Label htmlFor={`visibility-${card.id}`}>
          {isVisible ? 
            <Eye className="h-4 w-4 text-green-500" /> : 
            <EyeOff className="h-4 w-4 text-gray-400" />
          }
        </Label>
      </div>
    </div>
  );
}

export function DashboardSettings({
  open,
  onOpenChange,
  cards,
  visibleCardIds,
  cardOrder,
  onToggleVisibility,
  onReorderCards,
  onSave,
  onReset,
  isSaving
}: DashboardSettingsProps) {
  const [localCardOrder, setLocalCardOrder] = useState<string[]>(cardOrder);
  const [localVisibleCardIds, setLocalVisibleCardIds] = useState<string[]>(visibleCardIds);
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Dialog가 열릴 때 로컬 상태 초기화
  const handleOpenChange = (open: boolean) => {
    if (open) {
      setLocalCardOrder(cardOrder);
      setLocalVisibleCardIds(visibleCardIds);
    }
    onOpenChange(open);
  };
  
  // 드래그 앤 드롭 핸들러
  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    
    if (active.id !== over.id) {
      setLocalCardOrder((items) => {
        const oldIndex = items.indexOf(active.id);
        const newIndex = items.indexOf(over.id);
        
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };
  
  // 카드 가시성 토글
  const handleToggleVisibility = (cardId: string) => {
    setLocalVisibleCardIds(prev => 
      prev.includes(cardId) 
        ? prev.filter(id => id !== cardId) 
        : [...prev, cardId]
    );
  };
  
  // 설정 저장
  const handleSave = async () => {
    onReorderCards(localCardOrder);
    
    // 가시성 변경 사항을 모두 적용
    localVisibleCardIds.forEach(cardId => {
      if (!visibleCardIds.includes(cardId)) {
        onToggleVisibility(cardId);
      }
    });
    
    visibleCardIds.forEach(cardId => {
      if (!localVisibleCardIds.includes(cardId)) {
        onToggleVisibility(cardId);
      }
    });
    
    await onSave();
    onOpenChange(false);
  };
  
  // 설정 초기화
  const handleReset = () => {
    onReset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md md:max-w-lg">
        <DialogHeader>
          <DialogTitle>대시보드 설정</DialogTitle>
          <DialogDescription>
            카드 표시 여부와 순서를 설정합니다.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 max-h-[60vh] overflow-y-auto">
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-md mb-3">
            <div className="font-medium">카드 이름</div>
            <div className="font-medium">표시 여부</div>
          </div>
          
          <DndContext 
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext 
              items={localCardOrder}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {localCardOrder.map((cardId) => {
                  const card = cards.find(c => c.id === cardId);
                  if (!card) return null;
                  
                  return (
                    <SortableItem 
                      key={card.id} 
                      card={card}
                      isVisible={localVisibleCardIds.includes(card.id)}
                      onToggle={() => handleToggleVisibility(card.id)}
                    />
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleReset}>
            <RefreshCw className="h-4 w-4 mr-2" />
            초기화
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? '저장 중...' : '설정 저장'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
