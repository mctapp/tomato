// app/staffs/page.tsx
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
  Users,
  Edit,
  Trash2,
  User,
  Briefcase
} from 'lucide-react';
import { useStaffs, useDeleteStaff } from '@/hooks/useStaffs';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useDebounce } from '@/hooks/useDebounce';
import { 
  SKILL_LEVEL_OPTIONS, 
  GENDER_OPTIONS, 
  GENDER_DISPLAY 
} from '@/lib/constants/personnel';
import { 
  ROLE_OPTIONS,
  ROLE_DISPLAY,
  ROLE_COLORS
} from '@/lib/constants/staff';
import { getSkillLevelBadgeColor } from '@/lib/utils/personnel';
import { StaffSummary } from '@/types/staffs';

// 스태프 테이블 컴포넌트
interface StaffTableProps {
  staffs: StaffSummary[];
  isLoading: boolean;
  onView: (staff: StaffSummary) => void;
  onEdit: (staff: StaffSummary) => void;
  onDelete: (staff: StaffSummary) => void;
}

function StaffTable({ 
  staffs, 
  isLoading, 
  onView,
  onEdit,
  onDelete
}: StaffTableProps) {
  if (isLoading) {
    return (
      <div className="w-full py-24 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (staffs.length === 0) {
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
            <TableHead className="w-[200px]">스태프 정보</TableHead>
            <TableHead className="w-[80px]">레벨</TableHead>
            <TableHead className="w-[120px]">지역</TableHead>
            <TableHead className="w-[200px]">역할</TableHead>
            <TableHead>연락처</TableHead>
            <TableHead className="w-[80px]">대표작</TableHead>
            <TableHead className="w-[80px]">로그</TableHead>
            <TableHead className="w-[150px]">작업</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {staffs.map((staff) => (
            <TableRow key={staff.id} className="hover:bg-gray-50">
              <TableCell className="font-medium">{staff.id}</TableCell>
              <TableCell>
                <div className="flex items-center space-x-3">
                  {staff.profileImage ? (
                    <img 
                      src={staff.profileImage} 
                      alt={staff.name} 
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-gray-100 text-gray-800 flex items-center justify-center text-sm font-medium">
                      {staff.name?.slice(0, 2) || "??"}
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-[#333333] hover:text-[#ff6246] hover:underline">
                      <Link href={`/staffs/${staff.id}`}>{staff.name}</Link>
                    </p>
                    {staff.gender && (
                      <p className="text-xs text-gray-500">{GENDER_DISPLAY[staff.gender] || staff.gender}</p>
                    )}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Badge className={`${getSkillLevelBadgeColor(staff.skillLevel)} border`}>
                  Lv.{staff.skillLevel || '-'}
                </Badge>
              </TableCell>
              <TableCell>{staff.location || '-'}</TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {(staff.roles || []).slice(0, 2).map((role: string) => (
                    <Badge key={role} className={`text-xs ${ROLE_COLORS[role] || 'bg-gray-100 text-gray-800'}`}>
                      {ROLE_DISPLAY[role] || role}
                    </Badge>
                  ))}
                  {(staff.roles || []).length > 2 && (
                    <Badge variant="outline" className="text-xs">
                      +{(staff.roles || []).length - 2}
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div className="space-y-1">
                  {staff.phone && <p className="text-sm">{staff.phone}</p>}
                  {staff.email && <p className="text-xs text-gray-500">{staff.email}</p>}
                  {!staff.phone && !staff.email && <p className="text-sm">-</p>}
                </div>
              </TableCell>
              <TableCell className="text-center">
                <Badge variant="outline" className="bg-green-50">
                  {staff.portfoliosCount || 0}
                </Badge>
              </TableCell>
              <TableCell className="text-center">
                <Badge variant="outline" className="bg-purple-50">
                  {staff.workLogsCount || 0}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex space-x-1">
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-8 w-8 hover:bg-[#f5fbf5] hover:text-[#4da34c] hover:border-[#4da34c]"
                    onClick={() => onEdit(staff)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-8 w-8 hover:bg-[#fff5f3] hover:text-[#ff6246] hover:border-[#ff6246]"
                    onClick={() => onDelete(staff)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-8 w-8"
                    onClick={() => onView(staff)}
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

function StaffContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<{
    skillLevel?: number;
    role?: string;
    gender?: string;
  }>({
    skillLevel: undefined,
    role: undefined,
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
    roles: filters.role || undefined,
    genders: filters.gender || undefined,
    page: currentPage,
    limit: pageSize,
  };
  
  const { 
    data: staffsResponse, 
    isLoading, 
    refetch 
  } = useStaffs(apiFilters);
  
  // 페이지네이션 응답 처리
  const staffs = staffsResponse?.data || [];
  const paginationInfo = staffsResponse?.pagination;
  const totalCount = paginationInfo?.total || 0;
  const totalPages = paginationInfo?.totalPages || 1;
  
  const deleteStaffMutation = useDeleteStaff();
  
  useEffect(() => {
    const skillLevel = searchParams.get('skillLevel') ? parseInt(searchParams.get('skillLevel')!) : undefined;
    const role = searchParams.get('role') || undefined;
    const gender = searchParams.get('gender') || undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const search = searchParams.get('search') || '';
    
    setFilters({ 
      skillLevel, 
      role,
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
    
    router.push(`/staffs?${queryParams.toString()}`);
  };
  
  const handleResetFilters = () => {
    setFilters({ skillLevel: undefined, role: undefined, gender: undefined });
    setSearchTerm('');
    setCurrentPage(1);
    router.push('/staffs');
  };
  
  const handleViewStaff = (staff: StaffSummary) => {
    router.push(`/staffs/${staff.id}`);
  };
  
  const handleEditStaff = (staff: StaffSummary) => {
    router.push(`/staffs/${staff.id}/edit`);
  };
  
  const handleDeleteStaff = async (staff: StaffSummary) => {
    if (confirm('이 스태프를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      try {
        await deleteStaffMutation.mutateAsync(staff.id);
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
          <h1 className="text-2xl font-bold tracking-tight text-[#333333]">스태프 관리</h1>
          <p className="text-muted-foreground">스태프 정보와 대표작을 관리하세요.</p>
        </div>
        <Button 
          onClick={() => router.push('/staffs/create')}
          className="bg-[#4da34c] hover:bg-[#3d8c3c]"
        >
          <Plus className="mr-2 h-4 w-4" />
          스태프 등록
        </Button>
      </div>
      
      <Card className="border border-gray-300 shadow-sm hover:shadow-md transition-all duration-300 rounded-xl overflow-hidden">
        <CardHeader className="p-4 pb-2 bg-white">
          <CardTitle className="text-lg font-medium text-[#333333] flex items-center">
            <Users className="h-5 w-5 mr-2 text-[#ff6246]" />
            스태프 목록
          </CardTitle>
          <CardDescription>
            전체 스태프 {totalCount}명 중 {staffs.length}명 표시 중
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="스태프 이름으로 검색..."
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
            
            <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
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
                  value={filters.role || "all"} 
                  onValueChange={(value) => handleFilterChange('role', value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="역할 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">모든 역할</SelectItem>
                    {ROLE_OPTIONS.map((role) => (
                      <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>
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
            
            <StaffTable
              staffs={staffs}
              isLoading={isLoading}
              onView={handleViewStaff}
              onEdit={handleEditStaff}
              onDelete={handleDeleteStaff}
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

export default function StaffPage() {
  return (
    <ProtectedRoute>
      <Suspense fallback={
        <div className="max-w-[1200px] mx-auto py-10 flex justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      }>
        <StaffContent />
      </Suspense>
    </ProtectedRoute>
  );
}
