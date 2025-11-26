// components/dashboard/api-explorer/RequestBuilder.tsx
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Play, Loader2, PlusCircle, Trash2, Copy } from "lucide-react";
import { ApiEndpointMetadata, ApiParameter } from "@/lib/api/types";

interface RequestBuilderProps {
  endpoint: ApiEndpointMetadata;
  onSubmit: (requestData: any) => void;
  isLoading?: boolean;
}

export function RequestBuilder({ endpoint, onSubmit, isLoading = false }: RequestBuilderProps) {
  const [activeTab, setActiveTab] = useState<'params' | 'body' | 'headers'>(
    endpoint.method === 'GET' ? 'params' : 'body'
  );
  
  const [queryParams, setQueryParams] = useState<Record<string, string>>({});
  const [bodyData, setBodyData] = useState<string>('{}');
  const [headers, setHeaders] = useState<Record<string, string>>({
    'Content-Type': 'application/json',
    'Authorization': 'Bearer '
  });
  
  // 쿼리 파라미터 업데이트
  const updateQueryParam = (key: string, value: string) => {
    setQueryParams(prev => ({
      ...prev,
      [key]: value
    }));
  };
  
  // 헤더 업데이트
  const updateHeader = (key: string, value: string) => {
    setHeaders(prev => ({
      ...prev,
      [key]: value
    }));
  };
  
  // 헤더 추가
  const addHeader = () => {
    setHeaders(prev => ({
      ...prev,
      ['New-Header']: ''
    }));
  };
  
  // 헤더 삭제
  const removeHeader = (key: string) => {
    setHeaders(prev => {
      const newHeaders = { ...prev };
      delete newHeaders[key];
      return newHeaders;
    });
  };
  
  // 요청 실행
  const executeRequest = () => {
    try {
      // 쿼리 파라미터 구성
      const urlParams = new URLSearchParams();
      Object.entries(queryParams).forEach(([key, value]) => {
        if (value) urlParams.append(key, value);
      });
      
      // 요청 본문 처리
      let parsedBody = {};
      if (endpoint.method !== 'GET' && bodyData) {
        try {
          parsedBody = JSON.parse(bodyData);
        } catch (e) {
          console.error('JSON 파싱 오류:', e);
        }
      }
      
      // 최종 요청 데이터 구성
      const requestData = {
        url: `${endpoint.path}${urlParams.toString() ? `?${urlParams.toString()}` : ''}`,
        headers,
        body: parsedBody
      };
      
      onSubmit(requestData);
    } catch (error) {
      console.error('요청 실행 오류:', error);
    }
  };
  
  // JSON 문자열 복사
  const copyJsonTemplate = () => {
    // 엔드포인트 매개변수에 기반한 기본 JSON 템플릿 생성
    const template = (endpoint.parameters || [])
      .filter(param => param.in === 'body')
      .reduce<Record<string, any>>((obj, param) => {
        // 기본값 타입별 설정
        let defaultValue = null;
        switch (param.type) {
          case 'string':
            defaultValue = '';
            break;
          case 'number':
            defaultValue = 0;
            break;
          case 'boolean':
            defaultValue = false;
            break;
          case 'array':
            defaultValue = [];
            break;
          case 'object':
            defaultValue = {};
            break;
        }
        
        obj[param.name] = defaultValue;
        return obj;
      }, {});
    
    const jsonStr = JSON.stringify(template, null, 2);
    navigator.clipboard.writeText(jsonStr)
      .then(() => {
        // 클립보드 복사 성공 시 현재 편집기에도 적용
        setBodyData(jsonStr);
      })
      .catch(err => {
        console.error('클립보드 복사 실패:', err);
      });
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex justify-between items-center">
          <span>API 요청 구성</span>
          <Button 
            onClick={executeRequest} 
            disabled={isLoading}
            size="sm"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            실행
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(v: string) => setActiveTab(v as any)}>
          <TabsList className="mb-4">
            <TabsTrigger value="params" disabled={!(endpoint.parameters || []).some(p => p.in === 'query')}>
              쿼리 파라미터
            </TabsTrigger>
            <TabsTrigger value="body" disabled={endpoint.method === 'GET'}>
              요청 본문
            </TabsTrigger>
            <TabsTrigger value="headers">
              헤더
            </TabsTrigger>
          </TabsList>

          <TabsContent value="params">
            {(endpoint.parameters || []).filter(p => p.in === 'query').length > 0 ? (
              <div className="space-y-3">
                {(endpoint.parameters || [])
                  .filter(p => p.in === 'query')
                  .map((param, index) => (
                    <div key={index} className="grid grid-cols-12 gap-3 items-center">
                      <div className="col-span-4">
                        <Label htmlFor={`param-${param.name}`} className="flex items-center gap-2">
                          {param.name}
                          {param.required && (
                            <Badge variant="outline" className="bg-red-50 text-red-700 text-xs">
                              필수
                            </Badge>
                          )}
                        </Label>
                      </div>
                      <div className="col-span-8">
                        <Input
                          id={`param-${param.name}`}
                          value={queryParams[param.name] || ''}
                          onChange={(e) => updateQueryParam(param.name, e.target.value)}
                          placeholder={param.description}
                        />
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                쿼리 파라미터가 없습니다
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="body">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label htmlFor="request-body">요청 본문 (JSON)</Label>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={copyJsonTemplate}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  템플릿 생성
                </Button>
              </div>
              <Textarea
                id="request-body"
                value={bodyData}
                onChange={(e) => setBodyData(e.target.value)}
                className="font-mono h-40"
                placeholder="{ ... }"
              />
            </div>
          </TabsContent>
          
          <TabsContent value="headers">
            <div className="space-y-4">
              <div className="grid grid-cols-12 gap-3 items-center">
                <div className="col-span-5 font-medium text-sm text-gray-500">
                  헤더 이름
                </div>
                <div className="col-span-7 font-medium text-sm text-gray-500">
                  값
                </div>
              </div>
              
              {Object.entries(headers).map(([key, value], index) => (
                <div key={index} className="grid grid-cols-12 gap-3 items-center">
                  <div className="col-span-5">
                    <Input
                      value={key}
                      onChange={(e) => {
                        const newHeaders = { ...headers };
                        delete newHeaders[key];
                        newHeaders[e.target.value] = value;
                        setHeaders(newHeaders);
                      }}
                    />
                  </div>
                  <div className="col-span-6">
                    <Input
                      value={value}
                      onChange={(e) => updateHeader(key, e.target.value)}
                    />
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeHeader(key)}
                    >
                      <Trash2 className="h-4 w-4 text-gray-400 hover:text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={addHeader}
                className="w-full"
              >
                <PlusCircle className="h-4 w-4 mr-2" />
                헤더 추가
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
