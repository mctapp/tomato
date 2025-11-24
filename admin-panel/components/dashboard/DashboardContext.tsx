// components/dashboard/DashboardContext.tsx
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiClient } from '@/lib/utils/api-client';

type DashboardPreferences = {
  cardOrder: string[];
  visibleCards: string[];
  collapsedCards: string[];
};

type DashboardContextType = {
  cardOrder: string[];
  visibleCards: string[];
  collapsedCards: string[];
  isLoading: boolean;
  error: Error | null;
  updateCardOrder: (newOrder: string[]) => Promise<void>;
  toggleCardVisibility: (cardId: string) => Promise<void>;
  toggleCardCollapse: (cardId: string) => Promise<void>;
};

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<DashboardPreferences>({
    cardOrder: [],
    visibleCards: [],
    collapsedCards: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      setIsLoading(true);
      const data = await apiClient.get<DashboardPreferences>('/admin/api/dashboard/preferences');
      setPreferences(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      console.error('Error loading dashboard preferences:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const savePreferences = async (newPrefs: DashboardPreferences) => {
    try {
      await apiClient.put('/admin/api/dashboard/preferences', newPrefs);
      setPreferences(newPrefs);
    } catch (err) {
      console.error('Error saving dashboard preferences:', err);
      throw err;
    }
  };

  const updateCardOrder = async (newOrder: string[]) => {
    const newPrefs = {
      ...preferences,
      cardOrder: newOrder
    };
    await savePreferences(newPrefs);
  };

  const toggleCardVisibility = async (cardId: string) => {
    const visible = preferences.visibleCards.includes(cardId);
    const newVisibleCards = visible
      ? preferences.visibleCards.filter(id => id !== cardId)
      : [...preferences.visibleCards, cardId];
    
    const newPrefs = {
      ...preferences,
      visibleCards: newVisibleCards
    };
    await savePreferences(newPrefs);
  };

  const toggleCardCollapse = async (cardId: string) => {
    const collapsed = preferences.collapsedCards.includes(cardId);
    const newCollapsedCards = collapsed
      ? preferences.collapsedCards.filter(id => id !== cardId)
      : [...preferences.collapsedCards, cardId];
    
    const newPrefs = {
      ...preferences,
      collapsedCards: newCollapsedCards
    };
    await savePreferences(newPrefs);
  };

  return (
    <DashboardContext.Provider
      value={{
        cardOrder: preferences.cardOrder,
        visibleCards: preferences.visibleCards,
        collapsedCards: preferences.collapsedCards,
        isLoading,
        error,
        updateCardOrder,
        toggleCardVisibility,
        toggleCardCollapse
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (context === undefined) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
}
