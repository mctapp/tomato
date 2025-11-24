// components/dashboard/api-explorer/DashboardApiPanel.tsx
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ApiExplorer } from "./ApiExplorer";
import { getApiMetadata } from "@/lib/api/metadata";
import { ApiEndpointMetadata } from "@/lib/api/types";
import { Loader2 } from "lucide-react";

export default function DashboardApiPanel() {
  const [endpoints, setEndpoints] = useState<ApiEndpointMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadEndpoints = async () => {
      try {
        setIsLoading(true);
        const data = await getApiMetadata();
        setEndpoints(data);
      } catch (error) {
        console.error('API 메타데이터 로드 실패:', error);
        setError('API 정보를 불러올 수 없습니다.');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadEndpoints();
  }, []);

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>API 탐색기</CardTitle>
          <CardDescription>
            토마토 시스템의 API 엔드포인트를 테스트할 수 있습니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] flex items-center justify-center">
            <div className="text-center">
              <p className="text-red-500 mb-4">{error}</p>
              <Button onClick={() => window.location.reload()}>
                다시 시도
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>API 탐색기</CardTitle>
          <CardDescription>
            토마토 시스템의 API 엔드포인트를 테스트할 수 있습니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-[#ff6246]" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return <ApiExplorer endpoints={endpoints} isLoading={isLoading} />;
}
