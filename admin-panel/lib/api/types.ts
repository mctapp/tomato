// lib/api/types.ts

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface ApiParameter {
  name: string;
  type: string;
  required: boolean;
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
  tags?: string[];
  parameters?: ApiParameter[];
  requestBody?: ApiRequestBody;
  responses: ApiResponse[];
  requiresAuth?: boolean;
  requiredRoles?: string[];
}

export interface ApiMetadataResponse {
  endpoints: ApiEndpointMetadata[];
  version: string;
  title: string;
  description: string;
}
