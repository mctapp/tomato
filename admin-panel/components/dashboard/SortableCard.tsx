// components/dashboard/SortableCard.tsx
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { GripVertical, ChevronUp, ChevronDown } from 'lucide-react';
import { useDashboard } from './DashboardContext';

interface SortableCardProps {
  card: {
    id: string;
    title: string;
    component: React.ComponentType<any>;
  };
  isCollapsed: boolean;
}

export default function SortableCard({ card, isCollapsed }: SortableCardProps) {
  const { toggleCardCollapse } = useDashboard();
  
  const { 
    attributes, 
    listeners, 
    setNodeRef, 
    transform, 
    transition 
  } = useSortable({ id: card.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const CardComponent = card.component;

  return (
    <div ref={setNodeRef} style={style}>
      <Card className="h-full">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-medium">{card.title}</CardTitle>
          <div className="flex items-center space-x-2">
            <button 
              onClick={() => toggleCardCollapse(card.id)}
              className="p-1 rounded-md hover:bg-gray-100"
            >
              {isCollapsed ? (
                <ChevronDown className="h-5 w-5" />
              ) : (
                <ChevronUp className="h-5 w-5" />
              )}
            </button>
            <div {...attributes} {...listeners} className="cursor-grab">
              <GripVertical className="h-5 w-5 text-gray-400" />
            </div>
          </div>
        </CardHeader>
        
        {!isCollapsed && (
          <CardContent>
            <CardComponent />
          </CardContent>
        )}
      </Card>
    </div>
  );
}
