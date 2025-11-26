// lib/api/mediaAccess.ts
import { api } from './index';

export interface MediaAccessControl {
  id: number;
  accessAssetId: number;
  distributorId: number;
  accessType: string;
  startDate: string;
  endDate?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  distributor?: {
    id: number;
    name: string;
    code: string;
  };
}

export interface MediaAccessControlCreate {
  accessAssetId: number;
  distributorId: number;
  accessType: string;
  startDate: string;
  endDate?: string;
  isActive?: boolean;
}

export interface MediaAccessControlUpdate {
  accessType?: string;
  startDate?: string;
  endDate?: string;
  isActive?: boolean;
}

/**
 * Get all access controls for an asset
 */
export async function getMediaAccessControls(assetId: number): Promise<MediaAccessControl[]> {
  return api.get<MediaAccessControl[]>(`/api/access-assets/${assetId}/access-controls`);
}

/**
 * Get a single access control
 */
export async function getMediaAccessControl(assetId: number, controlId: number): Promise<MediaAccessControl> {
  return api.get<MediaAccessControl>(`/api/access-assets/${assetId}/access-controls/${controlId}`);
}

/**
 * Create a new access control
 */
export async function createMediaAccessControl(data: MediaAccessControlCreate): Promise<MediaAccessControl> {
  return api.post<MediaAccessControl>(
    `/api/access-assets/${data.accessAssetId}/access-controls`,
    data
  );
}

/**
 * Update an access control
 */
export async function updateMediaAccessControl(
  assetId: number,
  controlId: number,
  data: MediaAccessControlUpdate
): Promise<MediaAccessControl> {
  return api.put<MediaAccessControl>(
    `/api/access-assets/${assetId}/access-controls/${controlId}`,
    data
  );
}

/**
 * Delete an access control
 */
export async function deleteMediaAccessControl(assetId: number, controlId: number): Promise<void> {
  return api.delete<void>(`/api/access-assets/${assetId}/access-controls/${controlId}`);
}
