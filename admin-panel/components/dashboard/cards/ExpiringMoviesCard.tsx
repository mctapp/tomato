// /components/dashboard/cards/ExpiringMoviesCard.tsx
import { useEffect, useState } from 'react';
import { Loader2, Clock, AlertTriangle, ListFilter } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { BaseCard } from './BaseCard';
import { Progress } from "@/components/ui/progress";
import { format, differenceInDays } from 'date-fns';
import Link from 'next/link';
import { ExpiringMovie } from '@/lib/dashboard/types';
import { BUTTON_STYLES } from '@/lib/dashboard/constants';
import { apiClient } from '@/lib/utils/api-client'; // 추가된 부분

const ExpiringMoviesCard = () => {
  const [movies, setMovies] = useState<ExpiringMovie[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchExpiringMovies = async () => {
      try {
        setIsLoading(true);
        // apiClient 사용으로 변경
        const data = await apiClient.get<ExpiringMovie[]>('/admin/api/dashboard/expiring-movies');
        setMovies(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "알 수 없는 오류");
        console.error("만료 임박 영화 로드 오류:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchExpiringMovies();
    
    // 5분마다 데이터 갱신
    const interval = setInterval(fetchExpiringMovies, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  // 나머지 코드는 변경 없음
  // 만료까지 남은 일수 계산
  const getDaysRemaining = (endDateStr: string) => {
    const endDate = new Date(endDateStr);
    const now = new Date();
    return Math.max(0, differenceInDays(endDate, now));
  };

  // 만료 일수에 따른 색상 반환
  const getColorByDaysRemaining = (days: number) => {
    if (days <= 3) return "text-red-500";
    if (days <= 7) return "text-[#ff6246]"; // 토마토 컬러
    if (days <= 14) return "text-amber-500";
    return "text-[#4da34c]"; // 세이지 컬러
  };

  // 진행바 퍼센트 및 색상 계산 (30일 기준)
  const getProgressProps = (days: number) => {
    const percent = Math.min(100, Math.max(0, (days / 30) * 100));
    let color = "bg-[#4da34c]"; // 세이지 컬러
    
    if (days <= 3) color = "bg-red-500";
    else if (days <= 7) color = "bg-[#ff6246]"; // 토마토 컬러
    else if (days <= 14) color = "bg-amber-500";
    
    return { percent, color };
  };

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

    if (movies.length === 0) {
      return (
        <div className="text-center text-muted-foreground">
          만료 임박한 영화가 없습니다
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {movies.map((movie) => {
          const daysRemaining = getDaysRemaining(movie.endAt);
          const { percent, color } = getProgressProps(daysRemaining);
          const textColor = getColorByDaysRemaining(daysRemaining);
          
          return (
            <div key={movie.id} className="flex flex-col space-y-1">
              <div className="flex items-center justify-between">
                <Link 
                  href={`/movies/${movie.id}`}
                  className="font-medium hover:text-[#ff6246] hover:underline transition-colors truncate max-w-[70%]"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {movie.title}
                </Link>
                <div className={`flex items-center text-sm ${textColor}`}>
                  <Clock className="h-3 w-3 mr-1" />
                  <span>
                    {daysRemaining}일 남음
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Progress 
                  value={percent} 
                  className="h-2 bg-gray-100" 
                  indicatorClassName={color}
                />
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {format(new Date(movie.endAt), 'yyyy-MM-dd')}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderFooter = () => (
    <Link href="/movies" className="w-full" target="_blank" rel="noopener noreferrer">
      <Button 
        variant="outline" 
        className={BUTTON_STYLES.rightButton}
      >
        <ListFilter className="h-4 w-4 mr-2" />
        영화 목록
      </Button>
    </Link>
  );
  
  return (
    <BaseCard
      id="expiring-movies"
      title="만료 임박 영화"
      description="만료 기간이 임박한 영화 목록을 확인하세요"
      type="expiring-movie"
      footerContent={renderFooter()}
    >
      {renderContent()}
    </BaseCard>
  );
};

export default ExpiringMoviesCard;

