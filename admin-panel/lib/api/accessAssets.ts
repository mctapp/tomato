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
export async function getAccessAssets(): Promise<AccessAsset[]> {
  const response = await api.get<AccessAsset[]>('/admin/api/access-assets');
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
