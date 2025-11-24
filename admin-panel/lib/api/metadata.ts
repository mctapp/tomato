// lib/api/metadata.ts
import { api } from '@/lib/api';
import { ApiEndpointMetadata, ApiMetadataResponse } from './types';

/**
 * API 메타데이터 조회
 * OpenAPI/Swagger 형식의 API 문서를 반환
 */
export async function getApiMetadata(): Promise<ApiEndpointMetadata[]> {
  try {
    const response = await api.get<ApiMetadataResponse>('/admin/api/metadata');
    return response.data.endpoints || [];
  } catch (error) {
    console.error('Failed to fetch API metadata:', error);

    // 메타데이터 조회 실패 시 기본 엔드포인트 반환
    return getDefaultEndpoints();
  }
}

/**
 * 기본 API 엔드포인트 목록 (메타데이터 조회 실패 시 사용)
 */
function getDefaultEndpoints(): ApiEndpointMetadata[] {
  return [
    {
      path: '/admin/api/movies',
      method: 'GET',
      summary: '영화 목록 조회',
      description: '등록된 영화 목록을 조회합니다.',
      tags: ['Movies'],
      responses: [
        {
          statusCode: 200,
          description: '영화 목록 조회 성공'
        }
      ],
      requiresAuth: true
    },
    {
      path: '/admin/api/distributors',
      method: 'GET',
      summary: '배급사 목록 조회',
      description: '등록된 배급사 목록을 조회합니다.',
      tags: ['Distributors'],
      responses: [
        {
          statusCode: 200,
          description: '배급사 목록 조회 성공'
        }
      ],
      requiresAuth: true
    },
    {
      path: '/admin/api/users',
      method: 'GET',
      summary: '사용자 목록 조회',
      description: '시스템 사용자 목록을 조회합니다.',
      tags: ['Users'],
      responses: [
        {
          statusCode: 200,
          description: '사용자 목록 조회 성공'
        }
      ],
      requiresAuth: true,
      requiredRoles: ['ADMIN', 'SUPER_ADMIN']
    }
  ];
}

/**
 * 특정 태그의 엔드포인트 조회
 */
export async function getEndpointsByTag(tag: string): Promise<ApiEndpointMetadata[]> {
  const endpoints = await getApiMetadata();
  return endpoints.filter(endpoint =>
    endpoint.tags && endpoint.tags.includes(tag)
  );
}

/**
 * 특정 경로의 엔드포인트 조회
 */
export async function getEndpointByPath(path: string, method: string): Promise<ApiEndpointMetadata | undefined> {
  const endpoints = await getApiMetadata();
  return endpoints.find(endpoint =>
    endpoint.path === path && endpoint.method === method
  );
}
