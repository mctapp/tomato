// lib/utils/api-client.ts
import { api } from '@/lib/api';

/**
 * API 클라이언트 - Axios 인스턴스를 래핑한 유틸리티
 */
export const apiClient = {
  /**
   * GET 요청
   */
  async get<T = any>(url: string, config?: any): Promise<T> {
    const response = await api.get<T>(url, config);
    return response.data;
  },

  /**
   * POST 요청
   */
  async post<T = any>(url: string, data?: any, config?: any): Promise<T> {
    const response = await api.post<T>(url, data, config);
    return response.data;
  },

  /**
   * PUT 요청
   */
  async put<T = any>(url: string, data?: any, config?: any): Promise<T> {
    const response = await api.put<T>(url, data, config);
    return response.data;
  },

  /**
   * PATCH 요청
   */
  async patch<T = any>(url: string, data?: any, config?: any): Promise<T> {
    const response = await api.patch<T>(url, data, config);
    return response.data;
  },

  /**
   * DELETE 요청
   */
  async delete<T = any>(url: string, config?: any): Promise<T> {
    const response = await api.delete<T>(url, config);
    return response.data;
  }
};
