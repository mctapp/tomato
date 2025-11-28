
// hooks/useVoiceArtists.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { VoiceArtist, VoiceArtistSample, VoiceArtistSummary, VoiceArtistAccessAsset } from '@/types/voiceartists';

// 페이지네이션 응답 타입
interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

interface PaginatedVoiceArtists {
  data: VoiceArtistSummary[];
  pagination: PaginationMeta;
}

// 성우 목록 조회 훅 - 수어통역사와 동일한 구조
export const useVoiceArtists = (params?: {
  keyword?: string;
  levels?: string;
  genders?: string;
  page?: number;
  limit?: number;
}) => {
  return useQuery({
    queryKey: ['voiceArtists', params],
    queryFn: async (): Promise<PaginatedVoiceArtists> => {
      const queryParams = new URLSearchParams();
      
      if (params?.keyword) {
        queryParams.append('keyword', params.keyword);
      }
      
      if (params?.levels) {
        queryParams.append('levels', params.levels);
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
      
      console.log('API 요청 URL:', `/admin/api/voiceartists?${queryParams.toString()}`);
      
      const response = await api.get(`/admin/api/voiceartists?${queryParams.toString()}`);
      
      console.log('API 응답:', response.data);
      
      // 페이지네이션 응답 구조 처리
      if (response.data.data && response.data.pagination) {
        return {
          data: response.data.data,
          pagination: response.data.pagination
        };
      }
      
      // 이전 구조 호환성 (배열만 오는 경우)
      if (Array.isArray(response.data)) {
        const data = response.data;
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

// 성우 상세 조회 훅
export const useVoiceArtist = (id: number) => {
  return useQuery({
    queryKey: ['voiceArtist', id],
    queryFn: async () => {
      console.log("API 요청 - 상세 조회:", id);
      const response = await api.get(`/admin/api/voiceartists/${id}`);
      console.log("API 응답 - 성우 상세:", response.data);
      return response.data;
    },
    retry: 1,
    enabled: !!id && id > 0,
    staleTime: 60000, // 1분
  });
};

// 성우 생성 훅
export const useCreateVoiceArtist = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: any) => {
      console.log("API 요청 전 원본 데이터:", data);
      
      // undefined 값을 빈 문자열로 변환하고 필드명 수정
      const sanitizedData = {
        voiceartist_name: data.voiceartistName || '',
        voiceartist_gender: data.voiceartistGender || '',
        voiceartist_location: data.voiceartistLocation || '',
        voiceartist_level: data.voiceartistLevel || null,
        voiceartist_phone: data.voiceartistPhone || '',
        voiceartist_email: data.voiceartistEmail || '',
        voiceartist_memo: data.voiceartistMemo || '',
        profile_image: data.profileImage || null,
        expertise: data.expertise || []
      };
      
      console.log("API 요청 - 성우 생성 (정제 후):", sanitizedData);
      
      const response = await api.post('/admin/api/voiceartists', sanitizedData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['voiceArtists'] });
    },
    onError: (error) => {
      console.error("성우 생성 오류:", error);
    }
  });
};

// 성우 수정 훅
export const useUpdateVoiceArtist = (id: number) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: any) => {
      console.log("API 요청 전 원본 데이터 (수정):", data);
      
      // undefined 값을 빈 문자열로 변환하고 필드명 수정
      const sanitizedData = {
        voiceartist_name: data.voiceartistName || '',
        voiceartist_gender: data.voiceartistGender || '',
        voiceartist_location: data.voiceartistLocation || '',
        voiceartist_level: data.voiceartistLevel || null,
        voiceartist_phone: data.voiceartistPhone || '',
        voiceartist_email: data.voiceartistEmail || '',
        voiceartist_memo: data.voiceartistMemo || '',
        profile_image: data.profileImage || null,
        expertise: data.expertise || []
      };
      
      console.log("API 요청 - 성우 수정 (정제 후):", sanitizedData);
      
      const response = await api.put(`/admin/api/voiceartists/${id}`, sanitizedData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['voiceArtists'] });
      queryClient.invalidateQueries({ queryKey: ['voiceArtist', id] });
    },
    onError: (error) => {
      console.error("성우 수정 오류:", error);
    }
  });
};

// 성우 삭제 훅
export const useDeleteVoiceArtist = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: number) => {
      const response = await api.delete(`/admin/api/voiceartists/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['voiceArtists'] });
    },
    onError: (error) => {
      console.error("성우 삭제 오류:", error);
    }
  });
};

// 성우 프로필 이미지 업로드 훅
export const useUploadVoiceArtistProfileImage = (id: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);

      // FormData를 보낼 때는 Content-Type 헤더를 설정하지 않아야 함
      // axios가 자동으로 multipart/form-data와 boundary를 설정함
      const response = await api.post(
        `/admin/api/voiceartists/${id}/profile-image`,
        formData
      );

      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['voiceArtist', id] });
      queryClient.invalidateQueries({ queryKey: ['voiceArtists'] });
    },
    onError: (error) => {
      console.error("프로필 이미지 업로드 오류:", error);
    }
  });
};

// 음성 샘플 생성 훅
export const useCreateVoiceArtistSample = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      voiceArtistId,
      sampleData,
    }: {
      voiceArtistId: number;
      sampleData: {
        title: string;
        sequence_number: number;
      };
    }) => {
      console.log("API 요청 - 샘플 메타데이터 생성:", sampleData);
      
      const response = await api.post(
        `/admin/api/voiceartists/${voiceArtistId}/samples`,
        sampleData
      );
      
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['voiceArtist', variables.voiceArtistId],
      });
    },
    onError: (error) => {
      console.error("샘플 생성 오류:", error);
    }
  });
};

// 음성 샘플 파일 업로드 훅
export const useUploadVoiceArtistSampleFile = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      voiceArtistId,
      sampleId,
      file,
    }: {
      voiceArtistId: number;
      sampleId: number;
      file: File;
    }) => {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await api.post(
        `/admin/api/voiceartists/${voiceArtistId}/samples/${sampleId}/file`,
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
        queryKey: ['voiceArtist', variables.voiceArtistId],
      });
    },
    onError: (error) => {
      console.error("샘플 파일 업로드 오류:", error);
    }
  });
};

// 음성 샘플 삭제 훅
export const useDeleteVoiceArtistSample = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      voiceArtistId,
      sampleId,
    }: {
      voiceArtistId: number;
      sampleId: number;
    }) => {
      const response = await api.delete(
        `/admin/api/voiceartists/${voiceArtistId}/samples/${sampleId}`
      );
      
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['voiceArtist', variables.voiceArtistId],
      });
    },
    onError: (error) => {
      console.error("샘플 삭제 오류:", error);
    }
  });
};

// 성우가 참여한 접근성 미디어 자산 목록 조회
export const useVoiceArtistAccessAssets = (voiceArtistId: number) => {
  return useQuery<VoiceArtistAccessAsset[]>({
    queryKey: ['voiceArtist', voiceArtistId, 'accessAssets'],
    queryFn: async () => {
      const response = await api.get(`/admin/api/voiceartists/${voiceArtistId}/access-assets`);
      return response.data;
    },
    enabled: !!voiceArtistId
  });
};
