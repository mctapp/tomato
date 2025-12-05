// /hooks/data/useStaffStats.ts
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/utils/api-client';

interface StaffStats {
  totalStaffs: number;
  totalProducers: number;
}

export const useStaffStats = () => {
  return useQuery({
    queryKey: ['staffStats'],
    queryFn: async () => {
      return await apiClient.get<StaffStats>('/admin/api/dashboard/staff-stats');
    },
    staleTime: 1000 * 60 * 5, // 5분
  });
};
