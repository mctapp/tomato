// /components/dashboard/core/DashboardGrid.tsx
import { ReactNode } from 'react';
import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy
} from '@dnd-kit/sortable';
import { useDashboard } from './DashboardContext';

interface DashboardGridProps {
  children: ReactNode;
}

export const DashboardGrid = ({ children }: DashboardGridProps) => {
  const { cards, reorderCards } = useDashboard();
  
  // 드래그 앤 드롭을 위한 센서 설정
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  
  // 드래그 종료 이벤트 핸들러
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = cards.findIndex(card => card.id === active.id);
      const newIndex = cards.findIndex(card => card.id === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        // 새 순서 계산
        const newCardIds = [...cards.map(card => card.id)];
        const [movedItem] = newCardIds.splice(oldIndex, 1);
        newCardIds.splice(newIndex, 0, movedItem);
        
        // 카드 순서 업데이트
        reorderCards(newCardIds);
      }
    }
  };
  
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={cards.map(card => card.id)} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {children}
        </div>
      </SortableContext>
    </DndContext>
  );
};

export default DashboardGrid;
