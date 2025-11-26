// lib/api/index.ts
import { apiClient } from '@/lib/utils/api-client';

/**
 * Generic API client for making requests
 */
export const api = {
  get: <T>(url: string) => apiClient.get<T>(url),
  post: <T>(url: string, data: any) => apiClient.post<T>(url, data),
  put: <T>(url: string, data: any) => apiClient.put<T>(url, data),
  patch: <T>(url: string, data: any) => apiClient.patch<T>(url, data),
  delete: <T>(url: string) => apiClient.delete<T>(url),
};

/**
 * Generic fetch API function for production modules
 */
export async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
  const url = `${baseUrl}${endpoint}`;

  const defaultOptions: RequestInit = {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const response = await fetch(url, { ...defaultOptions, ...options });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(error.message || `HTTP Error: ${response.status}`);
  }

  const text = await response.text();
  if (!text) {
    return {} as T;
  }

  return JSON.parse(text);
}

export default api;
