// app/dashboard/api-explorer/page.tsx
"use client";

import { useState, useEffect } from "react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Search, ArrowLeft, Code, RefreshCw, ExternalLink, Copy, Play, Database, Key } from "lucide-react";
import { useRouter } from "next/navigation";
import { Role } from "@/types/auth";
import Link from "next/link";
import { ApiExplorer } from "@/components/dashboard/api-explorer/ApiExplorer";
import { EndpointList } from "@/components/dashboard/api-explorer/EndpointList";
import { EndpointDetail } from "@/components/dashboard/api-explorer/EndpointDetail";
import { getApiMetadata } from "@/lib/api/metadata";
import { useApiMetadata } from "@/hooks/api-explorer/useApiMetadata";
import { ApiEndpointMetadata } from "@/lib/api/types";
import { apiClient } from '@/lib/utils/api-client'; // 추가된 부분

export default function ApiExplorerPage() {
  const router = useRouter();
  const { endpoints, isLoading, error, refreshEndpoints } = useApiMetadata();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEndpoint, setSelectedEndpoint] = useState<ApiEndpointMetadata | null>(null);
  const [activeTab, setActiveTab] = useState("all");

  // 돌아가기
  const goToDashboard = () => {
    router.push('/dashboard');
  };

  // 검색어 필터링된 엔드포인트
  const filteredEndpoints = endpoints.filter(endpoint => {
    const matchesSearch =
      endpoint.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
      endpoint.description?.toLowerCase().includes(searchQuery.toLowerCase());

    if (activeTab === 'all') return matchesSearch;
    return matchesSearch && endpoint.tags?.includes(activeTab);
  });

  // 엔드포인트 선택
  const handleSelectEndpoint = (endpoint: ApiEndpointMetadata) => {
    setSelectedEndpoint(endpoint);
  };

  // 엔드포인트 URL 복사
  const copyEndpointUrl = () => {
    if (!selectedEndpoint) return;
    
    navigator.clipboard.writeText(selectedEndpoint.path)
      .then(() => toast.success('API 경로가 클립보드에 복사되었습니다'))
      .catch(() => toast.error('복사에 실패했습니다'));
  };

  // 카테고리 목록 생성
  const categories = Array.from(
    new Set(endpoints.map(endpoint => endpoint.category).filter((cat): cat is string => cat !== undefined))
  );

  return (
    <ProtectedRoute>
      <div className="max-w-[1200px] mx-auto py-10">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center">
            <Button 
              variant="ghost" 
              onClick={goToDashboard} 
              className="mr-2"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              대시보드로 돌아가기
            </Button>
            <h1 className="text-2xl font-bold">API 탐색기</h1>
          </div>
          
          <div>
            <Button 
              variant="outline" 
              onClick={refreshEndpoints}
              disabled={isLoading}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              API 목록 새로고침
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* 왼쪽 패널: API 목록 */}
          <div className="col-span-4">
            <Card className="h-[calc(100vh-180px)]">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">API 엔드포인트</CardTitle>
                <CardDescription>
                  시스템에서 사용 가능한 API 목록
                </CardDescription>
                <div className="relative mt-2">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="API 검색..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </CardHeader>

              <Tabs value={activeTab} onValueChange={setActiveTab} className="px-4">
                <TabsList className="w-full">
                  <TabsTrigger value="all">전체</TabsTrigger>
                  {categories.map(category => (
                    <TabsTrigger key={category} value={category}>
                      {category}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>

              <CardContent className="pt-2">
                <ScrollArea className="h-[calc(100vh-320px)]">
                  <EndpointList 
                    endpoints={filteredEndpoints}
                    selectedEndpoint={selectedEndpoint}
                    onSelectEndpoint={handleSelectEndpoint}
                  />
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* 오른쪽 패널: API 상세 및 테스트 */}
          <div className="col-span-8">
            <Card className="h-[calc(100vh-180px)]">
              {selectedEndpoint ? (
                <>
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">
                          {selectedEndpoint.path}
                        </CardTitle>
                        <CardDescription>
                          {selectedEndpoint.description}
                        </CardDescription>
                      </div>
                      <div className="flex space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={copyEndpointUrl}
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          URL 복사
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          문서 보기
                        </Button>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 mt-3">
                      <Badge variant="outline" className="bg-blue-50">
                        {selectedEndpoint.method}
                      </Badge>
                      {selectedEndpoint.requiredRoles?.map(role => (
                        <Badge key={role} variant="outline" className="bg-yellow-50">
                          <Key className="h-3 w-3 mr-1" /> 
                          {role}
                        </Badge>
                      ))}
                      <Badge variant="outline" className="bg-green-50">
                        {selectedEndpoint.category}
                      </Badge>
                    </div>
                  </CardHeader>

                  <Separator />

                  <CardContent className="pt-4">
                    <EndpointDetail endpoint={selectedEndpoint} />
                  </CardContent>
                </>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <Code className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">API 엔드포인트 선택</h3>
                    <p className="text-gray-500 max-w-md">
                      왼쪽 목록에서 API 엔드포인트를 선택하면 상세 정보와 테스트 도구가 여기에 표시됩니다.
                    </p>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
