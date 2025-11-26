// lib/api/types.ts

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface ApiParameter {
  name: string;
  type: string;
  required: boolean;
  in?: string;
  description?: string;
  default?: any;
  example?: any;
}

export interface ApiRequestBody {
  type: string;
  required: boolean;
  description?: string;
  example?: any;
  schema?: Record<string, any>;
}

export interface ApiResponse {
  statusCode: number;
  description: string;
  schema?: Record<string, any>;
  example?: any;
}

export interface ApiEndpointMetadata {
  path: string;
  method: HttpMethod;
  summary: string;
  description?: string;
  category?: string;
  tags?: string[];
  parameters?: ApiParameter[];
  requestBody?: ApiRequestBody;
  responses: ApiResponse[];
  responseExample?: any;
  requiresAuth?: boolean;
  requiredRoles?: string[];
  lastUpdated?: string;
  usageCount?: number;
}

export interface ApiMetadataResponse {
  endpoints: ApiEndpointMetadata[];
  version: string;
  title: string;
  description: string;
}
