// lib/api/types.ts

export interface ApiEndpointMetadata {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  name: string;
  description: string;
  category: string;
  parameters?: ApiParameter[];
  requestBody?: ApiRequestBody;
  responses?: ApiResponse[];
  tags?: string[];
  security?: string[];
  deprecated?: boolean;
  requiredRoles?: string[];
  responseExample?: any;
  lastUpdated?: string;
  usageCount?: number;
}

export interface ApiParameter {
  name: string;
  in: 'path' | 'query' | 'header' | 'cookie';
  description?: string;
  required: boolean;
  type: string;
  format?: string;
  default?: any;
  enum?: string[];
  example?: any;
}

export interface ApiRequestBody {
  description?: string;
  required: boolean;
  contentType: string;
  schema?: ApiSchema;
  example?: any;
}

export interface ApiSchema {
  type: string;
  properties?: Record<string, ApiSchemaProperty>;
  required?: string[];
  items?: ApiSchema;
  $ref?: string;
}

export interface ApiSchemaProperty {
  type: string;
  description?: string;
  format?: string;
  default?: any;
  enum?: string[];
  example?: any;
  items?: ApiSchemaProperty;
  properties?: Record<string, ApiSchemaProperty>;
}

export interface ApiResponse {
  statusCode: number;
  description: string;
  contentType?: string;
  schema?: ApiSchema;
  example?: any;
}

export interface ApiMetadata {
  version: string;
  title: string;
  description: string;
  baseUrl: string;
  endpoints: ApiEndpointMetadata[];
  categories: string[];
}
