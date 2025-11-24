// components/dashboard/cards/BaseCard.tsx
import { ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronDown, ChevronUp, GripVertical } from "lucide-react";
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { CARD_ICONS } from '@/lib/dashboard/constants';
import { CardType } from '@/lib/dashboard/types';
import { useDashboard } from '../core/DashboardContext';
import { motion, AnimatePresence } from "framer-motion";

interface BaseCardProps {
  id: string;
  title: string;
  description: string;
  type: CardType;
  children: ReactNode;
  footerContent?: ReactNode;
}

export const BaseCard = ({ 
  id, 
  title, 
  description, 
  type, 
  children,
  footerContent
}: BaseCardProps) => {
  const { collapsedCards, toggleCardCollapse } = useDashboard();
  const isCollapsed = collapsedCards.includes(id);
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
  };
  
  const CardIcon = CARD_ICONS[type];
  
  const handleToggle = () => {
    toggleCardCollapse(id, isCollapsed);
  };
  
  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={`${isDragging ? 'opacity-50' : ''} h-full`}
    >
      <Card className="h-full flex flex-col bg-white border border-gray-300 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 rounded-xl overflow-hidden">
        <CardHeader className="p-3 pb-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              {CardIcon && <CardIcon className="h-5 w-5 mr-2 text-[#333333]" />}
              <CardTitle className="text-lg font-medium text-[#333333]">{title}</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={handleToggle}
                className="p-1 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                aria-label={isCollapsed ? "카드 펼치기" : "카드 접기"}
              >
                {isCollapsed ? (
                  <ChevronDown className="h-5 w-5" />
                ) : (
                  <ChevronUp className="h-5 w-5" />
                )}
              </button>
              <div 
                {...attributes} 
                {...listeners} 
                className="cursor-grab active:cursor-grabbing p-1 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <GripVertical className="h-5 w-5" />
              </div>
            </div>
          </div>
          
          {!isCollapsed && (
            <CardDescription className="mt-1 text-xs text-gray-500">{description}</CardDescription>
          )}
        </CardHeader>
        
        {!isCollapsed && (
          <AnimatePresence>
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col flex-grow"
            >
              <CardContent className="p-4 flex-grow">
                {children}
              </CardContent>
              
              {footerContent && (
                <CardFooter className="p-3 pt-0 mt-auto">
                  {footerContent}
                </CardFooter>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </Card>
    </div>
  );
};

export default BaseCard;
