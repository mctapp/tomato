// hooks/useAccessAssets.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getAccessAssets,
  getAccessAsset,
  createAccessAsset,
  updateAccessAsset,
  deleteAccessAsset,
  updatePublishingStatus,
  toggleLockStatus
} from '@/lib/api/accessAssets';  // 경로 수정
import { AccessAssetCreate, AccessAssetUpdate } from '@/types/accessAsset';

// 자산 목록 쿼리 훅
export function useAccessAssets(filters = {}, options?: { enabled?: boolean, select?: (data: any) => any }) {
  const enabled = options?.enabled ?? true;
  
  return useQuery({
    queryKey: ['accessAssets', filters],
    queryFn: () => getAccessAssets(filters),
    enabled,
    select: options?.select,
  });
}

// 자산 상세 쿼리 훅
export function useAccessAsset(assetId: number, options?: { enabled?: boolean, select?: (data: any) => any }) {
  const enabled = options?.enabled ?? true;
  
  return useQuery({
    queryKey: ['accessAsset', assetId],
    queryFn: () => getAccessAsset(assetId),
    enabled: enabled && !!assetId,
    select: options?.select,
  });
}

// 자산 생성 뮤테이션 훅
export function useCreateAccessAsset() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: AccessAssetCreate) => createAccessAsset(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accessAssets'] });
    },
  });
}

// 자산 업데이트 뮤테이션 훅
export function useUpdateAccessAsset(assetId: number) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: AccessAssetUpdate) => updateAccessAsset(assetId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accessAssets'] });
      queryClient.invalidateQueries({ queryKey: ['accessAsset', assetId] });
    },
  });
}

// 자산 삭제 뮤테이션 훅
export function useDeleteAccessAsset() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (assetId: number) => deleteAccessAsset(assetId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accessAssets'] });
    },
  });
}

// 게시 상태 업데이트 뮤테이션 훅
export function useUpdatePublishingStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ assetId, status }: { assetId: number; status: string }) => 
      updatePublishingStatus(assetId, status),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['accessAssets'] });
      queryClient.invalidateQueries({ queryKey: ['accessAsset', variables.assetId] });
    },
  });
}

// 잠금 상태 토글 뮤테이션 훅
export function useToggleLockStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ assetId, isLocked }: { assetId: number; isLocked: boolean }) => 
      toggleLockStatus(assetId, isLocked),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['accessAssets'] });
      queryClient.invalidateQueries({ queryKey: ['accessAsset', variables.assetId] });
    },
  });
}
