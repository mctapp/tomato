// components/dashboard/StorageUsageCard.tsx
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useStorageStats } from "@/hooks/data/useStorageStats";
import { formatBytes } from "@/lib/utils/format";
import { Loader2, RefreshCw } from "lucide-react";
import { StorageUsageChart } from "./StorageUsageChart";
import { Skeleton } from "@/components/ui/skeleton";

const COLORS = ['#ff6246', '#ff7e66', '#ff9a86', '#ffb6a6', '#e84c30', '#d23a1f', '#ff8c42', '#f9c784'];

export function StorageUsageCard() {
  const { data, isLoading, isError, error, refetch, isFetching } = useStorageStats();

  // 로딩 상태
  if (isLoading) {
    return (
      <>
        <CardContent className="pt-6">
          <Skeleton className="h-64 w-full rounded-lg mb-4" />
          <div className="grid grid-cols-3 gap-2">
            {Array(3).fill(0).map((_, i) => (
              <div key={i} className="text-center">
                <Skeleton className="h-4 w-full mb-1" />
                <Skeleton className="h-6 w-4/5 mx-auto" />
              </div>
            ))}
          </div>
        </CardContent>
        <CardFooter>
          <Skeleton className="h-9 w-24 rounded-md" />
          <Skeleton className="h-4 w-48 ml-auto" />
        </CardFooter>
      </>
    );
  }

  // 에러 상태
  if (isError) {
    return (
      <>
        <CardContent className="pt-6">
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
      </>
    );
  }

  // 데이터가 없는 경우
  if (!data) {
    return (
      <>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <p className="text-sm text-muted-foreground mb-4">
              통계 정보가 없습니다.
            </p>
          </div>
        </CardContent>
      </>
    );
  }

  return (
    <>
      <CardContent className="pt-6">
        {/* 스토리지 사용량 도넛 차트 */}
        <div className="mb-4">
          <StorageUsageChart stats={data} />
        </div>

        {/* 주요 통계 요약 - 더 작게 표시 */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-xs text-muted-foreground public-files-label">공개 파일</p>
            <p className="text-sm font-semibold">{data.public_files_count}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground private-files-label">비공개 파일</p>
            <p className="text-sm font-semibold">{data.private_files_count}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">총 용량</p>
            <p className="text-sm font-semibold">{formatBytes(data.total_storage_bytes)}</p>
          </div>
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
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
            </>
          )}
        </Button>
        <p className="text-xs text-muted-foreground ml-auto">
           {new Date().toLocaleString()}
        </p>
      </CardFooter>
    </>
  );
}

