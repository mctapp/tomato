// app/accessmedia/page.tsx
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { 
  Filter, 
  Plus, 
  Search, 
  FileType, 
  Settings, 
  Layers, 
  RefreshCw,
  Edit,
  Trash2,
  Download,
  Lock,
  Unlock
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
import { useAccessAssets, useDeleteAccessAsset, useUpdatePublishingStatus, useToggleLockStatus } from '@/hooks/useAccessAssets';
import { MEDIA_TYPES, LANGUAGES, PUBLISHING_STATUSES } from '@/types/accessAsset';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

// 현재 관리자 ID (실제로는 인증 시스템에서 가져와야 함)
const CURRENT_ADMIN_ID = 1;

// 언어 코드와 이름 매핑
const LANGUAGE_NAMES: Record<string, string> = {
  ko: '한국어',
  en: '영어',
  zh: '중국어',
  ja: '일본어',
  vi: '베트남어',
  tl: '타갈로그어',
  ne: '네팔어',
  id: '인도네시아어',
  km: '크메르어',
  my: '미얀마어',
  si: '싱할라어',
};

// 미디어 유형별 색상 설정
const getMediaTypeColor = (mediaType: string) => {
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

// 게시 상태별 배지 스타일
const getPublishingStatusBadge = (status: string) => {
  const variants: Record<string, { className: string, text: string }> = {
    'draft': { className: 'bg-gray-100', text: '초안' },
    'review': { className: 'bg-yellow-100', text: '검토 중' },
    'published': { className: 'bg-green-100', text: '게시됨' },
    'archived': { className: 'bg-gray-200', text: '보관됨' },
  };
  
  const variant = variants[status] || { className: '', text: status };
  
  return (
    <Badge variant="outline" className={variant.className}>
      {variant.text}
    </Badge>
  );
};

// 자산 테이블 컴포넌트 (기존 AccessAssetTable 대체)
function AccessAssetTableNew({ 
  assets, 
  isLoading, 
  onViewAsset,
  onEditAsset,
  onDeleteAsset,
  onDownloadAsset,
  onToggleLock,
  onChangePublishingStatus 
}: any) {
  const router = useRouter();
  
  if (isLoading) {
    return (
      <div className="w-full py-24 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (assets.length === 0) {
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
            <TableHead className="w-[100px]">유형</TableHead>
            <TableHead className="w-[80px]">언어</TableHead>
            <TableHead>이름</TableHead>
            <TableHead className="w-[120px]">상태</TableHead>
            <TableHead className="w-[80px]">공개</TableHead>
            <TableHead className="w-[80px]">잠금</TableHead>
            <TableHead className="w-[150px]">작업</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {assets.map((asset: any) => (
            <TableRow key={asset.id} className="hover:bg-gray-50">
              <TableCell className="font-medium">{asset.id}</TableCell>
              <TableCell>
                <Badge className={`${getMediaTypeColor(asset.mediaType)} text-white`}>
                  {asset.mediaType}
                </Badge>
              </TableCell>
              <TableCell>{LANGUAGE_NAMES[asset.language] || asset.language}</TableCell>
              <TableCell>
                <Link 
                  href={`/accessmedia/${asset.id}`} 
                  className="text-[#333333] hover:text-[#ff6246] hover:underline font-medium transition-colors"
                >
                  {asset.name}
                </Link>
              </TableCell>
              <TableCell>
                {getPublishingStatusBadge(asset.publishingStatus)}
              </TableCell>
              <TableCell>
                {asset.isPublic ? (
                  <Badge variant="outline" className="bg-green-100">공개</Badge>
                ) : (
                  <Badge variant="outline">비공개</Badge>
                )}
              </TableCell>
              <TableCell>
                {asset.isLocked ? (
                  <Badge variant="outline" className="bg-red-100">잠김</Badge>
                ) : (
                  <Badge variant="outline" className="bg-green-100">열림</Badge>
                )}
              </TableCell>
              <TableCell>
                <div className="flex space-x-1">
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-8 w-8 hover:bg-[#f5fbf5] hover:text-[#4da34c] hover:border-[#4da34c]"
                    onClick={() => onEditAsset(asset)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-8 w-8 hover:bg-[#fff5f3] hover:text-[#ff6246] hover:border-[#ff6246]"
                    onClick={() => onDeleteAsset(asset)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-8 w-8"
                    onClick={() => onDownloadAsset(asset)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-8 w-8"
                    onClick={() => onToggleLock(asset, !asset.isLocked)}
                  >
                    {asset.isLocked ? (
                      <Lock className="h-4 w-4" />
                    ) : (
                      <Unlock className="h-4 w-4" />
                    )}
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

function AccessMediaContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // 페이지 상태
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    mediaType: '',
    language: '',
    publishingStatus: '',
    isPublic: undefined as boolean | undefined,
    isLocked: undefined as boolean | undefined,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  // API 필터 구성
  const apiFilters = {
    search: searchTerm || undefined,
    mediaType: filters.mediaType || undefined,
    language: filters.language || undefined,
    publishingStatus: filters.publishingStatus || undefined,
    isPublic: filters.isPublic,
    isLocked: filters.isLocked,
    page: currentPage,
    limit: pageSize,
  };
  
  // 자산 데이터 조회 - 수정된 엔드포인트 사용 (/search)
  const { 
    data: assetsData, 
    isLoading, 
    refetch 
  } = useAccessAssets(apiFilters);
  
  // 데이터 구조 수정 - 배열에서 페이지네이션 객체로 변경
  const assets = assetsData || [];
  const totalCount = assets.length;
  const totalPages = Math.ceil(totalCount / pageSize);
  
  // 액션 훅
  const deleteAssetMutation = useDeleteAccessAsset();
  const updateStatusMutation = useUpdatePublishingStatus();
  const toggleLockMutation = useToggleLockStatus();
  
  // URL 쿼리 파라미터에서 필터 초기화
  useEffect(() => {
    const mediaType = searchParams.get('mediaType') || '';
    const language = searchParams.get('language') || '';
    const publishingStatus = searchParams.get('status') || '';
    const isPublic = searchParams.get('isPublic');
    const isLocked = searchParams.get('isLocked');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const search = searchParams.get('search') || '';
    
    setFilters({
      mediaType,
      language,
      publishingStatus,
      isPublic: isPublic === 'true' ? true : isPublic === 'false' ? false : undefined,
      isLocked: isLocked === 'true' ? true : isLocked === 'false' ? false : undefined,
    });
    
    setCurrentPage(page);
    setSearchTerm(search);
  }, [searchParams]);
  
  // 필터 변경 핸들러
  const handleFilterChange = (key: string, value: any) => {
    // "all"은 빈 문자열로 변환
    const actualValue = value === "all" ? "" : value;
    
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
  const updateQueryParams = (params: any) => {
    const queryParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        queryParams.set(key, String(value));
      }
    });
    
    router.push(`/accessmedia?${queryParams.toString()}`);
  };
  
  // 필터 초기화 핸들러
  const handleResetFilters = () => {
    setFilters({
      mediaType: '',
      language: '',
      publishingStatus: '',
      isPublic: undefined,
      isLocked: undefined,
    });
    setSearchTerm('');
    setCurrentPage(1);
    router.push('/accessmedia');
  };
  
  // 자산 상세 보기 핸들러
  const handleViewAsset = (asset: any) => {
    router.push(`/accessmedia/${asset.id}`);
  };
  
  // 자산 수정 핸들러
  const handleEditAsset = (asset: any) => {
    router.push(`/accessmedia/${asset.id}/edit`);
  };
  
  // 자산 삭제 핸들러
  const handleDeleteAsset = async (asset: any) => {
    if (confirm('이 자산을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      try {
        await deleteAssetMutation.mutateAsync(asset.id);
        refetch();
      } catch (error) {
        console.error('Delete error:', error);
        alert('삭제 중 오류가 발생했습니다.');
      }
    }
  };
  
  // 자산 다운로드 핸들러
  const handleDownloadAsset = (asset: any) => {
    router.push(`/accessmedia/${asset.id}/download`);
  };
  
  // 잠금 상태 변경 핸들러 - 수정된 부분 (API 경로 변경)
  const handleToggleLock = async (asset: any, isLocked: boolean) => {
    try {
      await toggleLockMutation.mutateAsync({
        assetId: asset.id,
        isLocked,
      });
      refetch();
    } catch (error) {
      console.error('Lock toggle error:', error);
      alert('잠금 상태 변경 중 오류가 발생했습니다.');
    }
  };
  
  // 게시 상태 변경 핸들러
  const handleChangePublishingStatus = async (asset: any, status: string) => {
    try {
      await updateStatusMutation.mutateAsync({
        assetId: asset.id,
        status,
      });
      refetch();
    } catch (error) {
      console.error('Status change error:', error);
      alert('게시 상태 변경 중 오류가 발생했습니다.');
    }
  };

  // 언어 필터 항목을 이름으로 표시
  const renderLanguageFilter = () => {
    return (
      <Select 
        value={filters.language || "all"} 
        onValueChange={(value) => handleFilterChange('language', value)}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="언어" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">모든 언어</SelectItem>
          {LANGUAGES.map((lang) => (
            <SelectItem key={lang} value={lang}>{LANGUAGE_NAMES[lang] || lang}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  };

  return (
    <div className="max-w-[1200px] mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#333333]">접근성 미디어 자산</h1>
          <p className="text-muted-foreground">접근성 미디어 자산을 관리하고 모니터링하세요.</p>
        </div>
        <Button 
          onClick={() => router.push('/accessmedia/create')}
          className="bg-[#4da34c] hover:bg-[#3d8c3c]"
        >
          <Plus className="mr-2 h-4 w-4" />
          새 자산 등록
        </Button>
      </div>
      
      <Card className="border border-gray-300 shadow-sm hover:shadow-md transition-all duration-300 rounded-xl overflow-hidden">
        <CardHeader className="p-4 pb-2 bg-white">
          <CardTitle className="text-lg font-medium text-[#333333] flex items-center">
            <FileType className="h-5 w-5 mr-2 text-[#ff6246]" />
            자산 목록
          </CardTitle>
          <CardDescription>
            전체 자산 {totalCount}개 중 {assets.length}개 표시 중
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
                  placeholder="자산 이름으로 검색..."
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
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-2">
              <div>
                <Select 
                  value={filters.mediaType || "all"} 
                  onValueChange={(value) => handleFilterChange('mediaType', value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="미디어 유형" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">모든 유형</SelectItem>
                    {MEDIA_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                {renderLanguageFilter()}
              </div>
              
              <div>
                <Select 
                  value={filters.publishingStatus || "all"} 
                  onValueChange={(value) => handleFilterChange('publishingStatus', value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="게시 상태" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">모든 상태</SelectItem>
                    {PUBLISHING_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>{status}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Select 
                  value={filters.isPublic === undefined ? "all" : filters.isPublic.toString()}
                  onValueChange={(value) => handleFilterChange('isPublic', value === "all" ? undefined : value === 'true')}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="공개 여부" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">모든 항목</SelectItem>
                    <SelectItem value="true">공개</SelectItem>
                    <SelectItem value="false">비공개</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Select 
                  value={filters.isLocked === undefined ? "all" : filters.isLocked.toString()}
                  onValueChange={(value) => handleFilterChange('isLocked', value === "all" ? undefined : value === 'true')}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="잠금 상태" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">모든 항목</SelectItem>
                    <SelectItem value="true">잠김</SelectItem>
                    <SelectItem value="false">열림</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
            
            <Separator />
            
            {/* 자산 테이블 (새 컴포넌트 사용) */}
            <AccessAssetTableNew
              assets={assets}
              isLoading={isLoading}
              onViewAsset={handleViewAsset}
              onEditAsset={handleEditAsset}
              onDeleteAsset={handleDeleteAsset}
              onDownloadAsset={handleDownloadAsset}
              onToggleLock={handleToggleLock}
              onChangePublishingStatus={handleChangePublishingStatus}
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
                      
                      // 생략 표시 (처음과 마지막 사이)
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
                  <SelectItem value="100">100개씩 보기</SelectItem>
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
export default function AccessMediaPage() {
  return (
    <ProtectedRoute>
      <Suspense fallback={
        <div className="max-w-[1200px] mx-auto py-10 flex justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      }>
        <AccessMediaContent />
      </Suspense>
    </ProtectedRoute>
  );
}
