// hooks/useMovies.ts
import { useQuery } from '@tanstack/react-query';
import { MovieResponse } from '@/types/movie';
import { apiClient } from '@/lib/utils/api-client';

interface MoviesQueryParams {
  title?: string;
  distributorId?: number;
  isPublic?: boolean;
  publishingStatus?: string;
  filmGenre?: string;
  skip?: number;
  limit?: number;
}

async function fetchMovies(params: MoviesQueryParams = {}): Promise<MovieResponse[]> {
  // URLSearchParams를 사용하여 쿼리 문자열 생성
  const queryParams = new URLSearchParams();
  
  // 존재하는 파라미터만 추가
  if (params.title) queryParams.append('title', params.title);
  if (params.distributorId) queryParams.append('distributor_id', params.distributorId.toString());
  if (params.isPublic !== undefined) queryParams.append('is_public', params.isPublic.toString());
  if (params.publishingStatus) queryParams.append('publishing_status', params.publishingStatus);
  if (params.filmGenre) queryParams.append('film_genre', params.filmGenre);
  if (params.skip !== undefined) queryParams.append('skip', params.skip.toString());
  if (params.limit !== undefined) queryParams.append('limit', params.limit.toString());
  
  const queryString = queryParams.toString();
  const url = `/admin/api/movies${queryString ? `?${queryString}` : ''}`;
  
  return apiClient.get<MovieResponse[]>(url);
}

export function useMovies(params: MoviesQueryParams = {}, options = {}) {
  return useQuery({
    queryKey: ['movies', params],
    queryFn: () => fetchMovies(params),
    ...options
  });
}

// 단일 영화 조회 함수
async function fetchMovie(id: number): Promise<MovieResponse> {
  return apiClient.get<MovieResponse>(`/admin/api/movies/${id}`);
}

export function useMovie(id: number, options = {}) {
  return useQuery({
    queryKey: ['movie', id],
    queryFn: () => fetchMovie(id),
    enabled: !!id, // id가 있을 때만 쿼리 실행
    ...options
  });
}
