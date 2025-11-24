// app/voiceartists/page.tsx
'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Pagination, 
  PaginationContent, 
  PaginationItem, 
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Separator } from '@/components/ui/separator';
import { 
  Filter, 
  Plus, 
  Search, 
  Mic, 
  RefreshCw,
  Edit,
  Trash2,
  User,
  Volume2,
  Star
} from 'lucide-react';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useVoiceArtists, useDeleteVoiceArtist } from '@/hooks/useVoiceArtists';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useDebounce } from '@/hooks/useDebounce';
import { VoiceArtistSummary } from '@/types/voiceartists';

// 성별 옵션
const GENDER_OPTIONS = [
  { value: "male", label: "남성" },
  { value: "female", label: "여성" },
  { value: "other", label: "기타" },
  { value: "prefer_not_to_say", label: "미표시" }
];

// 성별 표시
const GENDER_DISPLAY: Record<string, string> = {
  'male': '남성',
  'female': '여성',
  'other': '기타',
  'prefer_not_to_say': '미표시'
};

// 레벨별 배지 색상
const getLevelBadgeColor = (level: number | undefined): string => {
  if (!level) return 'bg-gray-100 text-gray-800';
  if (level >= 7) return 'bg-purple-100 text-purple-800';
  if (level >= 5) return 'bg-green-100 text-green-800';
  if (level >= 3) return 'bg-blue-100 text-blue-800';
  return 'bg-gray-100 text-gray-800';
};

// 성우 테이블 컴포넌트
interface VoiceArtistTableProps {
  artists: VoiceArtistSummary[];
  isLoading: boolean;
  onViewArtist: (artist: VoiceArtistSummary) => void;
  onEditArtist: (artist: VoiceArtistSummary) => void;
  onDeleteArtist: (artist: VoiceArtistSummary) => void;
}

function VoiceArtistTable({ 
  artists, 
  isLoading, 
  onViewArtist,
  onEditArtist,
  onDeleteArtist
}: VoiceArtistTableProps) {
  const router = useRouter();
  
  if (isLoading) {
    return (
      <div className="w-full py-24 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (artists.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg">
        <p className="text-gray-500">검색 결과가 없습니다.</p>
      </div>
    );
  }
  
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50">
            <TableHead className="w-[60px]">ID</TableHead>
            <TableHead className="w-[200px]">성우 정보</TableHead>
            <TableHead className="w-[80px]">레벨</TableHead>
            <TableHead className="w-[120px]">지역</TableHead>
            <TableHead>연락처</TableHead>
            <TableHead className="w-[80px]">샘플 수</TableHead>
            <TableHead className="w-[150px]">작업</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {artists.map((artist) => (
            <TableRow key={artist.id} className="hover:bg-gray-50">
              <TableCell className="font-medium">{artist.id}</TableCell>
              <TableCell>
                <div className="flex items-center space-x-3">
                  {artist.profileImage ? (
                    <img 
                      src={artist.profileImage} 
                      alt={artist.voiceartistName} 
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-gray-100 text-gray-800 flex items-center justify-center text-sm font-medium">
                      {artist.voiceartistName?.slice(0, 2) || "??"}
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-[#333333] hover:text-[#ff6246] hover:underline">
                      <Link href={`/voiceartists/${artist.id}`}>{artist.voiceartistName}</Link>
                    </p>
                    {artist.voiceartistGender && (
                      <p className="text-xs text-gray-500">{GENDER_DISPLAY[artist.voiceartistGender] || artist.voiceartistGender}</p>
                    )}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Badge className={`${getLevelBadgeColor(artist.voiceartistLevel)} border`}>
                  Lv.{artist.voiceartistLevel || '-'}
                </Badge>
              </TableCell>
              <TableCell>{artist.voiceartistLocation || '-'}</TableCell>
              <TableCell>
                <div className="space-y-1">
                  {artist.voiceartistPhone && <p className="text-sm">{artist.voiceartistPhone}</p>}
                  {artist.voiceartistEmail && <p className="text-xs text-gray-500">{artist.voiceartistEmail}</p>}
                  {!artist.voiceartistPhone && !artist.voiceartistEmail && <p className="text-sm">-</p>}
                </div>
              </TableCell>
              <TableCell className="text-center">
                <Badge variant="outline" className="bg-blue-50">
                  {artist.samplesCount || 0}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex space-x-1">
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-8 w-8 hover:bg-[#f5fbf5] hover:text-[#4da34c] hover:border-[#4da34c]"
                    onClick={() => onEditArtist(artist)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-8 w-8 hover:bg-[#fff5f3] hover:text-[#ff6246] hover:border-[#ff6246]"
                    onClick={() => onDeleteArtist(artist)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-8 w-8"
                    onClick={() => onViewArtist(artist)}
                  >
                    <User className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function VoiceArtistContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // 페이지 상태
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<{
    level?: number;
    gender?: string;
  }>({
    level: undefined,
    gender: undefined,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  // 디바운스된 검색어
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  
  // API 필터 구성 - 백엔드와 일치하도록 수정
  const apiFilters = {
    keyword: debouncedSearchTerm || undefined,
    levels: filters.level ? filters.level.toString() : undefined,
    genders: filters.gender || undefined,
    page: currentPage,
    limit: pageSize,
  };
  
  // 성우 데이터 조회
  const { 
    data: artistsResponse, 
    isLoading, 
    refetch 
  } = useVoiceArtists(apiFilters);
  
  // 데이터 처리 - 수어통역사 페이지 방식 적용
  const artists = artistsResponse?.data || [];
  const paginationInfo = artistsResponse?.pagination;
  const totalCount = paginationInfo?.total || 0;
  const totalPages = paginationInfo?.totalPages || 1;
  
  // 삭제 액션 훅
  const deleteArtistMutation = useDeleteVoiceArtist();
  
  // URL 쿼리 파라미터에서 필터 초기화
  useEffect(() => {
    const level = searchParams.get('level') ? parseInt(searchParams.get('level')!) : undefined;
    const gender = searchParams.get('gender') || undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const search = searchParams.get('search') || '';
    
    setFilters({
      level,
      gender,
    });
    
    setCurrentPage(page);
    setSearchTerm(search);
  }, [searchParams]);
  
  // 필터 변경 핸들러
  const handleFilterChange = (key: string, value: any) => {
    // "all"은 undefined로 변환
    const actualValue = value === "all" ? undefined : value;
    
    setFilters(prev => ({ ...prev, [key]: actualValue }));
    setCurrentPage(1); // 필터 변경 시 첫 페이지로 이동
    
    // URL 쿼리 파라미터 업데이트
    updateQueryParams({
      ...filters,
      [key]: actualValue,
      page: 1,
    });
  };
  
  // 검색 핸들러
  const handleSearch = () => {
    setCurrentPage(1);
    updateQueryParams({
      ...filters,
      search: searchTerm,
      page: 1,
    });
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
  
  // URL 쿼리 파라미터 업데이트 헬퍼 함수
  const updateQueryParams = (params: Record<string, any>) => {
    const queryParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        queryParams.set(key, String(value));
      }
    });
    
    router.push(`/voiceartists?${queryParams.toString()}`);
  };
  
  // 필터 초기화 핸들러
  const handleResetFilters = () => {
    setFilters({
      level: undefined,
      gender: undefined,
    });
    setSearchTerm('');
    setCurrentPage(1);
    router.push('/voiceartists');
  };
  
  // 성우 상세 보기 핸들러
  const handleViewArtist = (artist: VoiceArtistSummary) => {
    router.push(`/voiceartists/${artist.id}`);
  };
  
  // 성우 수정 핸들러
  const handleEditArtist = (artist: VoiceArtistSummary) => {
    router.push(`/voiceartists/${artist.id}/edit`);
  };
  
  // 성우 삭제 핸들러
  const handleDeleteArtist = async (artist: VoiceArtistSummary) => {
    if (confirm('이 성우를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      try {
        await deleteArtistMutation.mutateAsync(artist.id);
        refetch();
      } catch (error) {
        console.error('Delete error:', error);
        alert('삭제 중 오류가 발생했습니다.');
      }
    }
  };

  return (
    <div className="max-w-[1200px] mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#333333]">성우 관리</h1>
          <p className="text-muted-foreground">성우 정보와 음성 샘플을 관리하세요.</p>
        </div>
        <Button 
          onClick={() => router.push('/voiceartists/create')}
          className="bg-[#4da34c] hover:bg-[#3d8c3c]"
        >
          <Plus className="mr-2 h-4 w-4" />
          성우 등록
        </Button>
      </div>
      
      <Card className="border border-gray-300 shadow-sm hover:shadow-md transition-all duration-300 rounded-xl overflow-hidden">
        <CardHeader className="p-4 pb-2 bg-white">
          <CardTitle className="text-lg font-medium text-[#333333] flex items-center">
            <Mic className="h-5 w-5 mr-2 text-[#ff6246]" />
            성우 목록
          </CardTitle>
          <CardDescription>
            전체 성우 {totalCount}명 중 {artists.length}명 표시 중
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
                  placeholder="성우 이름으로 검색..."
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
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
              <div>
                <Select 
                  value={filters.level?.toString() || "all"} 
                  onValueChange={(value) => handleFilterChange('level', value === "all" ? undefined : parseInt(value))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="레벨 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">모든 레벨</SelectItem>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((level) => (
                      <SelectItem key={level} value={level.toString()}>Lv.{level}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Select 
                  value={filters.gender || "all"} 
                  onValueChange={(value) => handleFilterChange('gender', value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="성별 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">모든 성별</SelectItem>
                    {GENDER_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex justify-end md:col-span-2">
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
            
            {/* 성우 테이블 */}
            <VoiceArtistTable
              artists={artists}
              isLoading={isLoading}
              onViewArtist={handleViewArtist}
              onEditArtist={handleEditArtist}
              onDeleteArtist={handleDeleteArtist}
            />
            
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
                  <SelectItem value="10">10명씩 보기</SelectItem>
                  <SelectItem value="20">20명씩 보기</SelectItem>
                  <SelectItem value="50">50명씩 보기</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// 메인 페이지 컴포넌트
export default function VoiceArtistPage() {
  return (
    <ProtectedRoute>
      <Suspense fallback={
        <div className="max-w-[1200px] mx-auto py-10 flex justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      }>
        <VoiceArtistContent />
      </Suspense>
    </ProtectedRoute>
  );
}
