// components/dashboard/FileTypeDistributionCard.tsx
import { useStorageStats } from "@/hooks/data/useStorageStats";
import { CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { FileTypeDistribution } from "./FileTypeDistribution";

const COLORS = ['#ff6246', '#4da34c', '#ff7e66', '#ff9a86', '#c75146', '#8a3033'];

export function FileTypeDistributionCard() {
  const { data, isLoading, isError, error, refetch, isFetching } = useStorageStats();

  // 로딩 상태
  if (isLoading) {
    return (
      <CardContent className="pt-6">
        <Skeleton className="h-64 w-full rounded-lg" />
      </CardContent>
    );
  }

  // 에러 상태
  if (isError) {
    return (
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
    );
  }

  // 데이터가 없는 경우
  if (!data || !data.file_types || Object.keys(data.file_types).length === 0) {
    return (
      <CardContent className="pt-6">
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <p className="text-sm text-muted-foreground mb-4">
            파일 타입별 통계 정보가 없습니다.
          </p>
        </div>
      </CardContent>
    );
  }

  return (
    <>
      <CardContent className="pt-6">
        <FileTypeDistribution fileTypes={data.file_types} />
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

