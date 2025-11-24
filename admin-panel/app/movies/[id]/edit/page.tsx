// app/movies/[id]/edit/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { MovieForm } from "@/components/movies/MovieForm";
import { Movie, DistributorSimple } from "@/types/movie";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function EditMoviePage() {
  const params = useParams();
  const router = useRouter();
  const movieId = Number(params.id);
  
  const [movie, setMovie] = useState<Movie | null>(null);
  const [distributors, setDistributors] = useState<DistributorSimple[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!movieId) return;
      
      try {
        // 영화 정보와 배급사 목록 병렬로 가져오기
        const [movieResponse, distributorsResponse] = await Promise.all([
          fetch(`/admin/api/movies/${movieId}`),
          fetch('/admin/api/distributors')
        ]);

        if (!movieResponse.ok) {
          throw new Error("영화 정보를 불러오는데 실패했습니다");
        }
        
        if (!distributorsResponse.ok) {
          throw new Error("배급사 목록을 불러오는데 실패했습니다");
        }

        const movieData = await movieResponse.json();
        const distributorsData = await distributorsResponse.json();

        setMovie(movieData);
        setDistributors(distributorsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "알 수 없는 오류");
        console.error("데이터 로드 오류:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [movieId]);

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 flex justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (error || !movie) {
    return (
      <div className="container mx-auto py-6">
        <div className="bg-destructive/10 p-4 rounded-md text-destructive">
          {error || "영화 정보를 찾을 수 없습니다"}
        </div>
        <Button variant="outline" className="mt-4" onClick={() => router.push(`/movies/${movieId}`)}>
          <ArrowLeft className="h-4 w-4 mr-2" /> 상세 페이지로 돌아가기
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <PageHeader 
          heading="영화 수정"
          text={movie.title}
        />
        
        <Button variant="outline" onClick={() => router.push(`/movies/${movieId}`)}>
          <ArrowLeft className="h-4 w-4 mr-2" /> 상세 페이지로 돌아가기
        </Button>
      </div>

      <MovieForm 
        initialData={movie} 
        distributors={distributors} 
      />
    </div>
  );
}
