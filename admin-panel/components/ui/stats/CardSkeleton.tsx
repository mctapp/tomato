// components/ui/stats/CardSkeleton.tsx
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Database } from "lucide-react";

export function CardSkeleton() {
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
        {/* 통계 항목 스켈레톤 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {Array(4).fill(0).map((_, i) => (
            <div key={i} className="bg-card rounded-lg p-3 border">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-4 rounded-full" />
              </div>
              <Skeleton className="h-8 w-20 mt-2" />
            </div>
          ))}
        </div>
        
        {/* 차트 스켈레톤 */}
        <div className="mb-6">
          <Skeleton className="h-4 w-32 mb-2" />
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
        
        <div>
          <Skeleton className="h-4 w-32 mb-2" />
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
      </CardContent>
      <CardFooter>
        <Skeleton className="h-9 w-24 rounded-md" />
        <Skeleton className="h-4 w-48 ml-auto" />
      </CardFooter>
    </Card>
  );
}
