import { useState, useEffect } from 'react';
import { DashboardPreferences } from '@/lib/dashboard/types';
import { apiClient } from '@/lib/utils/api-client';
import { toast } from 'sonner';

export function useDashboardPreferences() {
  const [dashboardLayout, setDashboardLayout] = useState<DashboardPreferences | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const loadPreferences = async () => {
      setIsLoading(true);
      try {
        const response = await apiClient.get<DashboardPreferences>('/admin/api/dashboard/preferences');
        setDashboardLayout(response);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('설정 로드 실패'));
      } finally {
        setIsLoading(false);
      }
    };

    loadPreferences();
  }, []);

  const updateDashboardLayout = async (preferences: DashboardPreferences) => {
    setIsUpdating(true);
    try {
      const preferencesCopy = {
        cardOrder: [...preferences.cardOrder],
        visibleCards: [...preferences.visibleCards],
        collapsedCards: [...preferences.collapsedCards]
      };
      
      const response = await apiClient.put<{success: boolean; message: string; data: DashboardPreferences}>(
        '/admin/api/dashboard/preferences',
        preferencesCopy
      );
      
      if (response.success) {
        setDashboardLayout(response.data);
        return true;
      } else {
        throw new Error(response.message || '설정 저장 실패');
      }
    } catch (err) {
      toast.error('설정을 저장하는데 실패했습니다');
      throw err;
    } finally {
      setIsUpdating(false);
    }
  };

  return {
    dashboardLayout,
    isLoading,
    isUpdating,
    error,
    updateDashboardLayout
  };
}
