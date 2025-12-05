// lib/api.ts
import axios from 'axios';

// Snake case를 camel case로 변환하는 함수
function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

// 객체의 키를 snake_case에서 camelCase로 변환
function keysToCamel(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => keysToCamel(item));
  }

  if (typeof obj === 'object' && obj.constructor === Object) {
    return Object.keys(obj).reduce((result, key) => {
      const camelKey = toCamelCase(key);
      result[camelKey] = keysToCamel(obj[key]);
      return result;
    }, {} as any);
  }

  return obj;
}

// 객체의 키를 camelCase에서 snake_case로 변환
function keysToSnake(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => keysToSnake(item));
  }

  if (typeof obj === 'object' && obj.constructor === Object) {
    return Object.keys(obj).reduce((result, key) => {
      const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      result[snakeKey] = keysToSnake(obj[key]);
      return result;
    }, {} as any);
  }

  return obj;
}

// API 클라이언트 생성
export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,  // 쿠키 기반 인증을 위해 필수
});

// 요청 인터셉터: camelCase를 snake_case로 변환
api.interceptors.request.use(
  (config) => {
    // FormData는 변환하지 않음 (파일 업로드용)
    if (config.data && !(config.data instanceof FormData)) {
      config.data = keysToSnake(config.data);
    }

    // 토큰이 있으면 헤더에 추가
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('accessToken');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 응답 인터셉터: snake_case를 camelCase로 변환
api.interceptors.response.use(
  (response) => {
    // 응답 데이터를 camelCase로 변환
    if (response.data) {
      response.data = keysToCamel(response.data);
    }
    return response;
  },
  (error) => {
    // 에러 메시지도 변환
    if (error.response && error.response.data) {
      error.response.data = keysToCamel(error.response.data);
    }
    return Promise.reject(error);
  }
);

// Production 모듈을 위한 fetchApi 함수 추가
export async function fetchApi<T = any>(url: string, options: any = {}): Promise<T> {
  try {
    const response = await api({
      url,
      method: options.method || 'GET',
      data: options.body ? JSON.parse(options.body) : undefined,
      headers: options.headers || {},
      ...options
    });
    return response.data;
  } catch (error: any) {
    if (error.response) {
      throw new Error(error.response.data?.message || error.message);
    }
    throw error;
  }
}
