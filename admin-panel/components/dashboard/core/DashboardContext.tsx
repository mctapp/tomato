// components/dashboard/core/DashboardContext.tsx
import { 
  createContext, useContext, useReducer, ReactNode, 
  useCallback, useEffect, useRef 
} from 'react';
import { DashboardState, DashboardPreferences, UserData, DashboardCard } from '@/lib/dashboard/types';
import { getAvailableCards } from '@/lib/dashboard/registry';
import { STORAGE_KEYS } from '@/lib/dashboard/constants';
import { apiClient } from '@/lib/utils/api-client';

// 초기 상태
const initialState: DashboardState = {
  cards: [],
  visibleCards: [],
  collapsedCards: [],
  isLoading: true,
  error: null
};

// 액션 타입
type Action = 
  | { type: 'SET_CARDS'; payload: DashboardCard[] }
  | { type: 'SET_VISIBLE_CARDS'; payload: string[] }
  | { type: 'SET_COLLAPSED_CARDS'; payload: string[] }
  | { type: 'TOGGLE_CARD_COLLAPSE'; payload: { cardId: string; isCollapsed?: boolean } }
  | { type: 'TOGGLE_CARD_VISIBILITY'; payload: string }
  | { type: 'REORDER_CARDS'; payload: string[] }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null };

// 리듀서
const dashboardReducer = (state: DashboardState, action: Action): DashboardState => {
  switch (action.type) {
    case 'SET_CARDS':
      return { ...state, cards: action.payload };
    case 'SET_VISIBLE_CARDS':
      return { ...state, visibleCards: action.payload };
    case 'SET_COLLAPSED_CARDS':
      return { ...state, collapsedCards: action.payload };
    case 'TOGGLE_CARD_COLLAPSE': {
      const { cardId, isCollapsed } = action.payload;
      const newCollapsedCards = isCollapsed !== undefined
        ? isCollapsed 
          ? state.collapsedCards.filter(id => id !== cardId)
          : [...state.collapsedCards, cardId]
        : state.collapsedCards.includes(cardId)
          ? state.collapsedCards.filter(id => id !== cardId)
          : [...state.collapsedCards, cardId];
      
      return { ...state, collapsedCards: newCollapsedCards };
    }
    case 'TOGGLE_CARD_VISIBILITY': {
      const cardId = action.payload;
      const newVisibleCards = state.visibleCards.includes(cardId)
        ? state.visibleCards.filter(id => id !== cardId)
        : [...state.visibleCards, cardId];
      
      return { ...state, visibleCards: newVisibleCards };
    }
    case 'REORDER_CARDS': {
      const cardOrder = action.payload;
      const reorderedCards = [...state.cards].sort((a, b) => {
        const aIndex = cardOrder.indexOf(a.id);
        const bIndex = cardOrder.indexOf(b.id);
        return aIndex - bIndex;
      });
      
      return { ...state, cards: reorderedCards };
    }
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    default:
      return state;
  }
};

// 컨텍스트 생성
interface DashboardContextValue extends DashboardState {
  toggleCardCollapse: (cardId: string, isCollapsed?: boolean) => void;
  toggleCardVisibility: (cardId: string) => void;
  reorderCards: (cardIds: string[]) => void;
  initializeDashboard: (user: UserData) => void;
  savePreferences: () => Promise<boolean>;
}

const DashboardContext = createContext<DashboardContextValue | undefined>(undefined);

// 프로바이더 컴포넌트
export const DashboardProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(dashboardReducer, initialState);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasSavedRef = useRef<boolean>(false);
  
  // 대시보드 초기화
  const initializeDashboard = useCallback((user: UserData) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      // API에서 설정 로드
      const loadDashboardPreferences = async () => {
        try {
          const prefs = await apiClient.get<DashboardPreferences>('/admin/api/dashboard/preferences');
          
          // 사용자 권한에 맞는 카드 가져오기
          const availableCards = getAvailableCards(user.role);
          
          // 카드 인스턴스 생성
          const cardInstances = availableCards.map(cardDef => ({
            id: cardDef.id,
            title: cardDef.title,
            type: cardDef.type,
            content: cardDef.component ? <cardDef.component /> : null,
            visible: cardDef.defaultVisible
          }));
          
          // 서버에서 불러온 순서로 카드 재정렬
          const orderedCards = prefs.cardOrder
            .map(id => cardInstances.find(card => card.id === id))
            .filter(Boolean) as DashboardCard[];
          
          // 새 카드 추가
          cardInstances.forEach(card => {
            if (!orderedCards.some(c => c.id === card.id)) {
              orderedCards.push(card);
            }
          });
          
          dispatch({ type: 'SET_CARDS', payload: orderedCards });
          dispatch({ type: 'SET_VISIBLE_CARDS', payload: prefs.visibleCards });
          dispatch({ type: 'SET_COLLAPSED_CARDS', payload: prefs.collapsedCards });
          dispatch({ type: 'SET_LOADING', payload: false });
        } catch (error) {
          console.error('Dashboard preferences load error:', error);
          
          // 기본값 설정
          const availableCards = getAvailableCards(user.role);
          const defaultCardOrder = availableCards.map(card => card.id);
          
          dispatch({ type: 'SET_CARDS', payload: availableCards.map(cardDef => ({
            id: cardDef.id,
            title: cardDef.title,
            type: cardDef.type,
            content: cardDef.component ? <cardDef.component /> : null,
            visible: cardDef.defaultVisible
          }))});
          dispatch({ type: 'SET_VISIBLE_CARDS', payload: defaultCardOrder });
          dispatch({ type: 'SET_COLLAPSED_CARDS', payload: [] });
          dispatch({ type: 'SET_ERROR', payload: '설정을 불러오는데 실패했습니다' });
          dispatch({ type: 'SET_LOADING', payload: false });
        }
      };
      
      loadDashboardPreferences();
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: '대시보드를 불러오는데 실패했습니다' });
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);
  
  // 카드 접기/펼치기 토글
  const toggleCardCollapse = useCallback((cardId: string, isCollapsed?: boolean) => {
    dispatch({ type: 'TOGGLE_CARD_COLLAPSE', payload: { cardId, isCollapsed } });
  }, []);
  
  // 카드 가시성 토글
  const toggleCardVisibility = useCallback((cardId: string) => {
    dispatch({ type: 'TOGGLE_CARD_VISIBILITY', payload: cardId });
  }, []);
  
  // 카드 순서 변경
  const reorderCards = useCallback((cardIds: string[]) => {
    dispatch({ type: 'REORDER_CARDS', payload: cardIds });
    
    // localStorage 제거 - 서버에만 저장
  }, []);
  
  // 현재 상태를 서버에 저장
  const savePreferences = useCallback(async () => {
    try {
      // 상태 캡처
      const cardIds = state.cards.map(card => card.id);
      const visCards = [...state.visibleCards];
      const collCards = [...state.collapsedCards];
      
      // API로 보낼 데이터
      const preferences: DashboardPreferences = {
        cardOrder: cardIds,
        visibleCards: visCards,
        collapsedCards: collCards
      };
      
      // 서버에 저장
      await apiClient.put('/admin/api/dashboard/preferences', preferences);
      
      // localStorage 백업 제거 - 서버에만 의존
      
      hasSavedRef.current = true;
      return true;
    } catch (error) {
      console.error('Dashboard preferences save error:', error);
      return false;
    }
  }, [state.cards, state.visibleCards, state.collapsedCards]);
  
  // 디바운스 저장
  useEffect(() => {
    if (state.isLoading || state.cards.length === 0) return;
    
    // localStorage 업데이트 제거 - 서버에만 저장
    
    // 자동 저장 디바운싱
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(() => {
      if (hasSavedRef.current) return;
      savePreferences();
    }, 5000); // 5초 디바운스
    
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [state.collapsedCards, state.visibleCards, state.isLoading, state.cards.length, savePreferences]);
  
  const value = {
    ...state,
    toggleCardCollapse,
    toggleCardVisibility,
    reorderCards,
    initializeDashboard,
    savePreferences
  };
  
  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
};

// 커스텀 훅
export const useDashboard = () => {
  const context = useContext(DashboardContext);
  if (context === undefined) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
};
