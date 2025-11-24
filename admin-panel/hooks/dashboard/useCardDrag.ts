// hooks/dashboard/useCardDrag.ts
import { useState, useCallback } from 'react';
import { DragEndEvent } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';

interface UseCardDragProps {
 initialOrder: string[];
 onOrderChange?: (newOrder: string[]) => void;
 onSave?: (cardOrder: string[]) => Promise<void>;
}

export function useCardDrag({
 initialOrder,
 onOrderChange,
 onSave
}: UseCardDragProps) {
 const [cardOrder, setCardOrder] = useState<string[]>(initialOrder);
 const [isDragging, setIsDragging] = useState(false);
 const [isSaving, setIsSaving] = useState(false);

 // 드래그 시작 처리
 const handleDragStart = useCallback(() => {
   setIsDragging(true);
 }, []);

 // 드래그 종료 처리
 const handleDragEnd = useCallback((event: DragEndEvent) => {
   const { active, over } = event;
   setIsDragging(false);
   
   if (!over) return;
   
   if (active.id !== over.id) {
     setCardOrder((items) => {
       const oldIndex = items.indexOf(active.id.toString());
       const newIndex = items.indexOf(over.id.toString());
       
       const newOrder = arrayMove(items, oldIndex, newIndex);
       
       // 상위 컴포넌트에 변경 알림 (옵션)
       if (onOrderChange) {
         onOrderChange(newOrder);
       }
       
       return newOrder;
     });
   }
 }, [onOrderChange]);

 // 카드 순서 직접 변경
 const updateCardOrder = useCallback((newOrder: string[]) => {
   setCardOrder(newOrder);
   
   if (onOrderChange) {
     onOrderChange(newOrder);
   }
 }, [onOrderChange]);

 // 카드 순서 저장
 const saveCardOrder = useCallback(async () => {
   if (!onSave) return;
   
   setIsSaving(true);
   try {
     await onSave(cardOrder);
     return true;
   } catch (error) {
     console.error('카드 순서 저장 실패:', error);
     return false;
   } finally {
     setIsSaving(false);
   }
 }, [cardOrder, onSave]);

 // 카드 위치 변경
 const moveCard = useCallback((cardId: string, direction: 'up' | 'down') => {
   setCardOrder((items) => {
     const index = items.indexOf(cardId);
     if (index === -1) return items;
     
     if (direction === 'up' && index > 0) {
       return arrayMove(items, index, index - 1);
     } else if (direction === 'down' && index < items.length - 1) {
       return arrayMove(items, index, index + 1);
     }
     
     return items;
   });
 }, []);

 return {
   cardOrder,
   isDragging,
   isSaving,
   handleDragStart,
   handleDragEnd,
   updateCardOrder,
   saveCardOrder,
   moveCard
 };
}
