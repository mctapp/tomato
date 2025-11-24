// components/dashboard/core/Dashboard.tsx
import { useEffect, useState } from 'react';
import { Loader2, GripVertical, Settings } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { DashboardGrid } from './DashboardGrid';
import { UserData, DashboardPreferences, CardDefinition } from '@/lib/dashboard/types';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/utils/api-client';
import { getAvailableCards } from '@/lib/dashboard/registry';

export const Dashboard = () => {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [cards, setCards] = useState<CardDefinition[]>([]);
  const [visibleCards, setVisibleCards] = useState<string[]>([]);
  const [currentTime, setCurrentTime] = useState<string>('');

  // 현재 시간 업데이트 
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      };
      setCurrentTime(now.toLocaleDateString('ko-KR', options));
    };
    
    updateTime();
    const timerId = setInterval(updateTime, 1000);
    
    return () => clearInterval(timerId);
  }, []);

  // 사용자 데이터와 대시보드 설정 로드
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // 사용자 정보 로드
        const userData = await apiClient.get<UserData>('/api/auth/me');
        setUser(userData);
        
        // 사용자 설정 로드
        const preferences = await apiClient.get<DashboardPreferences>('/admin/api/dashboard/preferences');
        
        // 카드 정의 가져오기
        const availableCards = getAvailableCards(userData.role);
        
        // 카드 순서와 가시성 적용
        const orderedCards = preferences.cardOrder
          .map(id => availableCards.find(card => card.id === id))
          .filter(Boolean) as CardDefinition[];
          
        // 새 카드 추가
        availableCards.forEach(card => {
          if (!orderedCards.some(c => c.id === card.id)) {
            orderedCards.push(card);
          }
        });
        
        setVisibleCards(preferences.visibleCards);
        setCards(orderedCards);
      } catch (error) {
        console.error('데이터 로드 실패:', error);
        toast.error('대시보드 데이터를 불러오는데 실패했습니다');
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [router]);

  if (loading) {
    return (
      <div className="max-w-[1200px] mx-auto py-10 h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#ff6246] mr-2" />
        <span className="text-xl font-medium text-[#333333]">로딩 중...</span>
      </div>
    );
  }

  // 표시할 카드만 필터링
  const filteredCards = cards.filter(card => visibleCards.includes(card.id));

  return (
    <div className="max-w-[1200px] mx-auto py-10">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-[#333333] mb-2">
            <span className="text-[#ff6246]">TOMATO FARM</span>
          </h1>
          <p className="text-sm text-gray-500">미디어센터내일 접근성 관리 시스템</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-white p-2 rounded-lg shadow-sm border border-gray-300">
            <div className="flex items-center">
              <GripVertical className="h-4 w-4 mr-1 text-gray-400" />
              <span className="text-sm text-gray-500">{currentTime}</span>
            </div>
          </div>
          <Link href="/dashboard/settings">
            <Button 
              variant="outline" 
              className="w-10 h-10 p-0"
              title="대시보드 설정"
            >
              <Settings className="h-5 w-5" />
            </Button>
          </Link>
        </div>
      </div>
      
      <DashboardGrid>
        {filteredCards.length > 0 ? (
          filteredCards.map((card) => (
            <div key={card.id}>
              {card.component && <card.component />}
            </div>
          ))
        ) : (
          <div className="col-span-full text-center p-8 bg-gray-50 rounded-lg">
            <p className="text-gray-500">표시할 카드가 없습니다. 설정에서 카드를 활성화하세요.</p>
          </div>
        )}
      </DashboardGrid>
    </div>
  );
};

export default Dashboard;
