// /components/dashboard/cards/MovieStatsCard.tsx
import { useEffect, useState } from 'react';
import { Loader2, AlertTriangle, ListFilter, PlusCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { BaseCard } from './BaseCard';
import Link from 'next/link';
import { BUTTON_STYLES } from '@/lib/dashboard/constants';
import { MovieStats } from '@/lib/dashboard/types';
import { apiClient } from '@/lib/utils/api-client';

interface ApiRecentMovie {
  id: number;
  title: string;
  created_at: string; // snake_case (API 응답 형식)
  publishing_status: string; // snake_case (API 응답 형식)
}

// 타입 변환 함수
const mapToRecentMovie = (apiMovie: ApiRecentMovie) => ({
  id: apiMovie.id,
  title: apiMovie.title,
  createdAt: apiMovie.created_at, // camelCase로 변환
  publishingStatus: apiMovie.publishing_status // camelCase로 변환
});

const MovieStatsCard = () => {
  const [stats, setStats] = useState<MovieStats | null>(null);
  const [recentMovies, setRecentMovies] = useState<ApiRecentMovie[]>([]); // API 응답 타입 사용
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // 제네릭 타입 추가
        const statsData = await apiClient.get<MovieStats>('/admin/api/dashboard/movie-stats');
        setStats(statsData);
        
        // 제네릭 타입 추가
        const recentMoviesData = await apiClient.get<ApiRecentMovie[]>('/admin/api/dashboard/recent-movies');
        setRecentMovies(recentMoviesData);
        
      } catch (err) {
        setError(err instanceof Error ? err.message : "알 수 없는 오류");
        console.error("영화 정보 로드 오류:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
    
    // 5분마다 데이터 갱신
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-20">
          <Loader2 className="h-6 w-6 animate-spin text-[#ff6246]" />
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex items-center text-destructive">
          <AlertTriangle className="h-5 w-5 mr-2" />
          <p>{error}</p>
        </div>
      );
    }

    if (!stats || recentMovies.length === 0) {
      return (
        <div className="text-center text-muted-foreground">
          영화 정보를 불러올 수 없습니다
        </div>
      );
    }

    // 최근 영화 정보와 남은 편수 계산
    const latestMovie = recentMovies[0];
    const otherMoviesCount = Math.max(0, stats.total - 1);

    return (
      <div className="flex flex-col space-y-4">
        {/* 최근 등록된 영화 정보 */}
        <div className="border border-gray-200 rounded-md p-3 flex items-center justify-center">
          <p className="text-gray-500 font-bold text-center">
            {latestMovie?.title || '영화 정보 없음'} 외 {otherMoviesCount}편
          </p>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-50 p-3 rounded-md">
            <h4 className="text-sm font-medium mb-2 text-[#333333]">표시 유형</h4>
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <div className="flex items-center text-sm">
                  <span className="h-2 w-2 rounded-full bg-[#4da34c] mr-1.5" />
                  <span className="text-gray-500">항상 표시</span>
                </div>
                <span className="font-medium text-[#333333]">{stats?.visibility_types?.always || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center text-sm">
                  <span className="h-2 w-2 rounded-full bg-[#4da34c] mr-1.5" />
                  <span className="text-gray-500">기간 지정</span>
                </div>
                <span className="font-medium text-[#333333]">{stats?.visibility_types?.period || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center text-sm">
                  <span className="h-2 w-2 rounded-full bg-[#4da34c] mr-1.5" />
                  <span className="text-gray-500">숨김</span>
                </div>
                <span className="font-medium text-[#333333]">{stats?.visibility_types?.hidden || 0}</span>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-50 p-3 rounded-md">
            <h4 className="text-sm font-medium mb-2 text-[#333333]">게시 상태</h4>
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <div className="flex items-center text-sm">
                  <span className="h-2 w-2 rounded-full bg-[#ff6246] mr-1.5" />
                  <span className="text-gray-500">초안</span>
                </div>
                <span className="font-medium text-[#333333]">{stats?.publishing_statuses?.draft || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center text-sm">
                  <span className="h-2 w-2 rounded-full bg-[#ff6246] mr-1.5" />
                  <span className="text-gray-500">게시됨</span>
                </div>
                <span className="font-medium text-[#333333]">{stats?.publishing_statuses?.published || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center text-sm">
                  <span className="h-2 w-2 rounded-full bg-[#ff6246] mr-1.5" />
                  <span className="text-gray-500">보관됨</span>
                </div>
                <span className="font-medium text-[#333333]">{stats?.publishing_statuses?.archived || 0}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderFooter = () => (
    <div className="w-full grid grid-cols-2 gap-2">
      <Link href="/movies" target="_blank" rel="noopener noreferrer">
        <Button 
          variant="outline" 
          className={BUTTON_STYLES.leftButton}
        >
          <ListFilter className="h-4 w-4 mr-2" />
          영화 목록
        </Button>
      </Link>
      <Link href="/movies/create" target="_blank" rel="noopener noreferrer">
        <Button 
          variant="outline"
          className={BUTTON_STYLES.rightButton}
        >
          <PlusCircle className="h-4 w-4 mr-2" />
          영화 등록
        </Button>
      </Link>
    </div>
  );
  
  return (
    <BaseCard
      id="movie-stats"
      title="영화 정보 관리"
      description="영화 정보 현황을 확인하세요"
      type="movie"
      footerContent={renderFooter()}
    >
      {renderContent()}
    </BaseCard>
  );
};

export default MovieStatsCard;
