// app/hooks/useAccessAssetFile.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getAccessAssetFile,
  uploadAccessAssetFile,
  deleteAccessAssetFile,
  getDownloadUrl
} from '@/lib/api/accessAssets';

// 파일 정보 쿼리 훅
export function useAccessAssetFile(assetId: number, enabled = true) {
  return useQuery({
    queryKey: ['accessAssetFile', assetId],
    queryFn: () => getAccessAssetFile(assetId),
    enabled: enabled && !!assetId,
  });
}

// 파일 업로드 뮤테이션 훅
export function useUploadAccessAssetFile(assetId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ file, supportedOsType }: { file: File; supportedOsType?: string }) =>
      uploadAccessAssetFile(assetId, file, supportedOsType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accessAssetFile', assetId] });
      queryClient.invalidateQueries({ queryKey: ['accessAsset', assetId] });
    },
  });
}

// 파일 삭제 뮤테이션 훅
export function useDeleteAccessAssetFile(assetId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => deleteAccessAssetFile(assetId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accessAssetFile', assetId] });
      queryClient.invalidateQueries({ queryKey: ['accessAsset', assetId] });
    },
  });
}

// 다운로드 URL 쿼리 훅
export function useDownloadUrl(assetId: number, expiresIn: number = 3600, enabled = true) {
  return useQuery({
    queryKey: ['downloadUrl', assetId, expiresIn],
    queryFn: () => getDownloadUrl(assetId, expiresIn),
    enabled: enabled && !!assetId,
    staleTime: (expiresIn - 60) * 1000, // 만료 시간 직전까지 캐시 유지
  });
}
