// components/dashboard/api-explorer/EndpointDetail.tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ApiEndpointMetadata, ApiParameter } from "@/lib/api/types";
import { Key, Calendar, Info, Code } from "lucide-react";

interface EndpointDetailProps {
  endpoint: ApiEndpointMetadata;
}

export function EndpointDetail({ endpoint }: EndpointDetailProps) {
  // 매개변수 타입별 배지 색상
  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'string':
        return 'bg-blue-50 text-blue-700';
      case 'number':
        return 'bg-purple-50 text-purple-700';
      case 'boolean':
        return 'bg-amber-50 text-amber-700';
      case 'object':
        return 'bg-green-50 text-green-700';
      case 'array':
        return 'bg-red-50 text-red-700';
      default:
        return 'bg-gray-50 text-gray-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* 엔드포인트 기본 정보 */}
      <div>
        <h3 className="text-lg font-medium mb-2">엔드포인트 정보</h3>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          <div>
            <span className="text-sm font-medium text-gray-500">경로:</span>
            <p className="font-mono text-sm">{endpoint.path}</p>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-500">메서드:</span>
            <p>{endpoint.method}</p>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-500">카테고리:</span>
            <p>{endpoint.category}</p>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-500">필요 권한:</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {endpoint.requiredRoles?.map(role => (
                <Badge key={role} variant="outline" className="bg-yellow-50">
                  <Key className="h-3 w-3 mr-1" /> 
                  {role}
                </Badge>
              ))}
              {!endpoint.requiredRoles?.length && (
                <span className="text-sm text-gray-400">권한 없음</span>
              )}
            </div>
          </div>
          <div className="col-span-2">
            <span className="text-sm font-medium text-gray-500">설명:</span>
            <p className="text-sm">{endpoint.description}</p>
          </div>
        </div>
      </div>

      {/* 매개변수 정보 */}
      <Tabs defaultValue="parameters">
        <TabsList>
          <TabsTrigger value="parameters">매개변수</TabsTrigger>
          <TabsTrigger value="response">응답 형식</TabsTrigger>
          <TabsTrigger value="usage">사용 예시</TabsTrigger>
        </TabsList>
        
        <TabsContent value="parameters" className="mt-4">
          {endpoint.parameters?.length ? (
            <div className="space-y-4">
              <div className="grid grid-cols-12 gap-4 p-2 text-sm font-medium text-gray-500 border-b">
                <div className="col-span-3">이름</div>
                <div className="col-span-2">타입</div>
                <div className="col-span-2">필수 여부</div>
                <div className="col-span-5">설명</div>
              </div>
              
              {endpoint.parameters.map((param, index) => (
                <div key={index} className="grid grid-cols-12 gap-4 p-2 text-sm border-b last:border-b-0">
                  <div className="col-span-3 font-mono">{param.name}</div>
                  <div className="col-span-2">
                    <Badge variant="outline" className={getTypeBadgeColor(param.type)}>
                      {param.type}
                    </Badge>
                  </div>
                  <div className="col-span-2">
                    {param.required ? (
                      <Badge variant="default" className="bg-red-100 text-red-800 border-red-200">
                        필수
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-gray-500">
                        선택
                      </Badge>
                    )}
                  </div>
                  <div className="col-span-5">{param.description}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              매개변수가 없습니다
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="response" className="mt-4">
          <Card>
            <CardHeader className="py-2">
              <CardTitle className="text-sm">응답 예시</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[300px] border rounded-md p-4 bg-gray-50">
                <pre className="text-sm font-mono">
                  {JSON.stringify(endpoint.responseExample, null, 2)}
                </pre>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="usage" className="mt-4">
          <Card>
            <CardHeader className="py-2">
              <CardTitle className="text-sm">사용 예시</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-1">Fetch API</h4>
                  <div className="bg-gray-50 p-3 rounded-md">
                    <pre className="text-sm font-mono whitespace-pre-wrap">
                      {`fetch('${endpoint.path}', {
  method: '${endpoint.method}',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_TOKEN_HERE'
  }${endpoint.method !== 'GET' ? `,
  body: JSON.stringify({
    // 요청 데이터
  })` : ''}
})
.then(response => response.json())
.then(data => console.log(data))
.catch(error => console.error('Error:', error));`}
                    </pre>
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium mb-1">React Query</h4>
                  <div className="bg-gray-50 p-3 rounded-md">
                    <pre className="text-sm font-mono whitespace-pre-wrap">
                      {`const { data, isLoading, error } = useQuery(['${endpoint.path.split('/').pop() || 'data'}'], async () => {
  const response = await fetch('${endpoint.path}', {
    method: '${endpoint.method}',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer YOUR_TOKEN_HERE'
    }${endpoint.method !== 'GET' ? `,
    body: JSON.stringify({
      // 요청 데이터
    })` : ''}
  });
  
  if (!response.ok) {
    throw new Error('API 요청 실패');
  }
  
  return response.json();
});`}
                    </pre>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* 사용 정보 */}
      <div className="bg-blue-50 p-4 rounded-md flex items-start">
        <Info className="h-5 w-5 text-blue-500 mr-2 mt-0.5" />
        <div className="space-y-1">
          <p className="text-sm font-medium text-blue-700">
            이 API에 대한 정보
          </p>
          <p className="text-sm text-blue-600">
            <Calendar className="h-3 w-3 inline-block mr-1" />
            마지막 업데이트: {endpoint.lastUpdated || '정보 없음'}
          </p>
          <p className="text-sm text-blue-600">
            <Code className="h-3 w-3 inline-block mr-1" />
            이 API는 {endpoint.usageCount || 0}번 호출되었습니다.
          </p>
        </div>
      </div>
    </div>
  );
}
