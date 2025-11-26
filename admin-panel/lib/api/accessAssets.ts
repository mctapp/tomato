// lib/api/accessAssets.ts
import { api } from '@/lib/api';

export interface AccessAsset {
  id: number;
  movieId: number;
  mediaType: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * 접근성 자산 목록 조회
 */
export async function getAccessAssets(filters: Record<string, any> = {}): Promise<AccessAsset[]> {
  const response = await api.get<AccessAsset[]>('/admin/api/access-assets', { params: filters });
  return response.data;
}

/**
 * 특정 접근성 자산 조회
 */
export async function getAccessAsset(assetId: number): Promise<AccessAsset> {
  const response = await api.get<AccessAsset>(`/admin/api/access-assets/${assetId}`);
  return response.data;
}

/**
 * 접근성 자산 생성
 */
export async function createAccessAsset(assetData: Partial<AccessAsset>): Promise<AccessAsset> {
  const response = await api.post<AccessAsset>('/admin/api/access-assets', assetData);
  return response.data;
}

/**
 * 접근성 자산 수정
 */
export async function updateAccessAsset(assetId: number, assetData: Partial<AccessAsset>): Promise<AccessAsset> {
  const response = await api.put<AccessAsset>(`/admin/api/access-assets/${assetId}`, assetData);
  return response.data;
}

/**
 * 접근성 자산 삭제
 */
export async function deleteAccessAsset(assetId: number): Promise<void> {
  await api.delete(`/admin/api/access-assets/${assetId}`);
}

/**
 * 접근성 자산 게시 상태 변경
 */
export async function updatePublishingStatus(assetId: number, status: string): Promise<AccessAsset> {
  const response = await api.patch<AccessAsset>(`/admin/api/access-assets/${assetId}/publishing-status`, { status });
  return response.data;
}

/**
 * 접근성 자산 잠금 상태 토글
 */
export async function toggleLockStatus(assetId: number, isLocked?: boolean): Promise<AccessAsset> {
  const response = await api.post<AccessAsset>(`/admin/api/access-assets/${assetId}/toggle-lock`, { isLocked });
  return response.data;
}

/**
 * 파일 정보 인터페이스
 */
export interface AccessAssetFileInfo {
  id: number;
  assetId: number;
  originalFilename: string;
  storedFilename: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
}

/**
 * 접근성 자산 파일 정보 조회
 */
export async function getAccessAssetFile(assetId: number): Promise<AccessAssetFileInfo> {
  const response = await api.get<AccessAssetFileInfo>(`/admin/api/access-assets/${assetId}/file`);
  return response.data;
}

/**
 * 접근성 자산 파일 업로드
 */
export async function uploadAccessAssetFile(
  assetId: number,
  file: File,
  supportedOsType?: string
): Promise<AccessAssetFileInfo> {
  const formData = new FormData();
  formData.append('file', file);
  if (supportedOsType) {
    formData.append('supportedOsType', supportedOsType);
  }

  const response = await api.post<AccessAssetFileInfo>(
    `/admin/api/access-assets/${assetId}/file`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );
  return response.data;
}

/**
 * 접근성 자산 파일 삭제
 */
export async function deleteAccessAssetFile(assetId: number): Promise<void> {
  await api.delete(`/admin/api/access-assets/${assetId}/file`);
}

/**
 * 접근성 자산 파일 다운로드 URL 조회
 */
export async function getDownloadUrl(assetId: number, expiresIn: number = 3600): Promise<string> {
  const response = await api.get<{ url: string }>(
    `/admin/api/access-assets/${assetId}/file/download-url`,
    { params: { expiresIn } }
  );
  return response.data.url;
}
