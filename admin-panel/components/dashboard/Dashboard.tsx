// components/dashboard/Dashboard.tsx
import { useEffect, useMemo, useState } from 'react';
import { 
  DndContext, 
  DragEndEvent, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors
} from '@dnd-kit/core';
import { 
  SortableContext, 
  rectSortingStrategy,
  sortableKeyboardCoordinates
} from '@dnd-kit/sortable';
import { useDashboard } from './core/DashboardContext';
import { getAvailableCards } from '@/lib/dashboard/registry';
import { Loader, Settings, Save, Calendar, Clock, ArrowRight } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { UserData, Role } from '@/types/auth';
import Link from 'next/link';
import { toast } from 'sonner';

export default function Dashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const { 
    cards, 
    visibleCards, 
    collapsedCards, 
    isLoading: dashboardLoading, 
    reorderCards,
    toggleCardCollapse,
    initializeDashboard,
    savePreferences
  } = useDashboard();

  const [currentTime, setCurrentTime] = useState(new Date());
  const [showHiddenLink, setShowHiddenLink] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    if (user?.id && user?.email && user?.username && user?.role) {
      const userData: UserData = {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        fullName: user.username || null,
        isActive: true,
        isAdmin: user.role === Role.ADMIN || user.role === Role.SUPER_ADMIN
      };
      initializeDashboard(userData);
    }
  }, [user, initializeDashboard]);

  const availableCardDefinitions = useMemo(() => {
    return user?.role ? getAvailableCards(user.role) : [];
  }, [user?.role]);

  const visibleCardItems = useMemo(() => {
    return cards
      .filter(card => visibleCards.includes(card.id))
      .map(dashboardCard => {
        const cardDefinition = availableCardDefinitions.find(def => def.id === dashboardCard.id);
        return cardDefinition || {
          id: dashboardCard.id,
          title: dashboardCard.title,
          type: dashboardCard.type,
          description: '',
          component: () => <div>{dashboardCard.content}</div>,
          defaultVisible: true,
          icon: undefined
        };
      });
  }, [cards, visibleCards, availableCardDefinitions]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeId = active.id.toString();
    const overId = over.id.toString();
    const currentCardIds = visibleCardItems.map(card => card.id);
    
    const oldIndex = currentCardIds.indexOf(activeId);
    const newIndex = currentCardIds.indexOf(overId);
    
    if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
      const newCardOrder = [...currentCardIds];
      const [movedCard] = newCardOrder.splice(oldIndex, 1);
      newCardOrder.splice(newIndex, 0, movedCard);
      
      const allCards = cards.map(card => card.id);
      const finalOrder = [...newCardOrder, ...allCards.filter(id => !visibleCards.includes(id))];
      
      reorderCards(finalOrder);
      try {
        await savePreferences();
      } catch (error) {
        console.error('카드 순서 저장 실패:', error);
      }
    }
  };

  const handleSavePreferences = async () => {
    try {
      await savePreferences();
      toast.success('대시보드 설정을 저장했습니다.');
    } catch (error) {
      toast.error('설정 저장에 실패했습니다.');
    }
  };

  const formatDate = (date: Date) => {
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const dayOfWeek = days[date.getDay()];
    return `${year}.${month.toString().padStart(2, '0')}.${day.toString().padStart(2, '0')} (${dayOfWeek})`;
  };

  const formatTime = (date: Date) => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  if (authLoading || dashboardLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader className="w-8 h-8 animate-spin text-[#ff6246]" />
        <span className="ml-2">대시보드를 불러오는 중...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <span>사용자 정보를 불러올 수 없습니다.</span>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="max-w-[1200px] mx-auto py-10">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#ff6246]">Tomato Farm</h1>
            <p className="text-sm text-[#666666] mt-1">미디어센터내일 접근성 영화 관리 시스템</p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 text-[#666666]">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4 text-[#4da34c]" />
                <span className="text-sm font-medium">{formatDate(currentTime)}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4 text-[#4da34c]" />
                <span className="text-sm font-medium">{formatTime(currentTime)}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Link href="/dashboard/settings">
                <button className="p-2 rounded-lg border border-gray-300 bg-white hover:bg-[#f5fbf5] hover:border-[#4da34c] text-gray-600 hover:text-[#4da34c] transition-all duration-200">
                  <Settings className="h-5 w-5" />
                </button>
              </Link>
              
              <button 
                onClick={handleSavePreferences}
                className="p-2 rounded-lg border border-gray-300 bg-transparent text-gray-500 hover:bg-[#fff5f3] hover:text-[#ff6246] hover:border-[#ff6246] transition-colors"
              >
                <Save className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
        
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={visibleCardItems.map(card => card.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {visibleCardItems.length > 0 ? (
                visibleCardItems.map(card => {
                  const Component = card.component;
                  return Component ? <Component key={card.id} /> : null;
                })
              ) : (
                <div className="col-span-full text-center p-8 border-2 border-dashed border-gray-300 rounded-lg">
                  <p className="text-gray-500">표시할 카드가 없습니다.</p>
                  <p className="text-sm text-gray-400 mt-2">
                    <Link href="/dashboard/settings" className="text-[#ff6246] hover:text-[#c75146] hover:underline">
                      대시보드 설정
                    </Link>에서 카드를 활성화하세요.
                  </p>
                </div>
              )}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      {/* 히든 호버 영역 - 화면 우측 (FAB 포함) */}
      <div 
        className="fixed right-0 top-0 bottom-0 w-32 z-40"
        onMouseEnter={() => setShowHiddenLink(true)}
        onMouseLeave={() => setShowHiddenLink(false)}
      >
        {/* FAB 스타일 제작관리 버튼 */}
        <Link 
          href="/production"
          className={`
            absolute bottom-8 right-8
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
            bg-gradient-to-br from-[#ff6246] to-[#c75146]
            shadow-lg
            flex items-center justify-center
            transition-shadow duration-300
            hover:shadow-xl
            relative
          `}>
            <ArrowRight className="h-6 w-6 text-white" />
          </div>
          
          {/* 라벨 툴팁 */}
          <div className={`
            absolute right-0 bottom-full mb-2
            px-3 py-1.5 bg-gray-900 text-white text-xs rounded-lg
            whitespace-nowrap
            transition-opacity duration-300
            opacity-0 group-hover:opacity-90
            pointer-events-none
          `}>
            제작관리
            <div className="absolute left-1/2 -translate-x-1/2 -bottom-1 
                          w-2 h-2 bg-gray-900 rotate-45" />
          </div>
        </Link>
      </div>
    </div>
  );
}
