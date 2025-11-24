// hooks/useScriptwriters.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { 
  Scriptwriter, 
  ScriptwriterSample, 
  ScriptwriterSummary,
  ScriptwriterFormData,
  ScriptwriterSampleFormData,
  ScriptwriterWorkLog,
  ScriptwriterWorkLogFormData,
  isScriptwriter,
  isScriptwriterSummary,
  isScriptwriterSample,
  isScriptwriterWorkLog
} from '@/types/scriptwriters';
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

interface PaginatedScriptwriters {
  data: ScriptwriterSummary[];
  pagination: PaginationMeta;
}

// API 응답 타입 검증
const validateScriptwritersResponse = (data: unknown): ScriptwriterSummary[] => {
  if (!isValidArray(data)) {
    throw new Error('Invalid API response: expected array');
  }
  
  const validatedData = data.filter(isScriptwriterSummary);
  if (validatedData.length !== data.length) {
    console.warn('Some items in API response were invalid and filtered out');
  }
  
  return validatedData;
};

const validateScriptwriterResponse = (data: unknown): Scriptwriter => {
  if (!isScriptwriter(data)) {
    throw new Error('Invalid API response: not a valid Scriptwriter');
  }
  return data;
};

const validateScriptwriterSampleResponse = (data: unknown): ScriptwriterSample => {
  if (!isScriptwriterSample(data)) {
    throw new Error('Invalid API response: not a valid ScriptwriterSample');
  }
  return data;
};

const validateScriptwriterWorkLogResponse = (data: unknown): ScriptwriterWorkLog => {
  if (!isScriptwriterWorkLog(data)) {
    throw new Error('Invalid API response: not a valid ScriptwriterWorkLog');
  }
  return data;
};

// 해설작가 목록 조회 훅
export const useScriptwriters = (params?: {
  keyword?: string;
  skillLevels?: string;
  languages?: string;
  specialties?: string;
  genders?: string;
  page?: number;
  limit?: number;
}) => {
  return useQuery({
    queryKey: ['scriptwriters', params],
    queryFn: async (): Promise<PaginatedScriptwriters> => {
      const queryParams = new URLSearchParams();
      
      if (params?.keyword) {
        queryParams.append('keyword', params.keyword);
      }
      
      if (params?.skillLevels) {
        queryParams.append('skillLevels', params.skillLevels);
      }
      
      if (params?.languages) {
        queryParams.append('languages', params.languages);
      }
      
      if (params?.specialties) {
        queryParams.append('specialties', params.specialties);
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
      
      console.log('API 요청 URL:', `/admin/api/scriptwriters?${queryParams.toString()}`);
      
      const response = await api.get(`/admin/api/scriptwriters?${queryParams.toString()}`);
      
      console.log('API 응답:', response.data);
      
      // 페이지네이션 응답 구조 처리
      if (response.data.data && response.data.pagination) {
        return {
          data: validateScriptwritersResponse(response.data.data),
          pagination: response.data.pagination
        };
      }
      
      // 이전 구조 호환성 (배열만 오는 경우)
      if (Array.isArray(response.data)) {
        const data = validateScriptwritersResponse(response.data);
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

// 해설작가 상세 조회 훅
export const useScriptwriter = (id: number) => {
  return useQuery({
    queryKey: ['scriptwriter', id],
    queryFn: async (): Promise<Scriptwriter> => {
      console.log("API 요청 - 해설작가 상세 조회:", id);
      const response = await api.get(`/admin/api/scriptwriters/${id}`);
      console.log("API 응답 - 해설작가 상세:", response.data);
      return validateScriptwriterResponse(response.data);
    },
    retry: 1,
    enabled: !!id && id > 0,
    staleTime: 60000, // 1분
  });
};

// 해설작가 생성 훅
export const useCreateScriptwriter = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: ScriptwriterFormData): Promise<Scriptwriter> => {
      console.log("API 요청 데이터 (camelCase):", data);
      
      const response = await api.post('/admin/api/scriptwriters', data);
      return validateScriptwriterResponse(response.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scriptwriters'] });
    },
    onError: (error) => {
      console.error("해설작가 생성 오류:", error);
    }
  });
};

// 해설작가 수정 훅
export const useUpdateScriptwriter = (id: number) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: Partial<ScriptwriterFormData>): Promise<Scriptwriter> => {
      console.log("API 요청 데이터 (camelCase):", data);
      
      const response = await api.put(`/admin/api/scriptwriters/${id}`, data);
      return validateScriptwriterResponse(response.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scriptwriters'] });
      queryClient.invalidateQueries({ queryKey: ['scriptwriter', id] });
    },
    onError: (error) => {
      console.error("해설작가 수정 오류:", error);
    }
  });
};

// 해설작가 삭제 훅
export const useDeleteScriptwriter = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: number): Promise<void> => {
      await api.delete(`/admin/api/scriptwriters/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scriptwriters'] });
    },
    onError: (error) => {
      console.error("해설작가 삭제 오류:", error);
    }
  });
};

// 프로필 이미지 업로드 훅
export const useUploadScriptwriterProfileImage = (id: number) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (file: File): Promise<{ profileImage: string }> => {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await api.post(
        `/admin/api/scriptwriters/${id}/profile-image`,
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
      queryClient.invalidateQueries({ queryKey: ['scriptwriter', id] });
      queryClient.invalidateQueries({ queryKey: ['scriptwriters'] });
    },
    onError: (error) => {
      console.error("프로필 이미지 업로드 오류:", error);
    }
  });
};

// 작업로그 생성 훅
export const useCreateScriptwriterWorkLog = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      scriptwriterId,
      workLogData,
    }: {
      scriptwriterId: number;
      workLogData: ScriptwriterWorkLogFormData;
    }): Promise<ScriptwriterWorkLog> => {
      console.log("API 요청 - 작업로그 생성:", workLogData);
      
      const response = await api.post(
        `/admin/api/scriptwriters/${scriptwriterId}/work-logs`,
        workLogData
      );
      
      return validateScriptwriterWorkLogResponse(response.data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['scriptwriter', variables.scriptwriterId],
      });
    },
    onError: (error) => {
      console.error("작업로그 생성 오류:", error);
    }
  });
};

// 작업로그 삭제 훅
export const useDeleteScriptwriterWorkLog = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      scriptwriterId,
      workLogId,
    }: {
      scriptwriterId: number;
      workLogId: number;
    }): Promise<void> => {
      await api.delete(
        `/admin/api/scriptwriters/${scriptwriterId}/work-logs/${workLogId}`
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['scriptwriter', variables.scriptwriterId],
      });
    },
    onError: (error) => {
      console.error("작업로그 삭제 오류:", error);
    }
  });
};

// 대표해설 생성 훅
export const useCreateScriptwriterSample = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      scriptwriterId,
      sampleData,
    }: {
      scriptwriterId: number;
      sampleData: ScriptwriterSampleFormData;
    }): Promise<ScriptwriterSample> => {
      console.log("API 요청 - 대표해설 생성:", sampleData);
      
      const response = await api.post(
        `/admin/api/scriptwriters/${scriptwriterId}/samples`,
        sampleData
      );
      
      return validateScriptwriterSampleResponse(response.data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['scriptwriter', variables.scriptwriterId],
      });
    },
    onError: (error) => {
      console.error("대표해설 생성 오류:", error);
    }
  });
};

// 포스터 이미지 업로드 훅
export const useUploadScriptwriterPosterImage = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      scriptwriterId,
      sampleId,
      file,
    }: {
      scriptwriterId: number;
      sampleId: number;
      file: File;
    }): Promise<{ posterImage: string }> => {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await api.post(
        `/admin/api/scriptwriters/${scriptwriterId}/samples/${sampleId}/poster-image`,
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
        queryKey: ['scriptwriter', variables.scriptwriterId],
      });
    },
    onError: (error) => {
      console.error("포스터 이미지 업로드 오류:", error);
    }
  });
};

// 참고 이미지 업로드 훅
export const useUploadScriptwriterReferenceImage = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      scriptwriterId,
      sampleId,
      file,
    }: {
      scriptwriterId: number;
      sampleId: number;
      file: File;
    }): Promise<{ referenceImage: string }> => {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await api.post(
        `/admin/api/scriptwriters/${scriptwriterId}/samples/${sampleId}/reference-image`,
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
        queryKey: ['scriptwriter', variables.scriptwriterId],
      });
    },
    onError: (error) => {
      console.error("참고 이미지 업로드 오류:", error);
    }
  });
};

// 대표해설 삭제 훅
export const useDeleteScriptwriterSample = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      scriptwriterId,
      sampleId,
    }: {
      scriptwriterId: number;
      sampleId: number;
    }): Promise<void> => {
      await api.delete(
        `/admin/api/scriptwriters/${scriptwriterId}/samples/${sampleId}`
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['scriptwriter', variables.scriptwriterId],
      });
    },
    onError: (error) => {
      console.error("대표해설 삭제 오류:", error);
    }
  });
};
