// app/movies/page.tsx - 요청된 변경사항 반영 버전
"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from '@/components/ui/card';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Pagination, 
  PaginationContent, 
  PaginationItem, 
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Plus, Search, Film, Eye, EyeOff, RefreshCw, Edit, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

// 접근성 자산 타입 매핑 (한글명 필요 없음)
const mediaTypes = ["AD", "CC", "SL", "AI", "CI", "SI", "AR", "CR", "SR"];

// 미디어 유형별 색상 설정 - 타입 명시적 정의
const getMediaTypeColor = (mediaType: string): string => {
  // 명시적으로 Record 타입 정의
  const colors: Record<string, string> = {
    'AD': 'bg-blue-500',
    'CC': 'bg-green-500',
    'SL': 'bg-purple-500',
    'AI': 'bg-blue-300',
    'CI': 'bg-green-300',
    'SI': 'bg-purple-300',
    'AR': 'bg-blue-200',
    'CR': 'bg-green-200',
    'SR': 'bg-purple-200',
  };
  
  return colors[mediaType] || 'bg-gray-500';
};

// SearchParams를 사용하는 컴포넌트를 분리
function MoviesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [movies, setMovies] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // 검색 및 필터 상태
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [filters, setFilters] = useState({
    visibilityType: "",
    isPublic: "",
  });
  
  // 페이지네이션 상태
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  
  // 접근성 자산 데이터 저장
  const [accessAssets, setAccessAssets] = useState<Record<number, any[]>>({});

  useEffect(() => {
    // URL 쿼리 파라미터에서 초기 상태 설정
    const search = searchParams.get("search") || "";
    const visibility = searchParams.get("visibility") || "";
    const publicState = searchParams.get("public") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    
    setSearchTerm(search);
    setFilters({
      visibilityType: visibility,
      isPublic: publicState,
    });
    setCurrentPage(page);
    setPageSize(limit);
    
    fetchMovies();
  }, [searchParams]);

  const fetchMovies = async () => {
    setIsLoading(true);
    try {
      // 실제 API 호출
      const response = await fetch("/admin/api/movies");
      if (!response.ok) {
        throw new Error("영화 목록을 불러오는데 실패했습니다");
      }
      const data = await response.json();
      setMovies(data);
      
      // 가짜 페이지네이션 로직
      setTotalPages(Math.ceil(data.length / pageSize));
      
      // 영화 ID별 접근성 자산 연결 정보 가져오기 (실제로는 API로 구현)
      const assetsMap: Record<number, any[]> = {};
      for (const movie of data) {
        try {
          const assetsResponse = await fetch(`/admin/api/access-assets/by-movie/${movie.id}`);
          if (assetsResponse.ok) {
            const assetsData = await assetsResponse.json();
            assetsMap[movie.id] = assetsData;
          }
        } catch (err) {
          console.error(`Movie ${movie.id} assets error:`, err);
        }
      }
      setAccessAssets(assetsMap);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : "알 수 없는 오류");
      console.error("영화 목록 로드 오류:", err);
    } finally {
      setIsLoading(false);
    }
  };
  
  // 검색 및 필터 핸들러
  const handleSearch = () => {
    setCurrentPage(1);
    updateQueryParams({
      ...filters,
      search: searchTerm,
      page: 1,
    });
  };
  
  const handleFilterChange = (key: string, value: string) => {
    // "all"은 빈 문자열로 변환
    const actualValue = value === "all" ? "" : value;
    
    setFilters(prev => ({ ...prev, [key]: actualValue }));
    setCurrentPage(1);
    
    updateQueryParams({
      ...filters,
      [key]: actualValue,
      search: searchTerm,
      page: 1,
    });
  };
  
  // 필터 초기화 핸들러
  const handleResetFilters = () => {
    setFilters({
      visibilityType: "",
      isPublic: "",
    });
    setSearchTerm("");
    setCurrentPage(1);
    router.push('/movies');
  };
  
  // 페이지 변경 핸들러
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    updateQueryParams({
      ...filters,
      search: searchTerm,
      page,
    });
  };
  
  // URL 쿼리 파라미터 업데이트
  const updateQueryParams = (params: Record<string, any>) => {
    const queryParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        queryParams.set(key, String(value));
      }
    });
    
    router.push(`/movies?${queryParams.toString()}`);
  };
  
  // 영화와 연결된 접근성 자산 목록 
  const getMovieAccessAssets = (movieId: number) => {
    return accessAssets[movieId] || [];
  };

  // 표시 유형 텍스트 가져오기
  const getVisibilityTypeText = (type: string) => {
    switch(type) {
      case 'always': return '항상 표시';
      case 'period': return '기간 지정';
      case 'hidden': return '숨김';
      default: return type || '-';
    }
  };

  // 필터링 및 페이지네이션된 데이터
  const filteredMovies = movies.filter(movie => {
    // 검색어로 필터링
    const matchesSearch = searchTerm
      ? movie.title?.toLowerCase().includes(searchTerm.toLowerCase())
      : true;
    
    // 표시 유형으로 필터링
    const matchesVisibilityType = filters.visibilityType
      ? movie.visibilityType === filters.visibilityType
      : true;
    
    // 공개 여부로 필터링
    const matchesPublic = filters.isPublic
      ? (filters.isPublic === "true" ? movie.isPublic : !movie.isPublic)
      : true;
    
    return matchesSearch && matchesVisibilityType && matchesPublic;
  });
  
  // 페이지네이션
  const paginatedMovies = filteredMovies.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <div className="max-w-[1200px] mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#333333]">영화 목록</h1>
          <p className="text-muted-foreground">
            전체 영화 {movies.length}개 중 {filteredMovies.length}개 표시 중
          </p>
        </div>
        <Button 
          onClick={() => router.push('/movies/create')}
          className="bg-[#4da34c] hover:bg-[#3d8c3c]"
        >
          <Plus className="mr-2 h-4 w-4" />
          영화 등록
        </Button>
      </div>

      <Card className="border border-gray-300 shadow-sm hover:shadow-md transition-all duration-300 rounded-xl overflow-hidden">
        <CardHeader className="p-4 pb-2 bg-white">
          <CardTitle className="text-lg font-medium text-[#333333] flex items-center">
            <Film className="h-5 w-5 mr-2 text-[#ff6246]" />
            영화 목록
          </CardTitle>
          <CardDescription>
            영화 정보를 관리하세요
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          {/* 검색 및 필터 섹션 */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="영화 제목으로 검색..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
              <Button variant="outline" onClick={handleSearch}>
                검색
              </Button>
            </div>
            
            <Separator />
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <div>
                <Select 
                  value={filters.visibilityType || "all"} 
                  onValueChange={(value) => handleFilterChange('visibilityType', value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="표시 유형 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">모든 표시 유형</SelectItem>
                    <SelectItem value="always">항상 표시</SelectItem>
                    <SelectItem value="period">기간 지정</SelectItem>
                    <SelectItem value="hidden">숨김</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Select 
                  value={filters.isPublic || "all"} 
                  onValueChange={(value) => handleFilterChange('isPublic', value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="공개 여부 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">모두 보기</SelectItem>
                    <SelectItem value="true">공개</SelectItem>
                    <SelectItem value="false">비공개</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex justify-end">
                <Button 
                  variant="outline" 
                  onClick={handleResetFilters}
                  className="flex items-center"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  필터 초기화
                </Button>
              </div>
            </div>
            
            <Separator />
            
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
              </div>
            ) : error ? (
              <div className="bg-destructive/10 p-4 rounded-md text-destructive">
                {error}
              </div>
            ) : paginatedMovies.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                검색 결과가 없습니다.
              </div>
            ) : (
              <div className="relative overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="w-[60px]">ID</TableHead>
                      <TableHead className="w-[200px]">영화 이름</TableHead>
                      <TableHead className="w-[120px]">감독</TableHead>
                      <TableHead className="w-[100px]">관람등급</TableHead>
                      <TableHead className="w-[120px]">배급사</TableHead>
                      <TableHead className="w-[150px]">접근성</TableHead>
                      <TableHead className="w-[100px]">표시 유형</TableHead>
                      <TableHead className="w-[120px]">작업</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedMovies.map((movie) => {
                      const assets = getMovieAccessAssets(movie.id);
                      return (
                        <TableRow key={movie.id} className="hover:bg-gray-50">
                          <TableCell className="font-medium">{movie.id}</TableCell>
                          <TableCell>
                            <Link 
                              href={`/movies/${movie.id}`}
                              className="font-medium text-[#333333] hover:text-[#ff6246] hover:underline"
                            >
                              {movie.title}
                            </Link>
                          </TableCell>
                          <TableCell>{movie.director || "-"}</TableCell>
                          <TableCell>{movie.filmRating || "-"}</TableCell>
                          <TableCell>{movie.distributor?.name || "-"}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {mediaTypes.map(type => {
                                const hasAsset = assets.some(asset => asset.mediaType === type);
                                return hasAsset ? (
                                  <Badge 
                                    key={type} 
                                    className={`${getMediaTypeColor(type)} text-white`}
                                  >
                                    {type}
                                  </Badge>
                                ) : null;
                              })}
                              {assets.length === 0 && <span className="text-gray-500 text-xs">-</span>}
                            </div>
                          </TableCell>
                          <TableCell>{getVisibilityTypeText(movie.visibilityType)}</TableCell>
                          <TableCell>
                            <div className="flex space-x-1">
                              <Button
                                size="icon"
                                variant="outline"
                                className="h-8 w-8 hover:bg-[#f5fbf5] hover:text-[#4da34c] hover:border-[#4da34c]"
                                onClick={() => router.push(`/movies/${movie.id}/edit`)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="outline"
                                className="h-8 w-8 hover:bg-[#fff5f3] hover:text-[#ff6246] hover:border-[#ff6246]"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="outline"
                                className="h-8 w-8"
                                onClick={() => router.push(`/movies/${movie.id}`)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
            
            {/* 페이지네이션 */}
            {totalPages > 1 && (
              <div className="flex justify-center mt-4">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        onClick={() => currentPage > 1 && handlePageChange(currentPage - 1)}
                        className={currentPage <= 1 ? 'pointer-events-none opacity-50' : ''}
                      />
                    </PaginationItem>
                    
                    {Array.from({ length: totalPages }).map((_, index) => {
                      const page = index + 1;
                      // 현재 페이지 주변 5개 페이지만 표시
                      if (
                        page === 1 || 
                        page === totalPages || 
                        (page >= currentPage - 2 && page <= currentPage + 2)
                      ) {
                        return (
                          <PaginationItem key={page}>
                            <PaginationLink
                              isActive={page === currentPage}
                              onClick={() => handlePageChange(page)}
                            >
                              {page}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      }
                      
                      if (
                        (page === currentPage - 3 && currentPage > 4) ||
                        (page === currentPage + 3 && currentPage < totalPages - 3)
                      ) {
                        return (
                          <PaginationItem key={`ellipsis-${page}`}>
                            <span className="flex h-9 w-9 items-center justify-center">...</span>
                          </PaginationItem>
                        );
                      }
                      
                      return null;
                    })}
                    
                    <PaginationItem>
                      <PaginationNext
                        onClick={() => currentPage < totalPages && handlePageChange(currentPage + 1)}
                        className={currentPage >= totalPages ? 'pointer-events-none opacity-50' : ''}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
            
            {/* 페이지 크기 선택 */}
            <div className="flex justify-end mt-2">
              <Select
                value={pageSize.toString()}
                onValueChange={(value) => {
                  setPageSize(Number(value));
                  setCurrentPage(1);
                  updateQueryParams({
                    ...filters,
                    search: searchTerm,
                    page: 1,
                    limit: value,
                  });
                }}
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="페이지 크기" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10개씩 보기</SelectItem>
                  <SelectItem value="20">20개씩 보기</SelectItem>
                  <SelectItem value="50">50개씩 보기</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// 영화 목록 페이지 - Suspense로 감싸진 구조
function MoviesPageContent() {
  return (
    <Suspense fallback={
      <div className="max-w-[1200px] mx-auto py-10 flex justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    }>
      <MoviesContent />
    </Suspense>
  );
}

// 영화 목록 페이지를 ProtectedRoute로 감싸서 내보내기
export default function MoviesPage() {
  return (
    <ProtectedRoute>
      <MoviesPageContent />
    </ProtectedRoute>
  );
}
