// hooks/useMediaAccess.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createAccessRequest,
  getAccessRequests,
  processAccessRequest,
  checkAccessPermission,
  toggleLockStatus
} from '@/lib/api/mediaAccess';
import { MediaAccessRequestCreate, MediaAccessRequestUpdate } from '@/types/mediaAccess';

// 접근 요청 목록 쿼리 훅
export function useAccessRequests(
  filters = {},
  enabled = true
) {
  return useQuery({
    queryKey: ['accessRequests', filters],
    queryFn: () => getAccessRequests(filters),
    enabled,
  });
}

// 접근 권한 확인 쿼리 훅
export function useAccessPermission(
  mediaId: number,
  userId?: number,
  deviceId?: string,
  enabled = true
) {
  return useQuery({
    queryKey: ['accessPermission', mediaId, userId, deviceId],
    queryFn: () => checkAccessPermission(mediaId, userId, deviceId),
    enabled: enabled && !!mediaId,
  });
}

// 접근 요청 생성 뮤테이션 훅
export function useCreateAccessRequest() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ mediaId, data }: { mediaId: number; data: MediaAccessRequestCreate }) => 
      createAccessRequest(mediaId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['accessRequests'] });
      queryClient.invalidateQueries({ queryKey: ['accessPermission', variables.mediaId] });
    },
  });
}

// 접근 요청 처리 뮤테이션 훅
export function useProcessAccessRequest() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ requestId, data }: { requestId: number; data: MediaAccessRequestUpdate }) => 
      processAccessRequest(requestId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accessRequests'] });
      queryClient.invalidateQueries({ queryKey: ['accessPermission'] });
    },
  });
}

// 잠금 상태 토글 뮤테이션 훅
export function useToggleLockStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ mediaId, isLocked, adminId }: { mediaId: number; isLocked: boolean; adminId?: number }) => 
      toggleLockStatus(mediaId, isLocked, adminId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['accessAssets'] });
      queryClient.invalidateQueries({ queryKey: ['accessAsset', variables.mediaId] });
    },
  });
}
