// components/dashboard/api-explorer/ApiExplorer.tsx
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EndpointList } from "./EndpointList";
import { EndpointDetail } from "./EndpointDetail";
import { RequestBuilder } from "./RequestBuilder";
import { ResponseViewer } from "./ResponseViewer";
import { ApiEndpointMetadata } from "@/lib/api/types";

interface ApiExplorerProps {
  endpoints: ApiEndpointMetadata[];
  isLoading?: boolean;
}

export function ApiExplorer({ endpoints, isLoading = false }: ApiExplorerProps) {
  const [selectedEndpoint, setSelectedEndpoint] = useState<ApiEndpointMetadata | null>(null);
  const [activeView, setActiveView] = useState<'detail' | 'test'>('detail');
  const [apiResponse, setApiResponse] = useState<any>(null);
  const [isTestLoading, setIsTestLoading] = useState(false);

  const handleSelectEndpoint = (endpoint: ApiEndpointMetadata) => {
    setSelectedEndpoint(endpoint);
    setApiResponse(null);
  };

  const handleTestApi = async (requestData: any) => {
    if (!selectedEndpoint) return;
    
    setIsTestLoading(true);
    
    try {
      // API 호출 로직
      const response = await fetch(selectedEndpoint.path, {
        method: selectedEndpoint.method,
        headers: {
          'Content-Type': 'application/json',
          // 토큰 등 인증 정보 추가
        },
        body: selectedEndpoint.method !== 'GET' ? JSON.stringify(requestData) : undefined,
      });
      
      const data = await response.json();
      setApiResponse({
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries([...response.headers.entries()]),
        data,
      });
    } catch (error) {
      setApiResponse({
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    } finally {
      setIsTestLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-12 gap-6 h-full">
      {/* 엔드포인트 목록 */}
      <div className="col-span-4">
        <EndpointList
          endpoints={endpoints}
          selectedEndpoint={selectedEndpoint}
          onSelectEndpoint={handleSelectEndpoint}
          isLoading={isLoading}
        />
      </div>
      
      {/* 상세 정보 및 테스트 */}
      <div className="col-span-8 border border-gray-300 rounded-lg p-4">
        {selectedEndpoint ? (
          <Tabs value={activeView} onValueChange={(v: string) => setActiveView(v as 'detail' | 'test')}>
            <TabsList className="mb-4">
              <TabsTrigger value="detail">API 상세 정보</TabsTrigger>
              <TabsTrigger value="test">API 테스트</TabsTrigger>
            </TabsList>
            
            <TabsContent value="detail">
              <EndpointDetail endpoint={selectedEndpoint} />
            </TabsContent>
            
            <TabsContent value="test">
              <div className="grid grid-cols-1 gap-4">
                <RequestBuilder 
                  endpoint={selectedEndpoint}
                  onSubmit={handleTestApi}
                  isLoading={isTestLoading}
                />
                
                <ResponseViewer response={apiResponse} isLoading={isTestLoading} />
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          <Card className="h-full flex items-center justify-center p-6">
            <div className="text-center text-gray-500">
              <p>왼쪽 목록에서 API 엔드포인트를 선택하세요</p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
