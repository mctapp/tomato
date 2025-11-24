// components/production/ProductionAnalytics.tsx

'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Users, 
  Award,
  Calendar,
  Filter,
  Download,
  AlertCircle,
  Loader2,
  MessageSquare,
  Film,
  User,
  Gauge,
  ChevronRight,
  Target,
  RefreshCw,
  BarChart3,
  Layers
} from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { fetchApi } from '@/lib/api';
import { cn } from '@/lib/utils';

// 새로운 컴포넌트 import
import { PeriodOverviewDashboard } from './PeriodOverviewDashboard';
import { ComparisonAnalysis } from './ComparisonAnalysis';

// ── 타입 정의 ──────────────────────────────────────────────────────────

interface ArchiveProject {
  id: number;
  movieTitle: string;
  mediaType: string;
  assetName: string;
  workSpeedType: string;
  completionDate: string;
  totalDays: number;
  totalHours: number;
  overallEfficiency: number | null;
  averageQuality: number | null;
  projectSuccessRating: number | null;
}

interface ArchiveDetail {
  archiveInfo: {
    movieTitle: string;
    mediaType: string;
    assetName: string;
    workSpeedType: string;
    startDate: string;
    completionDate: string;
    totalDays: number;
    totalHours: number;
  };
  participants: {
    producer?: { name: string; role: string } | null;
    mainWriter?: { name: string; role: string } | null;
    reviewers?: Array<{ name: string; role: string }> | null;
    voiceArtists?: Array<{ name: string; role: string }> | null;
  };
  stageDurations: Record<string, number>;
  durationDays: number;
  efficiencyRating: string;
  qualityRating: string;
}

interface ProducerPerformance {
  producerName: string;
  totalProjects: number;
  averageEfficiency: number | null;
  averageQuality: number | null;
  averageDuration: number;
  mediaTypeBreakdown: Record<string, number>;
}

// ── 색상 팔레트 (토마토 + 세이지 그린 + 추가 색상) ────────────────────────────────────────────────────────

const COLORS = [
  '#ff6246', // 메인 토마토
  '#4da34c', // 세이지 그린
  '#ff7e66', // 연한 토마토
  '#66a866', // 연한 세이지
  '#ff9a86', // 더 연한 토마토
  '#f9c784', // 피치
  '#6eb5ff', // 스카이 블루
  '#8a3033'  // 버건디
];

// 단계별 색상 정의
const STAGE_COLORS: Record<string, string> = {
  '1': '#4da34c', // 세이지 그린 - 자료 준비
  '2': '#ff8c42', // 오렌지 - 대본 작성
  '3': '#6eb5ff', // 스카이 블루 - 녹음/편집
  '4': '#ff6246'  // 토마토 - 제작/배포
};

// 단계 번호 추출 함수
const getStageNumber = (stage: string): string => {
  return stage.replace('stage_', '').replace('stage', '');
};

// ── 타입 가드 및 검증 함수 ──────────────────────────────────────────────

const safeToFixed = (value: number | null | undefined, decimals: number = 1): string => {
  if (value === null || value === undefined || isNaN(value)) {
    return '0';
  }
  return value.toFixed(decimals);
};

const safeNumber = (value: number | null | undefined): number => {
  if (value === null || value === undefined || isNaN(value)) {
    return 0;
  }
  return value;
};

// ── 메인 컴포넌트 ──────────────────────────────────────────────────────

export function ProductionAnalytics() {
  const [activeTab, setActiveTab] = useState('overview');
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(new Date().getFullYear(), 0, 1), // 1월 1일
    to: new Date() // 오늘
  });
  const [mediaTypeFilter, setMediaTypeFilter] = useState<string>('all');
  const [speedTypeFilter, setSpeedTypeFilter] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 데이터 상태
  const [archiveProjects, setArchiveProjects] = useState<ArchiveProject[]>([]);
  const [selectedArchive, setSelectedArchive] = useState<ArchiveDetail | null>(null);
  const [producerData, setProducerData] = useState<ProducerPerformance[]>([]);
  const [totalArchiveCount, setTotalArchiveCount] = useState(0);

  // AbortController 관리
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());

  // ── 날짜 유틸리티 ──────────────────────────────────────────────

  const formatDateToISO = (date: Date): string => {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatDate = (dateString: string): string => {
    try {
      // ISO 날짜 형식 처리
      if (dateString.includes('-')) {
        const [year, month, day] = dateString.split('-');
        return `${year}.${month}.${day}`;
      }
      
      // Date 객체로 변환 시도
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return dateString; // 변환 실패시 원본 반환
      }
      
      return date.toLocaleDateString('ko-KR', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit' 
      }).replace(/\. /g, '.').replace('.', '');
    } catch {
      return dateString;
    }
  };

  // ── AbortController 관리 함수 ──────────────────────────────────────────

  const createAbortController = (key: string): AbortController => {
    const existing = abortControllersRef.current.get(key);
    if (existing) {
      existing.abort();
    }

    const controller = new AbortController();
    abortControllersRef.current.set(key, controller);
    return controller;
  };

  // ── 데이터 로딩 함수들 ──────────────────────────────────────────────

  const fetchArchiveProjects = useCallback(async () => {
    const controller = createAbortController('archiveProjects');

    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      if (dateRange?.from) params.append('start_date', formatDateToISO(dateRange.from));
      if (dateRange?.to) params.append('end_date', formatDateToISO(dateRange.to));
      if (mediaTypeFilter !== 'all') params.append('media_type_filter', mediaTypeFilter);
      if (speedTypeFilter !== 'all') params.append('work_speed_filter', speedTypeFilter);
      params.append('limit', '50');
      
      const url = `/admin/api/production/analytics/archives/list?${params.toString()}`;
      
      const response = await fetchApi<{
        archives: ArchiveProject[];
        pagination: { total: number };
      }>(url, { signal: controller.signal });
      
      if (!controller.signal.aborted) {
        setArchiveProjects(response.archives || []);
        setTotalArchiveCount(response.pagination?.total || 0);
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('아카이브 데이터 로딩 오류:', error);
        setError('아카이브 데이터를 불러오는데 실패했습니다.');
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [dateRange, mediaTypeFilter, speedTypeFilter]);

  const fetchArchiveDetail = useCallback(async (archiveId: number) => {
    const controller = createAbortController('archiveDetail');

    try {
      const url = `/admin/api/production/analytics/archives/${archiveId}`;
      const data = await fetchApi<ArchiveDetail>(url, { signal: controller.signal });
      
      if (!controller.signal.aborted) {
        setSelectedArchive(data);
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('아카이브 상세 데이터 로딩 오류:', error);
        setError('아카이브 상세 정보를 불러오는데 실패했습니다.');
      }
    }
  }, []);

  const fetchProducerPerformance = useCallback(async () => {
    const controller = createAbortController('producerPerformance');

    try {
      setLoading(true);
      setError(null);
      
      // 프로듀서 성과 API 엔드포인트가 구현되면 실제 API 호출로 변경
      // const response = await fetchApi<ProducerPerformance[]>('/admin/api/production/analytics/producer-performance');
      // setProducerData(response);
      
      // 임시로 빈 배열 설정
      setProducerData([]);
      
    } catch (error: unknown) {
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('프로듀서 성과 데이터 로딩 오류:', error);
        setError('프로듀서 성과 데이터를 불러오는데 실패했습니다.');
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, []);

  // ── 헬퍼 함수 ──────────────────────────────────────────────────────

  const getMediaTypeName = (type: string): string => {
    const names: Record<string, string> = {
      'AD': '음성해설', 'CC': '자막해설', 'SL': '수어해설',
      'AI': '음성소개', 'CI': '자막소개', 'SI': '수어소개',
      'AR': '음성리뷰', 'CR': '자막리뷰', 'SR': '수어리뷰'
    };
    return names[type] || type;
  };

  const getSpeedTypeName = (type: string): string => {
    const names: Record<string, string> = {
      'A': '빠름',
      'B': '보통',
      'C': '여유'
    };
    return names[type] || type;
  };

  const getStageName = (stageNum: string): string => {
    // stage_1, stage_2 형식의 키를 처리
    const stageNumber = stageNum.replace('stage_', '').replace('stage', '');
    
    const names: Record<string, string> = {
      '1': '자료 준비 및 섭외',
      '2': '해설대본 작성', 
      '3': '녹음/편집',
      '4': '선재 제작 및 배포'
    };
    
    return names[stageNumber] || names[stageNum] || `${stageNum}단계`;
  };

  const getEfficiencyBadge = (efficiency: number | null) => {
    if (efficiency === null) return null;
    
    if (efficiency >= 1.2) return <Badge className="bg-[#e6f4ea] text-[#1e7e34] border-[#4da34c]">우수</Badge>;
    if (efficiency >= 1.0) return <Badge className="bg-[#e3f2fd] text-[#1565c0] border-[#6eb5ff]">양호</Badge>;
    if (efficiency >= 0.8) return <Badge className="bg-[#fff3cd] text-[#856404] border-[#f9c784]">보통</Badge>;
    return <Badge className="bg-[#f8d7da] text-[#721c24] border-[#c75146]">개선필요</Badge>;
  };

  const getQualityBadge = (quality: number | null) => {
    if (quality === null) return null;
    
    if (quality >= 4.5) return <Badge className="bg-[#e6f4ea] text-[#1e7e34] border-[#4da34c]">최우수</Badge>;
    if (quality >= 4.0) return <Badge className="bg-[#e3f2fd] text-[#1565c0] border-[#6eb5ff]">우수</Badge>;
    if (quality >= 3.0) return <Badge className="bg-[#fff3cd] text-[#856404] border-[#f9c784]">양호</Badge>;
    return <Badge className="bg-[#f8d7da] text-[#721c24] border-[#c75146]">미흡</Badge>;
  };

  // ── Effect 훅 ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (activeTab === 'archive') {
      fetchArchiveProjects();
    } else if (activeTab === 'producer') {
      fetchProducerPerformance();
    }
    // overview와 comparison은 자체적으로 데이터를 로드함

    return () => {
      abortControllersRef.current.forEach(controller => controller.abort());
      abortControllersRef.current.clear();
    };
  }, [activeTab, fetchArchiveProjects, fetchProducerPerformance]);

  // ── CSV 다운로드 ──────────────────────────────────────────────────────

  const handleDownloadReport = async () => {
    try {
      setLoading(true);
      
      let csvData = '';
      let filename = '';

      if (activeTab === 'overview') {
        // 종합 대시보드는 자체 다운로드 기능 필요
        alert('종합 대시보드 다운로드 기능은 준비 중입니다.');
        return;
      } else if (activeTab === 'comparison') {
        // 비교 분석은 자체 다운로드 기능 필요
        alert('비교 분석 다운로드 기능은 준비 중입니다.');
        return;
      } else if (activeTab === 'archive') {
        const headers = ['영화', '유형', '작업속도', '완료일', '소요일', '효율성', '품질'];
        const rows = archiveProjects.map(project => [
          project.movieTitle,
          getMediaTypeName(project.mediaType),
          getSpeedTypeName(project.workSpeedType),
          formatDate(project.completionDate),
          project.totalDays.toString(),
          safeToFixed(project.overallEfficiency),
          safeToFixed(project.averageQuality)
        ]);
        
        csvData = [headers, ...rows].map(row => row.join(',')).join('\n');
        filename = `completed_projects_${new Date().toISOString().split('T')[0]}.csv`;
      } else if (activeTab === 'producer') {
        const headers = ['프로듀서', '프로젝트 수', '평균 효율성', '평균 품질', '평균 소요일'];
        const rows = producerData.map(producer => [
          producer.producerName,
          producer.totalProjects.toString(),
          safeToFixed(producer.averageEfficiency),
          safeToFixed(producer.averageQuality),
          safeToFixed(producer.averageDuration)
        ]);
        
        csvData = [headers, ...rows].map(row => row.join(',')).join('\n');
        filename = `producer_performance_${new Date().toISOString().split('T')[0]}.csv`;
      }

      if (csvData) {
        const blob = new Blob(['\uFEFF' + csvData], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
      }
      
    } catch (error) {
      console.error('다운로드 실패:', error);
      setError('보고서 다운로드에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // ── 로딩 및 에러 UI ──────────────────────────────────────────────────

  const LoadingState = () => (
    <div className="flex items-center justify-center p-12">
      <Loader2 className="w-8 h-8 animate-spin text-[#ff6246]" />
      <span className="ml-2 text-gray-600">데이터를 불러오는 중...</span>
    </div>
  );

  const ErrorState = () => (
    <Alert className="m-4 border-red-200 bg-red-50">
      <AlertCircle className="h-4 w-4 text-red-600" />
      <AlertDescription className="text-red-800 flex items-center justify-between">
        <span>{error}</span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchArchiveProjects()}
          className="ml-4"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          다시 시도
        </Button>
      </AlertDescription>
    </Alert>
  );

  const EmptyState = ({ message }: { message: string }) => (
    <div className="text-center py-12">
      <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">데이터가 없습니다</h3>
      <p className="text-gray-600">{message}</p>
    </div>
  );

  // ── 렌더링 ───────────────────────────────────────────────────────────

  return (
    <div className="max-w-[1200px] mx-auto p-6 space-y-6">
      {/* 헤더 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#333333]">제작 성과 분석</h1>
          <p className="text-muted-foreground mt-1">
            완료된 프로젝트와 작업자 성과를 분석합니다
          </p>
        </div>
        
        <div className="flex gap-3">
          <DatePickerWithRange
            date={dateRange}
            onDateChange={setDateRange}
          />
          <Button 
            variant="outline" 
            onClick={handleDownloadReport}
            disabled={loading}
            className="hover:bg-[#fff5f3] hover:text-[#ff6246] hover:border-[#ff6246]"
          >
            <Download className="w-4 h-4 mr-2" />
            보고서 다운로드
          </Button>
        </div>
      </div>

      {/* 에러 상태 */}
      {error && <ErrorState />}

      {/* 메인 탭 */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" className="data-[state=active]:bg-[#ff6246] data-[state=active]:text-white">
            <BarChart3 className="w-4 h-4 mr-2" />
            종합 대시보드
          </TabsTrigger>
          <TabsTrigger value="comparison" className="data-[state=active]:bg-[#ff6246] data-[state=active]:text-white">
            <Layers className="w-4 h-4 mr-2" />
            비교 분석
          </TabsTrigger>
          <TabsTrigger value="archive" className="data-[state=active]:bg-[#ff6246] data-[state=active]:text-white">
            <Award className="w-4 h-4 mr-2" />
            완료 프로젝트
          </TabsTrigger>
          <TabsTrigger value="producer" className="data-[state=active]:bg-[#ff6246] data-[state=active]:text-white">
            <Users className="w-4 h-4 mr-2" />
            프로듀서 성과
          </TabsTrigger>
          <TabsTrigger value="writer" className="data-[state=active]:bg-[#ff6246] data-[state=active]:text-white">
            <MessageSquare className="w-4 h-4 mr-2" />
            작가 성과
          </TabsTrigger>
        </TabsList>

        {/* 종합 대시보드 */}
        <TabsContent value="overview" className="space-y-6">
          <PeriodOverviewDashboard 
            dateRange={dateRange}
            onDataLoad={(data) => {
              console.log('Overview data loaded:', data);
            }}
          />
        </TabsContent>

        {/* 비교 분석 */}
        <TabsContent value="comparison" className="space-y-6">
          <ComparisonAnalysis dateRange={dateRange} />
        </TabsContent>

        {/* 완료 프로젝트 분석 */}
        <TabsContent value="archive" className="space-y-6">
          {/* 필터 */}
          <div className="flex gap-4 items-center">
            <Filter className="w-4 h-4 text-gray-500" />
            <Select value={mediaTypeFilter} onValueChange={setMediaTypeFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="미디어 유형" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="AD">음성해설</SelectItem>
                <SelectItem value="CC">자막해설</SelectItem>
                <SelectItem value="SL">수어해설</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={speedTypeFilter} onValueChange={setSpeedTypeFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="작업 속도" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="A">빠름</SelectItem>
                <SelectItem value="B">보통</SelectItem>
                <SelectItem value="C">여유</SelectItem>
              </SelectContent>
            </Select>
            
            <div className="ml-auto text-sm text-gray-600">
              총 {totalArchiveCount}개 프로젝트
            </div>
          </div>

          {loading ? (
            <LoadingState />
          ) : archiveProjects.length === 0 ? (
            <EmptyState message="선택한 조건에 완료된 프로젝트가 없습니다." />
          ) : (
            <>
              {/* 프로젝트 목록 테이블 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-[#ff6246]" />
                    완료 프로젝트 목록
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[300px]">영화</TableHead>
                        <TableHead className="w-[100px]">유형</TableHead>
                        <TableHead className="w-[80px]">속도</TableHead>
                        <TableHead className="w-[100px]">완료일</TableHead>
                        <TableHead className="w-[80px] text-right">소요일</TableHead>
                        <TableHead className="w-[100px] text-center">효율성</TableHead>
                        <TableHead className="w-[100px] text-center">품질</TableHead>
                        <TableHead className="w-[80px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {archiveProjects.map((project) => (
                        <TableRow 
                          key={project.id}
                          className="cursor-pointer hover:bg-gray-50"
                          onClick={() => fetchArchiveDetail(project.id)}
                        >
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <Film className="w-4 h-4 text-gray-400" />
                              {project.movieTitle}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {getMediaTypeName(project.mediaType)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant="outline" 
                              className={cn(
                                "text-xs",
                                project.workSpeedType === 'A' && "border-[#ff6246] text-[#ff6246] bg-[#fff5f3]",
                                project.workSpeedType === 'B' && "border-[#6eb5ff] text-[#6eb5ff] bg-[#e3f2fd]",
                                project.workSpeedType === 'C' && "border-[#4da34c] text-[#4da34c] bg-[#e6f4ea]"
                              )}
                            >
                              {getSpeedTypeName(project.workSpeedType)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {formatDate(project.completionDate)}
                          </TableCell>
                          <TableCell className="text-right">
                            {project.totalDays}일
                          </TableCell>
                          <TableCell className="text-center">
                            {getEfficiencyBadge(project.overallEfficiency)}
                          </TableCell>
                          <TableCell className="text-center">
                            {getQualityBadge(project.averageQuality)}
                          </TableCell>
                          <TableCell>
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* 선택된 프로젝트 상세 정보 */}
              {selectedArchive && (
                <Card className="border-[#ff6246]/20">
                  <CardHeader className="bg-[#fff5f3]">
                    <CardTitle className="flex items-center gap-2 text-[#ff6246]">
                      <Target className="w-5 h-5" />
                      프로젝트 상세 분석
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-2 gap-6">
                      {/* 기본 정보 */}
                      <div>
                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                          <Film className="w-4 h-4 text-[#ff6246]" />
                          기본 정보
                        </h3>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">영화:</span>
                            <span className="font-medium">{selectedArchive.archiveInfo.movieTitle}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">미디어 유형:</span>
                            <span className="font-medium">{getMediaTypeName(selectedArchive.archiveInfo.mediaType)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">작업 속도:</span>
                            <span className="font-medium">{getSpeedTypeName(selectedArchive.archiveInfo.workSpeedType)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">프로듀서:</span>
                            <span className="font-medium">
                              {selectedArchive.participants?.producer?.name || '-'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* 단계별 소요 시간 */}
                      <div>
                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                          <Clock className="w-4 h-4 text-[#ff6246]" />
                          단계별 소요 시간
                        </h3>
                        <div className="space-y-2">
                          {Object.entries(selectedArchive.stageDurations || {}).map(([stage, days]) => {
                            const maxDays = Math.max(...Object.values(selectedArchive.stageDurations || {}));
                            const percentage = (days / maxDays) * 100;
                            const isBottleneck = days === maxDays;
                            const stageNumber = getStageNumber(stage);
                            const stageColor = STAGE_COLORS[stageNumber] || '#ff6246';
                            
                            return (
                              <div key={stage} className="flex items-center gap-3">
                                <span className="text-sm text-gray-600 w-32">
                                  {getStageName(stage)}:
                                </span>
                                <div className="flex-1 bg-gray-200 rounded-full h-6 relative overflow-hidden">
                                  <div 
                                    className={cn(
                                      "h-full rounded-full transition-all"
                                    )}
                                    style={{ 
                                      width: `${percentage}%`,
                                      backgroundColor: isBottleneck ? '#c75146' : stageColor
                                    }}
                                  />
                                  <span className="absolute inset-0 flex items-center justify-center text-xs font-medium">
                                    {days}일
                                  </span>
                                </div>
                                {isBottleneck && (
                                  <Badge variant="destructive" className="text-xs">
                                    병목
                                  </Badge>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* 병목 구간 분석 차트 */}
                    <div className="mt-6">
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <Gauge className="w-4 h-4 text-[#ff6246]" />
                        작업 구간별 속도 비교
                      </h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={Object.entries(selectedArchive.stageDurations || {}).map(([stage, days]) => ({
                          stage: getStageName(stage),
                          days: days,
                          stageKey: stage
                        }))}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="stage" />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="days">
                            {Object.entries(selectedArchive.stageDurations || {}).map(([stage, days], index) => {
                              const maxDays = Math.max(...Object.values(selectedArchive.stageDurations || {}));
                              const stageNumber = getStageNumber(stage);
                              const color = days === maxDays ? '#c75146' : (STAGE_COLORS[stageNumber] || '#ff6246');
                              return (
                                <Cell 
                                  key={`cell-${index}`} 
                                  fill={color} 
                                />
                              );
                            })}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        {/* 프로듀서 성과 분석 */}
        <TabsContent value="producer" className="space-y-6">
          {loading ? (
            <LoadingState />
          ) : producerData.length === 0 ? (
            <EmptyState message="프로듀서 성과 데이터가 없습니다." />
          ) : (
            <>
              {/* 프로듀서별 성과 카드 */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {producerData.map((producer) => (
                  <Card key={producer.producerName} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <User className="w-5 h-5 text-[#ff6246]" />
                        {producer.producerName}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">담당 프로젝트</span>
                          <span className="text-2xl font-bold text-[#ff6246]">
                            {producer.totalProjects}
                          </span>
                        </div>
                        
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium text-gray-700">미디어 유형별 분포</h4>
                          <div className="space-y-1">
                            {Object.entries(producer.mediaTypeBreakdown).map(([type, count]) => (
                              <div key={type} className="flex justify-between text-xs">
                                <span className="text-gray-600">{getMediaTypeName(type)}</span>
                                <Badge variant="outline" className="text-xs">
                                  {count}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* 프로듀서 성과 차트 */}
              <Card>
                <CardHeader>
                  <CardTitle>프로듀서별 프로젝트 분포</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={producerData.map((producer, index) => ({
                          name: producer.producerName,
                          value: producer.totalProjects,
                          fill: COLORS[index % COLORS.length]
                        }))}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="value"
                        label
                      >
                        {producerData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* 작가 성과 분석 (미구현) */}
        <TabsContent value="writer" className="space-y-6">
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">작가 성과 분석</h3>
            <p className="text-gray-600 mb-4">
              해설작가별 성과를 분석하는 기능입니다.<br />
              현재 개발 중이며 곧 제공될 예정입니다.
            </p>
            <Button 
              disabled 
              className="mt-4"
              title="개발 예정 기능입니다"
            >
              개발 예정
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── 지표 카드 컴포넌트 ───────────────────────────────────────────────────

interface MetricCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  trend?: string;
  badge?: { text: string; color: string };
}

function MetricCard({ title, value, icon, trend, badge }: MetricCardProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <div className="flex items-center gap-2 mt-2">
              <p className="text-2xl font-bold">{value}</p>
              {badge && (
                <Badge className={`text-xs ${badge.color}`}>
                  {badge.text}
                </Badge>
              )}
            </div>
            {trend && (
              <div className="flex items-center mt-1">
                <TrendingUp className="w-3 h-3 text-green-500 mr-1" />
                <span className="text-xs text-green-600">{trend}</span>
              </div>
            )}
          </div>
          <div className="text-[#ff6246]">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
