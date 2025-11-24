// components/dashboard/api-explorer/ResponseViewer.tsx
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Copy, Clock } from "lucide-react";

interface ResponseViewerProps {
  response: any;
  isLoading: boolean;
}

export function ResponseViewer({ response, isLoading }: ResponseViewerProps) {
  const [activeTab, setActiveTab] = useState<'body' | 'headers'>('body');
  const [responseTime, setResponseTime] = useState<number | null>(null);

  // JSON 문자열 복사
  const copyJson = () => {
    if (!response) return;
    
    navigator.clipboard.writeText(JSON.stringify(response.data, null, 2))
      .catch(err => {
        console.error('클립보드 복사 실패:', err);
      });
  };

  // HTTP 응답 상태에 따른 배지 색상
  const getStatusBadgeColor = (status?: number) => {
    if (!status) return 'bg-gray-100 text-gray-700';
    
    if (status >= 200 && status < 300) {
      return 'bg-green-100 text-green-700';
    } else if (status >= 300 && status < 400) {
      return 'bg-blue-100 text-blue-700';
    } else if (status >= 400 && status < 500) {
      return 'bg-amber-100 text-amber-700';
    } else {
      return 'bg-red-100 text-red-700';
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span>API 응답</span>
            {response && (
              <Badge variant="outline" className={getStatusBadgeColor(response.status)}>
                {response.status} {response.statusText}
              </Badge>
            )}
            {responseTime && (
              <div className="text-xs text-gray-500 flex items-center">
                <Clock className="h-3 w-3 mr-1" />
                {responseTime}ms
              </div>
            )}
          </div>
          {response && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={copyJson}
            >
              <Copy className="h-4 w-4 mr-2" />
              JSON 복사
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-60">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !response ? (
          <div className="flex items-center justify-center h-60 text-gray-500">
            <p>아직 응답이 없습니다. 요청을 실행해 주세요.</p>
          </div>
        ) : response.error ? (
          <div className="bg-red-50 border border-red-100 rounded-md p-4 text-red-700">
            <p className="font-medium mb-1">오류 발생</p>
            <p>{response.error}</p>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={(v: string) => setActiveTab(v as any)}>
            <TabsList className="mb-4">
              <TabsTrigger value="body">응답 본문</TabsTrigger>
              <TabsTrigger value="headers">응답 헤더</TabsTrigger>
            </TabsList>
            
            <TabsContent value="body">
              <ScrollArea className="h-60 border rounded-md p-4 bg-gray-50">
                <pre className="text-sm font-mono">
                  {JSON.stringify(response.data, null, 2)}
                </pre>
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="headers">
              <ScrollArea className="h-60 border rounded-md">
                <div className="p-4 space-y-2">
                  {response.headers && Object.entries(response.headers).map(([key, value], index) => (
                    <div key={index} className="grid grid-cols-12 gap-4 text-sm">
                      <div className="col-span-4 font-medium text-gray-700">{key}:</div>
                      <div className="col-span-8 font-mono">{value as string}</div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
