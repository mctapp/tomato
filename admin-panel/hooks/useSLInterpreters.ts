// hooks/useSLInterpreters.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { 
  SLInterpreter, 
  SLInterpreterSample, 
  SLInterpreterSummary,
  SLInterpreterFormData,
  SLInterpreterSampleFormData,
  isSLInterpreter,
  isSLInterpreterSummary,
  isSLInterpreterSample
} from '@/types/slinterpreters';
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

interface PaginatedSLInterpreters {
  data: SLInterpreterSummary[];
  pagination: PaginationMeta;
}

// API 응답 타입 검증
const validateSLInterpretersResponse = (data: unknown): SLInterpreterSummary[] => {
  if (!isValidArray(data)) {
    throw new Error('Invalid API response: expected array');
  }
  
  const validatedData = data.filter(isSLInterpreterSummary);
  if (validatedData.length !== data.length) {
    console.warn('Some items in API response were invalid and filtered out');
  }
  
  return validatedData;
};

const validateSLInterpreterResponse = (data: unknown): SLInterpreter => {
  if (!isSLInterpreter(data)) {
    throw new Error('Invalid API response: not a valid SLInterpreter');
  }
  return data;
};

const validateSLInterpreterSampleResponse = (data: unknown): SLInterpreterSample => {
  if (!isSLInterpreterSample(data)) {
    throw new Error('Invalid API response: not a valid SLInterpreterSample');
  }
  return data;
};

// 수어통역사 목록 조회 훅
export const useSLInterpreters = (params?: {
  keyword?: string;
  skillLevels?: string;
  signLanguages?: string;
  genders?: string;
  page?: number;
  limit?: number;
}) => {
  return useQuery({
    queryKey: ['slInterpreters', params],
    queryFn: async (): Promise<PaginatedSLInterpreters> => {
      const queryParams = new URLSearchParams();
      
      if (params?.keyword) {
        queryParams.append('keyword', params.keyword);
      }
      
      if (params?.skillLevels) {
        queryParams.append('skillLevels', params.skillLevels);
      }
      
      if (params?.signLanguages) {
        queryParams.append('signLanguages', params.signLanguages);
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
      
      console.log('API 요청 URL:', `/admin/api/slinterpreters?${queryParams.toString()}`);
      
      const response = await api.get(`/admin/api/slinterpreters?${queryParams.toString()}`);
      
      console.log('API 응답:', response.data);
      
      // 새로운 페이지네이션 응답 구조 처리
      if (response.data.data && response.data.pagination) {
        return {
          data: validateSLInterpretersResponse(response.data.data),
          pagination: response.data.pagination
        };
      }
      
      // 이전 구조 호환성 (배열만 오는 경우)
      if (Array.isArray(response.data)) {
        const data = validateSLInterpretersResponse(response.data);
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

// 수어통역사 상세 조회 훅
export const useSLInterpreter = (id: number) => {
  return useQuery({
    queryKey: ['slInterpreter', id],
    queryFn: async (): Promise<SLInterpreter> => {
      console.log("API 요청 - SL 수어통역사 상세 조회:", id);
      const response = await api.get(`/admin/api/slinterpreters/${id}`);
      console.log("API 응답 - SL 수어통역사 상세:", response.data);
      return validateSLInterpreterResponse(response.data);
    },
    retry: 1,
    enabled: !!id && id > 0,
    staleTime: 60000, // 1분
  });
};

// 수어통역사 생성 훅
export const useCreateSLInterpreter = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: SLInterpreterFormData): Promise<SLInterpreter> => {
      console.log("API 요청 데이터 (camelCase):", data);
      
      // BaseSchema가 자동 변환하므로 camelCase 그대로 전송
      const response = await api.post('/admin/api/slinterpreters', data);
      return validateSLInterpreterResponse(response.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['slInterpreters'] });
    },
    onError: (error) => {
      console.error("수어통역사 생성 오류:", error);
    }
  });
};

// 수어통역사 수정 훅
export const useUpdateSLInterpreter = (id: number) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: Partial<SLInterpreterFormData>): Promise<SLInterpreter> => {
      console.log("API 요청 데이터 (camelCase):", data);
      
      // BaseSchema가 자동 변환하므로 camelCase 그대로 전송
      const response = await api.put(`/admin/api/slinterpreters/${id}`, data);
      return validateSLInterpreterResponse(response.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['slInterpreters'] });
      queryClient.invalidateQueries({ queryKey: ['slInterpreter', id] });
    },
    onError: (error) => {
      console.error("수어통역사 수정 오류:", error);
    }
  });
};

// 수어통역사 삭제 훅
export const useDeleteSLInterpreter = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: number): Promise<void> => {
      await api.delete(`/admin/api/slinterpreters/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['slInterpreters'] });
    },
    onError: (error) => {
      console.error("수어통역사 삭제 오류:", error);
    }
  });
};

// 프로필 이미지 업로드 훅
export const useUploadSLInterpreterProfileImage = (id: number) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (file: File): Promise<{ profileImage: string }> => {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await api.post(
        `/admin/api/slinterpreters/${id}/profile-image`,
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
      queryClient.invalidateQueries({ queryKey: ['slInterpreter', id] });
      queryClient.invalidateQueries({ queryKey: ['slInterpreters'] });
    },
    onError: (error) => {
      console.error("프로필 이미지 업로드 오류:", error);
    }
  });
};

// 샘플 생성 훅
export const useCreateSLInterpreterSample = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      slInterpreterId,
      sampleData,
    }: {
      slInterpreterId: number;
      sampleData: SLInterpreterSampleFormData;
    }): Promise<SLInterpreterSample> => {
      console.log("API 요청 - SL 샘플 메타데이터 생성:", sampleData);
      
      const response = await api.post(
        `/admin/api/slinterpreters/${slInterpreterId}/samples`,
        sampleData
      );
      
      return validateSLInterpreterSampleResponse(response.data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['slInterpreter', variables.slInterpreterId],
      });
    },
    onError: (error) => {
      console.error("SL 샘플 생성 오류:", error);
    }
  });
};

// 샘플 파일 업로드 훅
export const useUploadSLInterpreterSampleFile = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      slInterpreterId,
      sampleId,
      file,
    }: {
      slInterpreterId: number;
      sampleId: number;
      file: File;
    }): Promise<SLInterpreterSample> => {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await api.post(
        `/admin/api/slinterpreters/${slInterpreterId}/samples/${sampleId}/file`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      
      return validateSLInterpreterSampleResponse(response.data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['slInterpreter', variables.slInterpreterId],
      });
    },
    onError: (error) => {
      console.error("SL 샘플 파일 업로드 오류:", error);
    }
  });
};

// 샘플 삭제 훅
export const useDeleteSLInterpreterSample = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      slInterpreterId,
      sampleId,
    }: {
      slInterpreterId: number;
      sampleId: number;
    }): Promise<void> => {
      await api.delete(
        `/admin/api/slinterpreters/${slInterpreterId}/samples/${sampleId}`
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['slInterpreter', variables.slInterpreterId],
      });
    },
    onError: (error) => {
      console.error("SL 샘플 삭제 오류:", error);
    }
  });
};
