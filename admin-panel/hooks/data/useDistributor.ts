// hooks/data/useDistributor.ts
"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DistributorResponse,
  DistributorCreate,
  DistributorUpdate,
  DistributorListItemResponse,
  DistributorStats
} from '@/types/distributor';
import { toast } from 'sonner';
import { apiClient } from '@/lib/utils/api-client';

// API 호출 함수
const distributorsApi = {
  list: async (params?: any): Promise<DistributorListItemResponse[]> => {
    const queryParams = new URLSearchParams();
    if (params?.search) queryParams.append('search', params.search);
    if (params?.skip) queryParams.append('skip', params.skip.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const url = `/admin/api/distributors${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return apiClient.get(url);
  },

  getById: async (id: number): Promise<DistributorResponse> => {
    return apiClient.get(`/admin/api/distributors/${id}`);
  },

  create: async (data: DistributorCreate): Promise<DistributorResponse> => {
    return apiClient.post('/admin/api/distributors', data);
  },

  update: async ({ id, data }: { id: number, data: DistributorUpdate }): Promise<DistributorResponse> => {
    console.log("API로 전송할 업데이트 데이터:", JSON.stringify(data, null, 2));

    // camelCase → snake_case 변환 (담당자 정보)
    const transformedData = {
      ...data,
      contacts: data.contacts?.map(contact => ({
        ...contact,
        id: contact.id,
        name: contact.name,
        position: contact.position,
        department: contact.department,
        email: contact.email,
        is_primary: contact.isPrimary,
        office_phone: contact.officePhone,
        mobile_phone: contact.mobilePhone,
        notes: contact.notes,
        // 원래 필드 제거
        isPrimary: undefined,
        officePhone: undefined,
        mobilePhone: undefined
      }))
    };

    return apiClient.put(`/admin/api/distributors/${id}`, transformedData);
  },

  delete: async (id: number): Promise<void> => {
    return apiClient.delete(`/admin/api/distributors/${id}`);
  },

  // 통계 정보 가져오기 함수 추가
  getStats: async (): Promise<DistributorStats> => {
    return apiClient.get('/admin/api/distributors/stats');
  }
};

// 훅 정의
export function useDistributors(params?: any) {
  return useQuery({
    queryKey: ['distributors', params],
    queryFn: () => distributorsApi.list(params),
    staleTime: 5 * 60 * 1000,
  });
}

export function useDistributor(id: number) {
  return useQuery({
    queryKey: ['distributors', id],
    queryFn: () => distributorsApi.getById(id),
    enabled: !!id,
  });
}

// 배급사 통계 정보를 가져오는 훅 추가
export function useDistributorStats() {
  return useQuery({
    queryKey: ['distributors', 'stats'],
    queryFn: distributorsApi.getStats,
    staleTime: 5 * 60 * 1000, // 5분 동안 캐시
  });
}

export function useCreateDistributor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: distributorsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['distributors'] });
      toast.success('성공적으로 등록되었습니다.');
    },
    onError: (error: any) => {
      toast.error(`등록 실패: ${error.message}`);
    }
  });
}

export function useUpdateDistributor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: distributorsApi.update,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['distributors'] });
      toast.success('수정되었습니다.');
    },
    onError: (error: any) => {
      toast.error(`수정 실패: ${error.message}`);
    }
  });
}

export function useDeleteDistributor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: distributorsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['distributors'] });
      toast.success('삭제되었습니다.');
    },
    onError: (error: any) => {
      toast.error(`삭제 실패: ${error.message}`);
    }
  });
}
