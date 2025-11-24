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
      const token = localStorage.getItem('token');
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

// Fetch API 래퍼 함수 (기존 코드와의 호환성을 위해)
export async function fetchApi(url: string, options: RequestInit = {}): Promise<any> {
  const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  const fullUrl = url.startsWith('http') ? url : `${baseURL}${url}`;

  // 기본 헤더 설정
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // 기존 헤더 병합
  if (options.headers) {
    const optionsHeaders = new Headers(options.headers);
    optionsHeaders.forEach((value, key) => {
      headers[key] = value;
    });
  }

  // 토큰이 있으면 헤더에 추가
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  // body가 있으면 snake_case로 변환 (JSON인 경우)
  let body = options.body;
  if (body && typeof body === 'string') {
    try {
      const parsed = JSON.parse(body);
      body = JSON.stringify(keysToSnake(parsed));
    } catch (e) {
      // JSON이 아니면 그대로 사용
    }
  }

  const response = await fetch(fullUrl, {
    ...options,
    headers,
    body,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
  }

  const data = await response.json();

  // snake_case를 camelCase로 변환
  return keysToCamel(data);
}
