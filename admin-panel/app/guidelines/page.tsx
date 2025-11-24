// app/guidelines/page.tsx
"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from "sonner";
import { 
  BookOpen, 
  Plus, 
  FileText, 
  Search, 
  RefreshCw, 
  Filter,
  Edit,
  Trash2 
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Pagination, 
  PaginationContent, 
  PaginationItem, 
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Badge } from '@/components/ui/badge';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useDebounce } from '@/hooks/useDebounce';
import { format, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';

interface Guideline {
  id: number;
  name: string;
  type: string;
  field: string;
  fieldOther?: string;
  version: string;
  attachment?: string;
  createdAt: string;
  updatedAt: string;
}

// 실제 내용을 담당하는 컴포넌트
function GuidelinesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [guidelines, setGuidelines] = useState<Guideline[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  // 디바운스된 검색어 (500ms)
  const debouncedSearchKeyword = useDebounce(searchKeyword, 500);

  // URL 쿼리 파라미터에서 필터 초기화
  useEffect(() => {
    const type = searchParams.get('type') || 'all';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const search = searchParams.get('search') || '';
    
    setTypeFilter(type);
    setCurrentPage(page);
    setSearchKeyword(search);
  }, [searchParams]);

  useEffect(() => {
    fetchGuidelines();
  }, [typeFilter, debouncedSearchKeyword, currentPage, pageSize]); 

  const fetchGuidelines = async () => {
    setIsLoading(true);
    try {
      let url = '/admin/api/access-guidelines?';
      
      // 페이지네이션 파라미터
      url += `page=${currentPage}&limit=${pageSize}`;
      
      // 검색어 파라미터
      if (debouncedSearchKeyword) 
        url += `&keyword=${encodeURIComponent(debouncedSearchKeyword)}`;
      
      // 타입 필터 파라미터
      if (typeFilter && typeFilter !== 'all') 
        url += `&type=${encodeURIComponent(typeFilter)}`;

      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch guidelines');

      const data = await response.json();
      
      // 데이터 구조에 따라 조정 필요
      setGuidelines(Array.isArray(data.items) ? data.items : data);
      setTotalCount(data.total || data.length || 0);
    } catch (error) {
      console.error('Error fetching guidelines:', error);
      toast.error('가이드라인 목록을 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 검색어 변경 핸들러
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchKeyword(e.target.value);
  };

  // 엔터 키 처리
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    }
  };

  // 검색 핸들러
  const handleSearch = () => {
    setCurrentPage(1);
    updateQueryParams({
      type: typeFilter,
      search: searchKeyword,
      page: 1,
    });
  };

  // 타입 필터 변경 핸들러
  const handleTypeFilterChange = (value: string) => {
    setTypeFilter(value);
    setCurrentPage(1);
    updateQueryParams({
      type: value,
      search: searchKeyword,
      page: 1,
    });
  };

  // 필터 초기화 핸들러
  const handleResetFilters = () => {
    setTypeFilter('all');
    setSearchKeyword('');
    setCurrentPage(1);
    router.push('/guidelines');
  };

  // 페이지 변경 핸들러
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    updateQueryParams({
      type: typeFilter,
      search: searchKeyword,
      page,
    });
  };

  // URL 쿼리 파라미터 업데이트 헬퍼 함수
  const updateQueryParams = (params: Record<string, any>) => {
    const queryParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '' && value !== 'all') {
        queryParams.set(key, String(value));
      }
    });
    
    router.push(`/guidelines?${queryParams.toString()}`);
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'AD': return '음성해설';
      case 'CC': return '자막해설';
      case 'SL': return '수어해설';
      default: return type;
    }
  };

  const getFieldLabel = (field: string, fieldOther?: string) => {
    if (field === 'other' && fieldOther) return fieldOther;

    switch (field) {
      case 'movie': return '영화영상';
      case 'exhibition': return '전시회';
      case 'theater': return '연극';
      case 'musical': return '뮤지컬';
      case 'concert': return '콘서트';
      default: return field;
    }
  };

  // 총 페이지 수 계산
  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="max-w-[1200px] mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#333333]">접근성 제작 가이드라인</h1>
          <p className="text-muted-foreground">영화 접근성 제작 가이드라인을 관리하세요.</p>
        </div>
        <Button 
          onClick={() => router.push('/guidelines/create')}
          className="bg-[#4da34c] hover:bg-[#3d8c3c]"
        >
          <Plus className="mr-2 h-4 w-4" />
          새 가이드라인
        </Button>
      </div>

      <Card className="border border-gray-300 shadow-sm hover:shadow-md transition-all duration-300 rounded-xl overflow-hidden">
        <CardHeader className="p-4 pb-2 bg-white">
          <CardTitle className="text-lg font-medium text-[#333333] flex items-center">
            <BookOpen className="h-5 w-5 mr-2 text-[#ff6246]" />
            가이드라인 목록
          </CardTitle>
          <CardDescription>
            전체 가이드라인 {totalCount}개 중 {guidelines.length}개 표시 중
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
                  placeholder="가이드라인 이름으로 검색..."
                  className="pl-8"
                  value={searchKeyword}
                  onChange={handleSearchChange}
                  onKeyDown={handleKeyDown}
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
                  value={typeFilter} 
                  onValueChange={handleTypeFilterChange}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="유형 필터" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체 유형</SelectItem>
                    <SelectItem value="AD">음성해설(AD)</SelectItem>
                    <SelectItem value="CC">자막해설(CC)</SelectItem>
                    <SelectItem value="SL">수어해설(SL)</SelectItem>
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
            
            {/* 가이드라인 테이블 */}
            {isLoading ? (
              <div className="w-full py-24 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            ) : guidelines.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <p className="text-gray-500">검색 결과가 없습니다.</p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="w-[60px]">ID</TableHead>
                      <TableHead className="w-[300px]">가이드라인 정보</TableHead>
                      <TableHead className="w-[100px]">유형</TableHead>
                      <TableHead>분야</TableHead>
                      <TableHead className="w-[120px]">버전</TableHead>
                      <TableHead className="w-[120px]">생성일</TableHead>
                      <TableHead className="w-[150px]">작업</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {guidelines.map((guideline) => (
                      <TableRow key={guideline.id} className="hover:bg-gray-50">
                        <TableCell className="font-medium">{guideline.id}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-[#333333] hover:text-[#ff6246] hover:underline">
                              <Link href={`/guidelines/${guideline.id}`}>{guideline.name}</Link>
                            </p>
                            <div className="flex items-center mt-1">
                              {guideline.attachment && (
                                <Badge variant="outline" className="bg-blue-50 flex items-center">
                                  <FileText className="h-3 w-3 mr-1" />
                                  첨부파일
                                </Badge>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-blue-100 text-blue-800 border">
                            {getTypeLabel(guideline.type)}
                          </Badge>
                        </TableCell>
                        <TableCell>{getFieldLabel(guideline.field, guideline.fieldOther)}</TableCell>
                        <TableCell>{guideline.version}</TableCell>
                        <TableCell>
                          {format(parseISO(guideline.createdAt), 'yyyy-MM-dd', { locale: ko })}
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-1">
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-8 w-8 hover:bg-[#f5fbf5] hover:text-[#4da34c] hover:border-[#4da34c]"
                              onClick={() => router.push(`/guidelines/${guideline.id}/edit`)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-8 w-8 hover:bg-[#fff5f3] hover:text-[#ff6246] hover:border-[#ff6246]"
                              onClick={() => {
                                if (confirm('이 가이드라인을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
                                  // 가이드라인 삭제 API 호출
                                  fetch(`/admin/api/access-guidelines/${guideline.id}`, {
                                    method: 'DELETE'
                                  })
                                  .then(response => {
                                    if (!response.ok) throw new Error('삭제 실패');
                                    toast.success('가이드라인이 삭제되었습니다.');
                                    fetchGuidelines();
                                  })
                                  .catch(error => {
                                    console.error('Delete error:', error);
                                    toast.error('삭제 중 오류가 발생했습니다.');
                                  });
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-8 w-8"
                              onClick={() => router.push(`/guidelines/${guideline.id}`)}
                            >
                              <BookOpen className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
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
                    type: typeFilter,
                    search: searchKeyword,
                    page: 1,
                    limit: value,
                  });
                }}
              >
                <SelectTrigger className="w-[150px]">
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

// 메인 페이지 컴포넌트
export default function GuidelinesPage() {
  return (
    <ProtectedRoute>
      <Suspense fallback={
        <div className="max-w-[1200px] mx-auto py-10 flex justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      }>
        <GuidelinesContent />
      </Suspense>
    </ProtectedRoute>
  );
}
