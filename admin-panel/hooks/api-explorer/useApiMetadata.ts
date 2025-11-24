// hooks/api-explorer/useApiMetadata.ts
import { useState, useEffect } from 'react';
import { getApiMetadata } from '@/lib/api/metadata';
import { ApiEndpointMetadata } from '@/lib/api/types';

export function useApiMetadata() {
  const [endpoints, setEndpoints] = useState<ApiEndpointMetadata[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    loadEndpoints();
  }, []);

  const loadEndpoints = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const metadata = await getApiMetadata();
      setEndpoints(metadata);
    } catch (err) {
      console.error('API 메타데이터 로드 오류:', err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshEndpoints = () => {
    loadEndpoints();
  };

  return {
    endpoints,
    isLoading,
    error,
    refreshEndpoints
  };
}
