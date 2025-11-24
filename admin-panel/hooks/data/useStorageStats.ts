// hooks/data/useStorageStats.ts
import { useQuery } from '@tanstack/react-query';
import { StorageStats } from '@/types/storage';
import { apiClient } from '@/lib/utils/api-client';

export function useStorageStats() {
  return useQuery<StorageStats>({
    queryKey: ['storageStats'],
    queryFn: async () => {
      return apiClient.get<StorageStats>('/admin/api/uploads/stats');
    },
    refetchInterval: 5 * 60 * 1000, // 5분마다 자동 갱신
    staleTime: 2 * 60 * 1000, // 2분 동안 데이터 신선함 유지
  });
}
