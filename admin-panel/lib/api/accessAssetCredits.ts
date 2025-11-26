// lib/api/accessAssetCredits.ts
import { api } from './index';

export interface AccessAssetCredit {
  id: number;
  accessAssetId: number;
  personType: string;
  personId: number;
  roleName: string;
  isPrimary: boolean;
  sequenceNumber: number;
  memo?: string;
  createdAt: string;
  updatedAt: string;
  person?: {
    id: number;
    name: string;
    profileImage?: string;
  };
}

export interface AccessAssetCreditCreate {
  accessAssetId: number;
  personType: string;
  personId: number;
  roleName: string;
  isPrimary?: boolean;
  sequenceNumber?: number;
  memo?: string;
}

export interface AccessAssetCreditUpdate {
  roleName?: string;
  isPrimary?: boolean;
  sequenceNumber?: number;
  memo?: string;
}

/**
 * Get all credits for an access asset
 */
export async function getAccessAssetCredits(assetId: number): Promise<AccessAssetCredit[]> {
  return api.get<AccessAssetCredit[]>(`/api/access-assets/${assetId}/credits`);
}

/**
 * Get a single credit by ID
 */
export async function getAccessAssetCredit(assetId: number, creditId: number): Promise<AccessAssetCredit> {
  return api.get<AccessAssetCredit>(`/api/access-assets/${assetId}/credits/${creditId}`);
}

/**
 * Create a new credit
 */
export async function createAccessAssetCredit(data: AccessAssetCreditCreate): Promise<AccessAssetCredit> {
  return api.post<AccessAssetCredit>(`/api/access-assets/${data.accessAssetId}/credits`, data);
}

/**
 * Update a credit
 */
export async function updateAccessAssetCredit(
  assetId: number,
  creditId: number,
  data: AccessAssetCreditUpdate
): Promise<AccessAssetCredit> {
  return api.put<AccessAssetCredit>(`/api/access-assets/${assetId}/credits/${creditId}`, data);
}

/**
 * Delete a credit
 */
export async function deleteAccessAssetCredit(assetId: number, creditId: number): Promise<void> {
  return api.delete<void>(`/api/access-assets/${assetId}/credits/${creditId}`);
}

/**
 * Reorder credits
 */
export async function reorderAccessAssetCredits(
  assetId: number,
  creditIds: number[]
): Promise<AccessAssetCredit[]> {
  return api.put<AccessAssetCredit[]>(`/api/access-assets/${assetId}/credits/reorder`, { creditIds });
}
