// app/production/archive/page.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { 
  Search, 
  Filter, 
  Calendar, 
  Clock, 
  TrendingUp, 
  Award,
  Eye,
  Download,
  ArrowUpDown,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { 
  ProductionArchiveResponse,
  MediaType,
  WorkSpeedType,
  MEDIA_TYPE_NAMES,
  SPEED_TYPE_NAMES,
  isValidMediaType,
  isValidSpeedType
} from '@/types/production';
import { fetchApi } from '@/lib/api';

// ── 타입 정의 ──────────────────────────────────────────────────────────

interface ArchiveFilters {
  search: string;
  mediaType: string;
  workSpeed: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

interface PaginationInfo {
  limit: number;
  offset: number;
  total: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// API 응답용 타입 (snake_case)
interface ApiArchivedProject {
  id: number;
  movie_title: string;
  media_type: string;
  asset_name: string;
  work_speed_type: string;
  completion_date: string;
  total_days: number;
  total_hours: number | null;
  overall_efficiency: number | null;
  average_quality: number | null;
  project_success_rating: number | null;
}

interface ApiArchiveListResponse {
  archives: ApiArchivedProject[];
  pagination: PaginationInfo;
}

// ── 유틸리티 함수 ────────────────────────────────────────────────────────

const safeParseFloat = (value: number | null | undefined): number => {
  return value && !isNaN(value) ? Number(value) : 0;
};

const formatDateSafe = (dateString: string): string => {
  try {
    // UTC 날짜로 처리하여 시간대 문제 방지
    const date = new Date(dateString + 'T00:00:00Z');
    return date.toLocaleDateString('ko-KR', {
      timeZone: 'UTC',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  } catch (error) {
    console.error('날짜 파싱 오류:', error);
    return dateString; // fallback
  }
};

const getMediaTypeName = (type: string): string => {
  if (isValidMediaType(type)) {
    return MEDIA_TYPE_NAMES[type];
  }
  return type;
};

const getSpeedTypeName = (type: string): string => {
  if (isValidSpeedType(type)) {
    return SPEED_TYPE_NAMES[type];
  }
  return type;
};

// ── 메인 컴포넌트 ──────────────────────────────────────────────────────

export default function ProductionArchivePage() {
  return (
    <ProtectedRoute>
      <ProductionArchiveContent />
    </ProtectedRoute>
  );
}

function ProductionArchiveContent() {
  const [archives, setArchives] = useState<ApiArchivedProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo>({
    limit: 20,
    offset: 0,
    total: 0,
    hasNext: false,
    hasPrev: false
  });
  
  const [filters, setFilters] = useState<ArchiveFilters>({
    search: '',
    mediaType: '',
    workSpeed: '',
    sortBy: 'completion_date',
    sortOrder: 'desc'
  });

  // ── 데이터 로딩 (fetchApi 사용) ─────────────────────────────────────────

  const fetchArchives = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      if (filters.mediaType) params.append('media_type_filter', filters.mediaType);
      if (filters.workSpeed) params.append('work_speed_filter', filters.workSpeed);
      if (filters.search) params.append('search', filters.search);
      params.append('sort_by', filters.sortBy);
      params.append('sort_order', filters.sortOrder);
      params.append('limit', pagination.limit.toString());
      params.append('offset', pagination.offset.toString());
      
      const data = await fetchApi<ApiArchiveListResponse>(
        `/api/admin/production/analytics/archives/list?${params.toString()}`
      );
      
      setArchives(data.archives || []);
      setPagination(data.pagination || pagination);
      
    } catch (error: any) {
      console.error('아카이브 데이터 로딩 오류:', error);
      setError(error.message || '데이터를 불러오는데 실패했습니다.');
      setArchives([]);
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.limit, pagination.offset]);

  // 필터 변경 시 offset 리셋하고 다시 로드
  const handleFilterChange = useCallback((newFilters: Partial<ArchiveFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setPagination(prev => ({ ...prev, offset: 0 })); // 첫 페이지로 리셋
  }, []);

  useEffect(() => {
    fetchArchives();
  }, [fetchArchives]);

  // ── 엑셀 다운로드 기능 ──────────────────────────────────────────────────

  const handleExcelDownload = async () => {
    try {
      setLoading(true);
      
      // 전체 데이터 조회 (페이징 없이)
      const params = new URLSearchParams();
      if (filters.mediaType) params.append('media_type_filter', filters.mediaType);
      if (filters.workSpeed) params.append('work_speed_filter', filters.workSpeed);
      if (filters.search) params.append('search', filters.search);
      params.append('sort_by', filters.sortBy);
      params.append('sort_order', filters.sortOrder);
      params.append('limit', '1000'); // 최대 1000개
      params.append('offset', '0');
      
      const data = await fetchApi<ApiArchiveListResponse>(
        `/api/admin/production/analytics/archives/list?${params.toString()}`
      );
      
      const allArchives = data.archives || [];
      
      // CSV 데이터 생성
      const csvHeaders = [
        '영화 제목', '미디어 유형', '에셋명', '작업 속도', '완료일',
        '소요 기간(일)', '작업 시간(h)', '효율성', '품질', '성공도'
      ];
      
      const csvData = allArchives.map((archive: ApiArchivedProject) => [
        archive.movie_title,
        getMediaTypeName(archive.media_type),
        archive.asset_name,
        getSpeedTypeName(archive.work_speed_type),
        formatDateSafe(archive.completion_date),
        archive.total_days.toString(),
        archive.total_hours?.toFixed(1) || 'N/A',
        archive.overall_efficiency?.toFixed(2) || 'N/A',
        archive.average_quality?.toFixed(1) || 'N/A',
        archive.project_success_rating?.toString() || 'N/A'
      ]);
      
      const csvContent = [csvHeaders, ...csvData]
        .map(row => row.map((cell: string) => `"${cell}"`).join(','))
        .join('\n');
      
      // UTF-8 BOM 추가 (엑셀에서 한글 깨짐 방지)
      const blob = new Blob(['\uFEFF' + csvContent], { 
        type: 'text/csv;charset=utf-8;' 
      });
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `완료작업_아카이브_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      
    } catch (error: any) {
      console.error('엑셀 다운로드 실패:', error);
      alert('엑셀 다운로드에 실패했습니다: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // ── 상세보기 핸들러 ──────────────────────────────────────────────────────

  const handleViewDetail = (archiveId: number) => {
    // TODO: 상세보기 모달 구현 예정
    alert(`프로젝트 ID ${archiveId}의 상세 정보 기능을 준비 중입니다.`);
  };

  // ── 헬퍼 함수 ──────────────────────────────────────────────────────────

  const getEfficiencyBadge = (efficiency: number | null) => {
    if (!efficiency) return null;
    if (efficiency >= 1.2) return { text: '매우 우수', className: 'bg-green-100 text-green-800' };
    if (efficiency >= 1.0) return { text: '우수', className: 'bg-blue-100 text-blue-800' };
    if (efficiency >= 0.8) return { text: '보통', className: 'bg-yellow-100 text-yellow-800' };
    return { text: '개선필요', className: 'bg-red-100 text-red-800' };
  };

  const getQualityBadge = (quality: number | null) => {
    if (!quality) return null;
    if (quality >= 4.5) return { text: '매우 우수', className: 'bg-green-100 text-green-800' };
    if (quality >= 4.0) return { text: '우수', className: 'bg-blue-100 text-blue-800' };
    if (quality >= 3.5) return { text: '보통', className: 'bg-yellow-100 text-yellow-800' };
    return { text: '개선필요', className: 'bg-red-100 text-red-800' };
  };

  // 통계 계산 (안전한 계산)
  const stats = {
    totalProjects: archives.length,
    avgDuration: archives.length > 0 
      ? (archives.reduce((sum, a) => sum + a.total_days, 0) / archives.length).toFixed(1)
      : '0',
    avgHours: archives.length > 0
      ? (archives.reduce((sum, a) => sum + safeParseFloat(a.total_hours), 0) / archives.length).toFixed(1)
      : '0',
    avgEfficiency: archives.length > 0
      ? (archives.reduce((sum, a) => sum + safeParseFloat(a.overall_efficiency), 0) / archives.length).toFixed(2)
      : '0'
  };

  // ── 렌더링 ───────────────────────────────────────────────────────────

  if (error && !loading) {
    return (
      <div className="p-6">
        <Alert className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error}
          </AlertDescription>
        </Alert>
        <Button onClick={() => window.location.reload()}>
          페이지 새로고침
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* 헤더 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">완료 작업 아카이브</h1>
          <p className="text-gray-600 mt-1">
            완료된 프로젝트의 성과와 이력을 조회합니다 (총 {pagination.total}개)
          </p>
        </div>
        
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            onClick={handleExcelDownload}
            disabled={loading || archives.length === 0}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            엑셀 다운로드
          </Button>
        </div>
      </div>

      {/* 필터 및 검색 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4 items-center">
            <div className="flex-1">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="영화 제목으로 검색..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange({ search: e.target.value })}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select 
              value={filters.mediaType} 
              onValueChange={(value) => handleFilterChange({ mediaType: value })}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="미디어 유형" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">전체</SelectItem>
                <SelectItem value="AD">음성해설</SelectItem>
                <SelectItem value="CC">자막해설</SelectItem>
                <SelectItem value="SL">수어해설</SelectItem>
                <SelectItem value="AI">음성소개</SelectItem>
                <SelectItem value="CI">자막소개</SelectItem>
                <SelectItem value="SI">수어소개</SelectItem>
              </SelectContent>
            </Select>

            <Select 
              value={filters.workSpeed} 
              onValueChange={(value) => handleFilterChange({ workSpeed: value })}
            >
              <SelectTrigger className="w-32">
                <SelectValue placeholder="작업 속도" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">전체</SelectItem>
                <SelectItem value="A">빠름</SelectItem>
                <SelectItem value="B">보통</SelectItem>
                <SelectItem value="C">여유</SelectItem>
              </SelectContent>
            </Select>

            <Select 
              value={`${filters.sortBy}_${filters.sortOrder}`} 
              onValueChange={(value) => {
                const [sortBy, sortOrder] = value.split('_');
                handleFilterChange({ sortBy, sortOrder: sortOrder as 'asc' | 'desc' });
              }}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="정렬" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="completion_date_desc">완료일 (최신순)</SelectItem>
                <SelectItem value="completion_date_asc">완료일 (오래된순)</SelectItem>
                <SelectItem value="total_days_asc">소요기간 (짧은순)</SelectItem>
                <SelectItem value="total_days_desc">소요기간 (긴순)</SelectItem>
                <SelectItem value="overall_efficiency_desc">효율성 (높은순)</SelectItem>
                <SelectItem value="average_quality_desc">품질 (높은순)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 통계 요약 */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          title="총 완료 프로젝트"
          value={`${stats.totalProjects}개`}
          icon={<Award className="w-5 h-5" />}
        />
        <StatCard
          title="평균 소요 기간"
          value={`${stats.avgDuration}일`}
          icon={<Calendar className="w-5 h-5" />}
        />
        <StatCard
          title="평균 작업 시간"
          value={`${stats.avgHours}h`}
          icon={<Clock className="w-5 h-5" />}
        />
        <StatCard
          title="평균 효율성"
          value={stats.avgEfficiency}
          icon={<TrendingUp className="w-5 h-5" />}
        />
      </div>

      {/* 아카이브 테이블 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            완료 프로젝트 목록
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400 mx-auto mb-2" />
              <div className="text-gray-500">로딩 중...</div>
            </div>
          ) : archives.length === 0 ? (
            <div className="text-center py-8">
              <Award className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">완료된 프로젝트가 없습니다.</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>영화 제목</TableHead>
                    <TableHead>미디어 유형</TableHead>
                    <TableHead>작업 속도</TableHead>
                    <TableHead>완료일</TableHead>
                    <TableHead>소요 기간</TableHead>
                    <TableHead>작업 시간</TableHead>
                    <TableHead>효율성</TableHead>
                    <TableHead>품질</TableHead>
                    <TableHead>성공도</TableHead>
                    <TableHead>액션</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {archives.map((archive) => (
                    <TableRow key={archive.id}>
                      <TableCell className="font-medium">
                        {archive.movie_title}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {getMediaTypeName(archive.media_type)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline"
                          className={
                            archive.work_speed_type === 'A' ? 'border-red-200 text-red-700' :
                            archive.work_speed_type === 'B' ? 'border-yellow-200 text-yellow-700' :
                            'border-green-200 text-green-700'
                          }
                        >
                          {getSpeedTypeName(archive.work_speed_type)}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDateSafe(archive.completion_date)}</TableCell>
                      <TableCell>{archive.total_days}일</TableCell>
                      <TableCell>
                        {archive.total_hours ? `${archive.total_hours.toFixed(1)}h` : 'N/A'}
                      </TableCell>
                      <TableCell>
                        {archive.overall_efficiency && getEfficiencyBadge(archive.overall_efficiency) ? (
                          <Badge className={getEfficiencyBadge(archive.overall_efficiency)!.className}>
                            {archive.overall_efficiency.toFixed(2)}
                          </Badge>
                        ) : (
                          <span className="text-gray-400">N/A</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {archive.average_quality && getQualityBadge(archive.average_quality) ? (
                          <Badge className={getQualityBadge(archive.average_quality)!.className}>
                            {archive.average_quality.toFixed(1)}/5
                          </Badge>
                        ) : (
                          <span className="text-gray-400">N/A</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {archive.project_success_rating ? (
                          <div className="flex items-center">
                            {Array.from({ length: 5 }, (_, i) => (
                              <Award
                                key={i}
                                className={`w-4 h-4 ${
                                  i < archive.project_success_rating! 
                                    ? 'text-yellow-400 fill-current' 
                                    : 'text-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400">N/A</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDetail(archive.id)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          상세보기
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* 페이징 */}
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-gray-500">
                  총 {pagination.total}개 중 {pagination.offset + 1}-{Math.min(pagination.offset + pagination.limit, pagination.total)}개 표시
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    disabled={!pagination.hasPrev || loading}
                    onClick={() => setPagination(prev => ({ 
                      ...prev, 
                      offset: Math.max(0, prev.offset - prev.limit) 
                    }))}
                  >
                    이전
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    disabled={!pagination.hasNext || loading}
                    onClick={() => setPagination(prev => ({ 
                      ...prev, 
                      offset: prev.offset + prev.limit 
                    }))}
                  >
                    다음
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── 통계 카드 컴포넌트 ───────────────────────────────────────────────────

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
}

function StatCard({ title, value, icon }: StatCardProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold mt-2">{value}</p>
          </div>
          <div className="text-gray-400">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
