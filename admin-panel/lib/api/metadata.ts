// lib/api/metadata.ts
import { ApiEndpointMetadata, ApiMetadata } from './types';
import { fetchApi } from './index';

/**
 * Fetch API metadata from server
 */
export async function getApiMetadata(): Promise<ApiEndpointMetadata[]> {
  try {
    const metadata = await fetchApi<ApiMetadata>('/api/docs/metadata');
    return metadata.endpoints || [];
  } catch (error) {
    console.error('Failed to fetch API metadata:', error);
    return [];
  }
}

/**
 * Get API metadata by category
 */
export async function getApiMetadataByCategory(category: string): Promise<ApiEndpointMetadata[]> {
  const endpoints = await getApiMetadata();
  return endpoints.filter(endpoint => endpoint.category === category);
}

/**
 * Get API categories
 */
export async function getApiCategories(): Promise<string[]> {
  const endpoints = await getApiMetadata();
  const categories = new Set(endpoints.map(endpoint => endpoint.category));
  return Array.from(categories);
}
