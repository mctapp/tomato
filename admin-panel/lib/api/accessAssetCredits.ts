// lib/api/accessAssetCredits.ts
import { api } from '@/lib/api';

export interface AccessAssetCredit {
  id: number;
  accessAssetId: number;
  personnelType: string;
  personnelId: number;
  role: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * 접근성 자산 크레딧 목록 조회
 */
export async function getAccessAssetCredits(assetId: number): Promise<AccessAssetCredit[]> {
  const response = await api.get<AccessAssetCredit[]>(`/admin/api/access-assets/${assetId}/credits`);
  return response.data;
}

/**
 * 접근성 자산 크레딧 생성
 */
export async function createAccessAssetCredit(assetId: number, creditData: Partial<AccessAssetCredit>): Promise<AccessAssetCredit> {
  const response = await api.post<AccessAssetCredit>(`/admin/api/access-assets/${assetId}/credits`, creditData);
  return response.data;
}

/**
 * 접근성 자산 크레딧 삭제
 */
export async function deleteAccessAssetCredit(assetId: number, creditId: number): Promise<void> {
  await api.delete(`/admin/api/access-assets/${assetId}/credits/${creditId}`);
}
