// hooks/useStaffs.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  Staff,
  StaffPortfolio,
  StaffSummary,
  StaffFormData,
  StaffPortfolioFormData,
  StaffWorkLog,
  StaffWorkLogFormData,
  StaffAccessAsset,
  isStaff,
  isStaffSummary,
  isStaffPortfolio,
  isStaffWorkLog
} from '@/types/staffs';
import { isValidArray } from '@/lib/utils/personnel';

// 페이지네이션 응답 타입
interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

interface PaginatedStaffs {
  data: StaffSummary[];
  pagination: PaginationMeta;
}

// API 응답 타입 검증
const validateStaffsResponse = (data: unknown): StaffSummary[] => {
  if (!isValidArray(data)) {
    throw new Error('Invalid API response: expected array');
  }
  
  const validatedData = data.filter(isStaffSummary);
  if (validatedData.length !== data.length) {
    console.warn('Some items in API response were invalid and filtered out');
  }
  
  return validatedData;
};

const validateStaffResponse = (data: unknown): Staff => {
  if (!isStaff(data)) {
    throw new Error('Invalid API response: not a valid Staff');
  }
  return data;
};

const validateStaffPortfolioResponse = (data: unknown): StaffPortfolio => {
  if (!isStaffPortfolio(data)) {
    throw new Error('Invalid API response: not a valid StaffPortfolio');
  }
  return data;
};

const validateStaffWorkLogResponse = (data: unknown): StaffWorkLog => {
  if (!isStaffWorkLog(data)) {
    throw new Error('Invalid API response: not a valid StaffWorkLog');
  }
  return data;
};

// 스태프 목록 조회 훅
export const useStaffs = (params?: {
  keyword?: string;
  skillLevels?: string;
  roles?: string;
  genders?: string;
  page?: number;
  limit?: number;
}) => {
  return useQuery({
    queryKey: ['staffs', params],
    queryFn: async (): Promise<PaginatedStaffs> => {
      const queryParams = new URLSearchParams();
      
      if (params?.keyword) {
        queryParams.append('keyword', params.keyword);
      }
      
      if (params?.skillLevels) {
        queryParams.append('skillLevels', params.skillLevels);
      }
      
      if (params?.roles) {
        queryParams.append('roles', params.roles);
      }
      
      if (params?.genders) {
        queryParams.append('genders', params.genders);
      }
      
      if (params?.page) {
        queryParams.append('page', params.page.toString());
      }
      
      if (params?.limit) {
        queryParams.append('limit', params.limit.toString());
      }
      
      console.log('API 요청 URL:', `/admin/api/staffs?${queryParams.toString()}`);
      
      const response = await api.get(`/admin/api/staffs?${queryParams.toString()}`);
      
      console.log('API 응답:', response.data);
      
      // 페이지네이션 응답 구조 처리
      if (response.data.data && response.data.pagination) {
        return {
          data: validateStaffsResponse(response.data.data),
          pagination: response.data.pagination
        };
      }
      
      // 이전 구조 호환성 (배열만 오는 경우)
      if (Array.isArray(response.data)) {
        const data = validateStaffsResponse(response.data);
        return {
          data,
          pagination: {
            total: data.length,
            page: params?.page || 1,
            limit: params?.limit || 20,
            totalPages: Math.ceil(data.length / (params?.limit || 20)),
            hasNext: false,
            hasPrev: false
          }
        };
      }
      
      // 예상치 못한 구조인 경우 빈 결과 반환
      return {
        data: [],
        pagination: {
          total: 0,
          page: 1,
          limit: params?.limit || 20,
          totalPages: 0,
          hasNext: false,
          hasPrev: false
        }
      };
    },
    retry: 1,
    staleTime: 30000, // 30초
  });
};

// 스태프 상세 조회 훅
export const useStaff = (id: number) => {
  return useQuery({
    queryKey: ['staff', id],
    queryFn: async (): Promise<Staff> => {
      console.log("API 요청 - 스태프 상세 조회:", id);
      const response = await api.get(`/admin/api/staffs/${id}`);
      console.log("API 응답 - 스태프 상세:", response.data);
      return validateStaffResponse(response.data);
    },
    retry: 1,
    enabled: !!id && id > 0,
    staleTime: 60000, // 1분
  });
};

// 스태프 생성 훅
export const useCreateStaff = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: StaffFormData): Promise<Staff> => {
      console.log("API 요청 데이터 (camelCase):", data);
      
      const response = await api.post('/admin/api/staffs', data);
      return validateStaffResponse(response.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staffs'] });
    },
    onError: (error) => {
      console.error("스태프 생성 오류:", error);
    }
  });
};

// 스태프 수정 훅
export const useUpdateStaff = (id: number) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: Partial<StaffFormData>): Promise<Staff> => {
      console.log("API 요청 데이터 (camelCase):", data);
      
      const response = await api.put(`/admin/api/staffs/${id}`, data);
      return validateStaffResponse(response.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staffs'] });
      queryClient.invalidateQueries({ queryKey: ['staff', id] });
    },
    onError: (error) => {
      console.error("스태프 수정 오류:", error);
    }
  });
};

// 스태프 삭제 훅
export const useDeleteStaff = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: number): Promise<void> => {
      await api.delete(`/admin/api/staffs/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staffs'] });
    },
    onError: (error) => {
      console.error("스태프 삭제 오류:", error);
    }
  });
};

// 프로필 이미지 업로드 훅
export const useUploadStaffProfileImage = (id: number) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (file: File): Promise<{ profileImage: string }> => {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await api.post(
        `/admin/api/staffs/${id}/profile-image`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff', id] });
      queryClient.invalidateQueries({ queryKey: ['staffs'] });
    },
    onError: (error) => {
      console.error("프로필 이미지 업로드 오류:", error);
    }
  });
};

// 작업로그 생성 훅
export const useCreateStaffWorkLog = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      staffId,
      workLogData,
    }: {
      staffId: number;
      workLogData: StaffWorkLogFormData;
    }): Promise<StaffWorkLog> => {
      console.log("API 요청 - 작업로그 생성:", workLogData);
      
      const response = await api.post(
        `/admin/api/staffs/${staffId}/work-logs`,
        workLogData
      );
      
      return validateStaffWorkLogResponse(response.data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['staff', variables.staffId],
      });
    },
    onError: (error) => {
      console.error("작업로그 생성 오류:", error);
    }
  });
};

// 작업로그 삭제 훅
export const useDeleteStaffWorkLog = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      staffId,
      workLogId,
    }: {
      staffId: number;
      workLogId: number;
    }): Promise<void> => {
      await api.delete(
        `/admin/api/staffs/${staffId}/work-logs/${workLogId}`
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['staff', variables.staffId],
      });
    },
    onError: (error) => {
      console.error("작업로그 삭제 오류:", error);
    }
  });
};

// 대표작 생성 훅
export const useCreateStaffPortfolio = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      staffId,
      portfolioData,
    }: {
      staffId: number;
      portfolioData: StaffPortfolioFormData;
    }): Promise<StaffPortfolio> => {
      console.log("API 요청 - 대표작 생성:", portfolioData);
      
      const response = await api.post(
        `/admin/api/staffs/${staffId}/portfolios`,
        portfolioData
      );
      
      return validateStaffPortfolioResponse(response.data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['staff', variables.staffId],
      });
    },
    onError: (error) => {
      console.error("대표작 생성 오류:", error);
    }
  });
};

// 포스터 이미지 업로드 훅
export const useUploadStaffPosterImage = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      staffId,
      portfolioId,
      file,
    }: {
      staffId: number;
      portfolioId: number;
      file: File;
    }): Promise<{ posterImage: string }> => {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await api.post(
        `/admin/api/staffs/${staffId}/portfolios/${portfolioId}/poster-image`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['staff', variables.staffId],
      });
    },
    onError: (error) => {
      console.error("포스터 이미지 업로드 오류:", error);
    }
  });
};

// 크레디트 이미지 업로드 훅
export const useUploadStaffCreditImage = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      staffId,
      portfolioId,
      file,
    }: {
      staffId: number;
      portfolioId: number;
      file: File;
    }): Promise<{ creditImage: string }> => {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await api.post(
        `/admin/api/staffs/${staffId}/portfolios/${portfolioId}/credit-image`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['staff', variables.staffId],
      });
    },
    onError: (error) => {
      console.error("크레디트 이미지 업로드 오류:", error);
    }
  });
};

// 대표작 삭제 훅
export const useDeleteStaffPortfolio = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      staffId,
      portfolioId,
    }: {
      staffId: number;
      portfolioId: number;
    }): Promise<void> => {
      await api.delete(
        `/admin/api/staffs/${staffId}/portfolios/${portfolioId}`
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['staff', variables.staffId],
      });
    },
    onError: (error) => {
      console.error("대표작 삭제 오류:", error);
    }
  });
};

// 스태프가 참여한 접근성 미디어 자산 목록 조회
export const useStaffAccessAssets = (staffId: number) => {
  return useQuery<StaffAccessAsset[]>({
    queryKey: ['staff', staffId, 'accessAssets'],
    queryFn: async () => {
      const response = await api.get(`/admin/api/staffs/${staffId}/access-assets`);
      return response.data;
    },
    enabled: !!staffId
  });
};
