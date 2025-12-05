// /hooks/data/useScriptwriterStats.ts
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/utils/api-client';

interface ScriptwriterStats {
  totalADWriters: number;
  totalCCWriters: number;
}

export const useScriptwriterStats = () => {
  return useQuery({
    queryKey: ['scriptwriterStats'],
    queryFn: async () => {
      return await apiClient.get<ScriptwriterStats>('/admin/api/dashboard/scriptwriter-stats');
    },
    staleTime: 1000 * 60 * 5, // 5분
  });
};
