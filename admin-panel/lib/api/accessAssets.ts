// lib/api/accessAssets.ts
import { api, fetchApi } from './index';

export interface AccessAsset {
  id: number;
  name: string;
  mediaType: string;
  language: string;
  assetType: string;
  productionYear?: number;
  productionStatus: string;
  publishingStatus: string;
  movieId?: number;
  createdAt: string;
  updatedAt: string;
}

export interface AccessAssetDetail extends AccessAsset {
  description?: string;
  duration?: number;
  fileSize?: number;
  filePath?: string;
  thumbnailPath?: string;
  movie?: {
    id: number;
    title: string;
    titleEn?: string;
    director?: string;
    releaseDate?: string;
    posterImage?: string;
  };
  credits?: any[];
}

export interface AccessAssetCreate {
  name: string;
  mediaType: string;
  language: string;
  assetType: string;
  movieId?: number;
  productionYear?: number | null;
  description?: string;
}

export interface AccessAssetUpdate {
  name?: string;
  mediaType?: string;
  language?: string;
  assetType?: string;
  productionYear?: number | null;
  productionStatus?: string;
  publishingStatus?: string;
  description?: string;
}

export interface FileUploadResponse {
  success: boolean;
  message: string;
  filePath?: string;
  fileName?: string;
  fileSize?: number;
}

/**
 * Get all access assets
 */
export async function getAccessAssets(params?: Record<string, any>): Promise<AccessAsset[]> {
  const queryString = params
    ? '?' + new URLSearchParams(params as any).toString()
    : '';
  return api.get<AccessAsset[]>(`/api/access-assets${queryString}`);
}

/**
 * Get a single access asset by ID
 */
export async function getAccessAsset(id: number): Promise<AccessAssetDetail> {
  return api.get<AccessAssetDetail>(`/api/access-assets/${id}`);
}

/**
 * Create a new access asset
 */
export async function createAccessAsset(data: AccessAssetCreate): Promise<AccessAsset> {
  return api.post<AccessAsset>('/api/access-assets', data);
}

/**
 * Update an access asset
 */
export async function updateAccessAsset(id: number, data: AccessAssetUpdate): Promise<AccessAsset> {
  return api.put<AccessAsset>(`/api/access-assets/${id}`, data);
}

/**
 * Delete an access asset
 */
export async function deleteAccessAsset(id: number): Promise<void> {
  return api.delete<void>(`/api/access-assets/${id}`);
}

/**
 * Upload file for access asset
 */
export async function uploadAccessAssetFile(
  id: number,
  file: File,
  fileType: string
): Promise<FileUploadResponse> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('fileType', fileType);

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/access-assets/${id}/upload`,
    {
      method: 'POST',
      credentials: 'include',
      body: formData,
    }
  );

  if (!response.ok) {
    throw new Error('File upload failed');
  }

  return response.json();
}

/**
 * Download access asset file
 */
export async function downloadAccessAssetFile(id: number, fileType: string): Promise<Blob> {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/access-assets/${id}/download/${fileType}`,
    {
      credentials: 'include',
    }
  );

  if (!response.ok) {
    throw new Error('File download failed');
  }

  return response.blob();
}

/**
 * Update publishing status of an access asset
 */
export async function updatePublishingStatus(
  id: number,
  status: string
): Promise<AccessAsset> {
  return api.patch<AccessAsset>(`/api/access-assets/${id}/publishing-status`, {
    publishingStatus: status,
  });
}

/**
 * Toggle lock status of an access asset
 */
export async function toggleLockStatus(
  id: number,
  isLocked: boolean
): Promise<AccessAsset> {
  return api.patch<AccessAsset>(`/api/access-assets/${id}/lock`, {
    isLocked,
  });
}

/**
 * Get file info for an access asset
 */
export interface AccessAssetFile {
  id: number;
  accessAssetId: number;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  supportedOsType?: string;
  createdAt: string;
  updatedAt: string;
}

export async function getAccessAssetFile(assetId: number): Promise<AccessAssetFile | null> {
  return api.get<AccessAssetFile | null>(`/api/access-assets/${assetId}/file`);
}

/**
 * Delete file for an access asset
 */
export async function deleteAccessAssetFile(assetId: number): Promise<void> {
  return api.delete<void>(`/api/access-assets/${assetId}/file`);
}

/**
 * Get download URL for an access asset file
 */
export interface DownloadUrlResponse {
  url: string;
  expiresAt: string;
}

export async function getDownloadUrl(
  assetId: number,
  expiresIn: number = 3600
): Promise<DownloadUrlResponse> {
  return api.get<DownloadUrlResponse>(
    `/api/access-assets/${assetId}/download-url?expiresIn=${expiresIn}`
  );
}
