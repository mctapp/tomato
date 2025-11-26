// lib/utils/api-client.ts

interface RequestOptions extends RequestInit {
  data?: any;
}

interface ApiClientError extends Error {
  response?: {
    status: number;
    data: any;
  };
}

class ApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
  }

  private async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { data, headers: customHeaders, ...restOptions } = options;

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...customHeaders,
    };

    const config: RequestInit = {
      ...restOptions,
      headers,
      credentials: 'include',
    };

    if (data) {
      config.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, config);

      if (!response.ok) {
        const error: ApiClientError = new Error(`HTTP Error: ${response.status}`);
        error.response = {
          status: response.status,
          data: await response.json().catch(() => null),
        };
        throw error;
      }

      // Handle empty responses
      const text = await response.text();
      if (!text) {
        return {} as T;
      }

      return JSON.parse(text);
    } catch (error) {
      if ((error as ApiClientError).response) {
        throw error;
      }
      const apiError: ApiClientError = new Error(
        error instanceof Error ? error.message : 'Network error'
      );
      throw apiError;
    }
  }

  async get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  async post<T>(endpoint: string, data: any, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'POST', data });
  }

  async put<T>(endpoint: string, data: any, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'PUT', data });
  }

  async patch<T>(endpoint: string, data: any, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'PATCH', data });
  }

  async delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

export const apiClient = new ApiClient();
