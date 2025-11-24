// app/movies/create/page.tsx
"use client";

import { useRouter } from "next/navigation"; // 라우터 추가
import { useEffect, useState } from "react";
import { MovieForm } from "@/components/movies/MovieForm";
import { DistributorSimple } from "@/types/movie";
import { PageHeader } from "@/components/ui/page-header";

export default function CreateMoviePage() {
  const router = useRouter(); // 라우터 추가
  const [distributors, setDistributors] = useState<DistributorSimple[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDistributors = async () => {
      try {
        const response = await fetch("/admin/api/distributors");
        if (!response.ok) {
          throw new Error("배급사 목록을 불러오는데 실패했습니다");
        }
        const data = await response.json();
        setDistributors(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "알 수 없는 오류");
        console.error("배급사 목록 로드 오류:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDistributors();
  }, []);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader 
        heading="영화 등록"
        text="새로운 영화 정보를 등록합니다"
      />

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
      ) : error ? (
        <div className="bg-destructive/10 p-4 rounded-md text-destructive">
          {error}
        </div>
      ) : (
        <MovieForm 
          distributors={distributors}
          onSubmit={(data) => {
            // 폼 제출 후 영화 목록 페이지로 이동
            router.push("/movies");
          }}
        />
      )}
    </div>
  );
}
