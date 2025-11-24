// components/dashboard/api-explorer/EndpointList.tsx
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Search, Loader2 } from "lucide-react";
import { ApiEndpointMetadata } from "@/lib/api/types";

interface EndpointListProps {
  endpoints: ApiEndpointMetadata[];
  selectedEndpoint: ApiEndpointMetadata | null;
  onSelectEndpoint: (endpoint: ApiEndpointMetadata) => void;
  isLoading?: boolean;
}

export function EndpointList({
  endpoints,
  selectedEndpoint,
  onSelectEndpoint,
  isLoading = false
}: EndpointListProps) {
  const [searchQuery, setSearchQuery] = useState("");

  // 검색 필터링된 엔드포인트
  const filteredEndpoints = endpoints.filter(endpoint => 
    endpoint.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
    endpoint.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // HTTP 메서드별 색상 매핑
  const methodColors = {
    GET: "bg-blue-100 text-blue-800",
    POST: "bg-green-100 text-green-800",
    PUT: "bg-amber-100 text-amber-800",
    PATCH: "bg-purple-100 text-purple-800",
    DELETE: "bg-red-100 text-red-800"
  };

  return (
    <Card className="h-full">
      <CardContent className="p-4">
        <div className="relative mb-4">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="API 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredEndpoints.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            검색 결과가 없습니다
          </div>
        ) : (
          <ScrollArea className="h-[calc(100vh-260px)]">
            <div className="space-y-2">
              {filteredEndpoints.map((endpoint) => (
                <div
                  key={`${endpoint.method}-${endpoint.path}`}
                  onClick={() => onSelectEndpoint(endpoint)}
                  className={`p-3 rounded-md cursor-pointer transition-colors ${
                    selectedEndpoint?.path === endpoint.path
                      ? "bg-gray-100"
                      : "hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Badge 
                      variant="secondary"
                      className={methodColors[endpoint.method] || "bg-gray-100"}
                    >
                      {endpoint.method}
                    </Badge>
                    <span className="text-sm font-medium truncate">
                      {endpoint.path}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 truncate">
                    {endpoint.description}
                  </p>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
