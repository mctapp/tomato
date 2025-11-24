// app/scriptwriters/page.tsx
'use client';

import { PersonnelSummary } from '@/types/personnel';
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
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Plus, 
  Search, 
  RefreshCw,
  PenTool,
  Edit,
  Trash2,
  User
} from 'lucide-react';
import { useScriptwriters, useDeleteScriptwriter } from '@/hooks/useScriptwriters';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useDebounce } from '@/hooks/useDebounce';
import { 
  SKILL_LEVEL_OPTIONS, 
  GENDER_OPTIONS, 
  GENDER_DISPLAY 
} from '@/lib/constants/personnel';
import { 
  LANGUAGE_OPTIONS,
  LANGUAGE_DISPLAY,
  SPECIALTY_OPTIONS,
  SPECIALTY_DISPLAY,
  SPECIALTY_COLORS
} from '@/lib/constants/scriptwriter';
import { getSkillLevelBadgeColor } from '@/lib/utils/personnel';
import { ScriptwriterSummary } from '@/types/scriptwriters';

// 해설작가 테이블 컴포넌트
interface ScriptwriterTableProps {
  scriptwriters: ScriptwriterSummary[];
  isLoading: boolean;
  onView: (scriptwriter: ScriptwriterSummary) => void;
  onEdit: (scriptwriter: ScriptwriterSummary) => void;
  onDelete: (scriptwriter: ScriptwriterSummary) => void;
}

function ScriptwriterTable({ 
  scriptwriters, 
  isLoading, 
  onView,
  onEdit,
  onDelete
}: ScriptwriterTableProps) {
  if (isLoading) {
    return (
      <div className="w-full py-24 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (scriptwriters.length === 0) {
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
            <TableHead className="w-[200px]">해설작가 정보</TableHead>
            <TableHead className="w-[80px]">레벨</TableHead>
            <TableHead className="w-[120px]">지역</TableHead>
            <TableHead className="w-[120px]">사용언어</TableHead>
            <TableHead className="w-[100px]">해설분야</TableHead>
            <TableHead>연락처</TableHead>
            <TableHead className="w-[80px]">해설 수</TableHead>
            <TableHead className="w-[80px]">로그 수</TableHead>
            <TableHead className="w-[150px]">작업</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {scriptwriters.map((scriptwriter) => (
            <TableRow key={scriptwriter.id} className="hover:bg-gray-50">
              <TableCell className="font-medium">{scriptwriter.id}</TableCell>
              <TableCell>
                <div className="flex items-center space-x-3">
                  {scriptwriter.profileImage ? (
                    <img 
                      src={scriptwriter.profileImage} 
                      alt={scriptwriter.name} 
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-gray-100 text-gray-800 flex items-center justify-center text-sm font-medium">
                      {scriptwriter.name?.slice(0, 2) || "??"}
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-[#333333] hover:text-[#ff6246] hover:underline">
                      <Link href={`/scriptwriters/${scriptwriter.id}`}>{scriptwriter.name}</Link>
                    </p>
                    {scriptwriter.gender && (
                      <p className="text-xs text-gray-500">{GENDER_DISPLAY[scriptwriter.gender] || scriptwriter.gender}</p>
                    )}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Badge className={`${getSkillLevelBadgeColor(scriptwriter.skillLevel)} border`}>
                  Lv.{scriptwriter.skillLevel || '-'}
                </Badge>
              </TableCell>
              <TableCell>{scriptwriter.location || '-'}</TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {(scriptwriter.languages || []).slice(0, 2).map((code: string) => (
                    <Badge key={code} variant="outline" className="text-xs bg-blue-50 text-blue-700">
                      {LANGUAGE_DISPLAY[code] || code}
                    </Badge>
                  ))}
                  {(scriptwriter.languages || []).length > 2 && (
                    <Badge variant="outline" className="text-xs">
                      +{(scriptwriter.languages || []).length - 2}
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {(scriptwriter.specialties || []).map((type: string) => (
                    <Badge key={type} className={`text-xs ${SPECIALTY_COLORS[type] || 'bg-gray-100 text-gray-800'}`}>
                      {SPECIALTY_DISPLAY[type] || type}
                    </Badge>
                  ))}
                </div>
              </TableCell>
              <TableCell>
                <div className="space-y-1">
                  {scriptwriter.phone && <p className="text-sm">{scriptwriter.phone}</p>}
                  {scriptwriter.email && <p className="text-xs text-gray-500">{scriptwriter.email}</p>}
                  {!scriptwriter.phone && !scriptwriter.email && <p className="text-sm">-</p>}
                </div>
              </TableCell>
              <TableCell className="text-center">
                <Badge variant="outline" className="bg-green-50">
                  {scriptwriter.samplesCount || 0}
                </Badge>
              </TableCell>
              <TableCell className="text-center">
                <Badge variant="outline" className="bg-purple-50">
                  {scriptwriter.workLogsCount || 0}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex space-x-1">
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-8 w-8 hover:bg-[#f5fbf5] hover:text-[#4da34c] hover:border-[#4da34c]"
                    onClick={() => onEdit(scriptwriter)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-8 w-8 hover:bg-[#fff5f3] hover:text-[#ff6246] hover:border-[#ff6246]"
                    onClick={() => onDelete(scriptwriter)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-8 w-8"
                    onClick={() => onView(scriptwriter)}
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

function ScriptwriterContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<{
    skillLevel?: number;
    language?: string;
    specialty?: string;
    gender?: string;
  }>({
    skillLevel: undefined,
    language: undefined,
    specialty: undefined,
    gender: undefined,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  // 디바운스된 검색어
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  
  // API 필터 구성
  const apiFilters = {
    keyword: debouncedSearchTerm || undefined,
    skillLevels: filters.skillLevel ? filters.skillLevel.toString() : undefined,
    languages: filters.language || undefined,
    specialties: filters.specialty || undefined,
    genders: filters.gender || undefined,
    page: currentPage,
    limit: pageSize,
  };
  
  const { 
    data: scriptwritersResponse, 
    isLoading, 
    refetch 
  } = useScriptwriters(apiFilters);
  
  // 페이지네이션 응답 처리
  const scriptwriters = scriptwritersResponse?.data || [];
  const paginationInfo = scriptwritersResponse?.pagination;
  const totalCount = paginationInfo?.total || 0;
  const totalPages = paginationInfo?.totalPages || 1;
  
  const deleteScriptwriterMutation = useDeleteScriptwriter();
  
  useEffect(() => {
    const skillLevel = searchParams.get('skillLevel') ? parseInt(searchParams.get('skillLevel')!) : undefined;
    const language = searchParams.get('language') || undefined;
    const specialty = searchParams.get('specialty') || undefined;
    const gender = searchParams.get('gender') || undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const search = searchParams.get('search') || '';
    
    setFilters({ 
      skillLevel, 
      language,
      specialty,
      gender
    });
    setCurrentPage(page);
    setSearchTerm(search);
  }, [searchParams]);
  
  const handleFilterChange = (key: string, value: any) => {
    const actualValue = value === "all" ? undefined : value;
    
    setFilters(prev => ({ ...prev, [key]: actualValue }));
    setCurrentPage(1);
    
    updateQueryParams({
      ...filters,
      [key]: actualValue,
      page: 1,
    });
  };
  
  const handleSearch = () => {
    setCurrentPage(1);
    updateQueryParams({
      ...filters,
      search: searchTerm,
      page: 1,
    });
  };
  
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    updateQueryParams({
      ...filters,
      search: searchTerm,
      page,
    });
  };
  
  const updateQueryParams = (params: Record<string, any>) => {
    const queryParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        queryParams.set(key, String(value));
      }
    });
    
    router.push(`/scriptwriters?${queryParams.toString()}`);
  };
  
  const handleResetFilters = () => {
    setFilters({ skillLevel: undefined, language: undefined, specialty: undefined, gender: undefined });
    setSearchTerm('');
    setCurrentPage(1);
    router.push('/scriptwriters');
  };
  
  const handleViewScriptwriter = (scriptwriter: ScriptwriterSummary) => {
    router.push(`/scriptwriters/${scriptwriter.id}`);
  };
  
  const handleEditScriptwriter = (scriptwriter: ScriptwriterSummary) => {
    router.push(`/scriptwriters/${scriptwriter.id}/edit`);
  };
  
  const handleDeleteScriptwriter = async (scriptwriter: ScriptwriterSummary) => {
    if (confirm('이 해설작가를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      try {
        await deleteScriptwriterMutation.mutateAsync(scriptwriter.id);
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
          <h1 className="text-2xl font-bold tracking-tight text-[#333333]">해설작가 관리</h1>
          <p className="text-muted-foreground">해설작가 정보와 대표해설을 관리하세요.</p>
        </div>
        <Button 
          onClick={() => router.push('/scriptwriters/create')}
          className="bg-[#4da34c] hover:bg-[#3d8c3c]"
        >
          <Plus className="mr-2 h-4 w-4" />
          해설작가 등록
        </Button>
      </div>
      
      <Card className="border border-gray-300 shadow-sm hover:shadow-md transition-all duration-300 rounded-xl overflow-hidden">
        <CardHeader className="p-4 pb-2 bg-white">
          <CardTitle className="text-lg font-medium text-[#333333] flex items-center">
            <PenTool className="h-5 w-5 mr-2 text-[#ff6246]" />
            해설작가 목록
          </CardTitle>
          <CardDescription>
            전체 해설작가 {totalCount}명 중 {scriptwriters.length}명 표시 중
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="해설작가 이름으로 검색..."
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
            
            <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
              <div>
                <Select 
                  value={filters.skillLevel?.toString() || "all"} 
                  onValueChange={(value) => handleFilterChange('skillLevel', value === "all" ? undefined : parseInt(value))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="스킬 레벨 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">모든 스킬 레벨</SelectItem>
                    {SKILL_LEVEL_OPTIONS.map((skillLevel) => (
                      <SelectItem key={skillLevel.value} value={skillLevel.value.toString()}>
                        {skillLevel.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Select 
                  value={filters.language || "all"} 
                  onValueChange={(value) => handleFilterChange('language', value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="사용언어 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">모든 언어</SelectItem>
                    {LANGUAGE_OPTIONS.map((lang) => (
                      <SelectItem key={lang.value} value={lang.value}>{lang.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Select 
                  value={filters.specialty || "all"} 
                  onValueChange={(value) => handleFilterChange('specialty', value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="해설분야 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">모든 분야</SelectItem>
                    {SPECIALTY_OPTIONS.map((spec) => (
                      <SelectItem key={spec.value} value={spec.value}>{spec.label}</SelectItem>
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
            
            <ScriptwriterTable
              scriptwriters={scriptwriters}
              isLoading={isLoading}
              onView={handleViewScriptwriter}
              onEdit={handleEditScriptwriter}
              onDelete={handleDeleteScriptwriter}
            />
            
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

export default function ScriptwriterPage() {
  return (
    <ProtectedRoute>
      <Suspense fallback={
        <div className="max-w-[1200px] mx-auto py-10 flex justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      }>
        <ScriptwriterContent />
      </Suspense>
    </ProtectedRoute>
  );
}
