// components/dashboard/StorageStatsCard.tsx
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useStorageStats } from "@/hooks/data/useStorageStats";
import { formatBytes } from "@/lib/utils/format";
import { Loader2, Database, FileText, Globe, Lock, RefreshCw } from "lucide-react";
import { StorageUsageChart } from "./StorageUsageChart";
import { FileTypeDistribution } from "./FileTypeDistribution";
import { StatItem } from "../ui/stats/StatItem";
import { CardSkeleton } from "../ui/stats/CardSkeleton";

export function StorageStatsCard() {
  const { data, isLoading, isError, error, refetch, isFetching } = useStorageStats();

  // 로딩 상태
  if (isLoading) {
    return <CardSkeleton />;
  }

  // 에러 상태
  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Database className="h-5 w-5 mr-2" />
            스토리지 사용 현황
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <p className="text-sm text-destructive mb-4">
              {error instanceof Error ? error.message : "스토리지 통계를 불러오는데 실패했습니다."}
            </p>
            <Button onClick={() => refetch()} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              다시 시도
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // 데이터가 없는 경우
  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Database className="h-5 w-5 mr-2" />
            스토리지 사용 현황
          </CardTitle>
          <CardDescription>S3 버킷 사용 통계</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <p className="text-sm text-muted-foreground mb-4">
              통계 정보가 없습니다.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Database className="h-5 w-5 mr-2" />
          스토리지 사용 현황
        </CardTitle>
        <CardDescription>S3 버킷 사용 통계</CardDescription>
      </CardHeader>
      <CardContent>
        {/* 주요 통계 요약 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatItem 
            title="총 파일" 
            value={data.total_files_count.toString()} 
            icon={<FileText className="h-4 w-4" />} 
          />
          <StatItem 
            title="공개 파일" 
            value={data.public_files_count.toString()} 
            icon={<Globe className="h-4 w-4" />} 
          />
          <StatItem 
            title="비공개 파일" 
            value={data.private_files_count.toString()} 
            icon={<Lock className="h-4 w-4" />} 
          />
          <StatItem 
            title="총 용량" 
            value={formatBytes(data.total_storage_bytes)} 
            icon={<Database className="h-4 w-4" />} 
          />
        </div>
        
        {/* 스토리지 사용량 도넛 차트 */}
        <div className="mb-6">
          <h3 className="text-sm font-medium mb-2">스토리지 사용량 비율</h3>
          <StorageUsageChart stats={data} />
        </div>
        
        {/* 파일 유형 분포 바 차트 */}
        <div>
          <h3 className="text-sm font-medium mb-2">파일 유형 분포</h3>
          <FileTypeDistribution fileTypes={data.file_types} />
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center"
        >
          {isFetching ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              갱신 중...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              통계 갱신
            </>
          )}
        </Button>
        <p className="text-xs text-muted-foreground ml-auto">
          마지막 갱신: {new Date().toLocaleString()}
        </p>
      </CardFooter>
    </Card>
  );
}
