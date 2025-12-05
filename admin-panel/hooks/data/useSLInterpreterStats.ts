// /hooks/data/useSLInterpreterStats.ts
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/utils/api-client';

interface SLInterpreterStats {
  totalInterpreters: number;
  totalSamples: number;
}

export const useSLInterpreterStats = () => {
  return useQuery({
    queryKey: ['slInterpreterStats'],
    queryFn: async () => {
      return await apiClient.get<SLInterpreterStats>('/admin/api/dashboard/sl-interpreter-stats');
    },
    staleTime: 1000 * 60 * 5, // 5분
  });
};
