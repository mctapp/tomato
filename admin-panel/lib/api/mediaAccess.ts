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
  return api.get<MediaAccessControl[]>(`/admin/api/access-assets/${assetId}/access-controls`);
}

/**
 * Get a single access control
 */
export async function getMediaAccessControl(assetId: number, controlId: number): Promise<MediaAccessControl> {
  return api.get<MediaAccessControl>(`/admin/api/access-assets/${assetId}/access-controls/${controlId}`);
}

/**
 * Create a new access control
 */
export async function createMediaAccessControl(data: MediaAccessControlCreate): Promise<MediaAccessControl> {
  return api.post<MediaAccessControl>(
    `/admin/api/access-assets/${data.accessAssetId}/access-controls`,
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
    `/admin/api/access-assets/${assetId}/access-controls/${controlId}`,
    data
  );
}

/**
 * Delete an access control
 */
export async function deleteMediaAccessControl(assetId: number, controlId: number): Promise<void> {
  return api.delete<void>(`/admin/api/access-assets/${assetId}/access-controls/${controlId}`);
}

// Access Request related interfaces and functions

export interface MediaAccessRequest {
  id: number;
  mediaId: number;
  userId?: number | null;
  deviceId?: string | null;
  requestReason?: string | null;
  status: string;
  adminId?: number | null;
  adminNotes?: string | null;
  expiryDate?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MediaAccessRequestCreate {
  userId?: number | null;
  deviceId?: string | null;
  requestReason?: string | null;
}

export interface MediaAccessRequestUpdate {
  status: 'approved' | 'rejected';
  adminId: number;
  adminNotes?: string | null;
  expiryDate?: string | null;
}

export interface AccessPermissionResponse {
  hasAccess: boolean;
  reason: string;
  expiresAt?: string | null;
  requestId?: number | null;
}

/**
 * Get access requests
 */
export async function getAccessRequests(
  filters: Record<string, any> = {}
): Promise<MediaAccessRequest[]> {
  const queryString = Object.keys(filters).length
    ? '?' + new URLSearchParams(filters as any).toString()
    : '';
  return api.get<MediaAccessRequest[]>(`/admin/api/access-requests${queryString}`);
}

/**
 * Create an access request
 */
export async function createAccessRequest(
  mediaId: number,
  data: MediaAccessRequestCreate
): Promise<MediaAccessRequest> {
  return api.post<MediaAccessRequest>(`/admin/api/access-requests/${mediaId}`, data);
}

/**
 * Process an access request
 */
export async function processAccessRequest(
  requestId: number,
  data: MediaAccessRequestUpdate
): Promise<MediaAccessRequest> {
  return api.patch<MediaAccessRequest>(`/admin/api/access-requests/${requestId}`, data);
}

/**
 * Check access permission
 */
export async function checkAccessPermission(
  mediaId: number,
  userId?: number,
  deviceId?: string
): Promise<AccessPermissionResponse> {
  const params = new URLSearchParams();
  if (userId) params.append('userId', userId.toString());
  if (deviceId) params.append('deviceId', deviceId);
  const queryString = params.toString() ? `?${params.toString()}` : '';
  return api.get<AccessPermissionResponse>(
    `/admin/api/access-requests/${mediaId}/permission${queryString}`
  );
}

/**
 * Toggle lock status
 */
export async function toggleLockStatus(
  mediaId: number,
  isLocked: boolean,
  adminId?: number
): Promise<{ success: boolean; isLocked: boolean }> {
  return api.patch<{ success: boolean; isLocked: boolean }>(
    `/admin/api/access-assets/${mediaId}/lock`,
    { isLocked, adminId }
  );
}
