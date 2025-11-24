// components/production/PeriodOverviewDashboard.tsx

'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Film,
  AlertCircle,
  Loader2,
  Zap,
  Target,
  BarChart3,
  Activity
} from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { fetchApi } from '@/lib/api';
import { cn } from '@/lib/utils';

// ── 타입 정의 ──────────────────────────────────────────────────────────

interface PeriodOverviewData {
  summary: {
    totalMovies: number;
    totalAssets: number;
    totalWorkHours: number;
    averageHoursPerAsset: number;
    averageDaysPerAsset: number;
    completionRate: number;
  };
  productivityTrend: {
    trend: 'increasing' | 'stable' | 'decreasing';
    changePercentage: number;
  };
  bottleneckAnalysis: Array<{
    stage: string;
    stageName: string;
    frequency: number;
    averageDelay: number;
  }>;
  dailyProductivity: Array<{
    date: string;
    completedAssets: number;
    workHours: number;
  }>;
  mediaTypeDistribution: Array<{
    type: string;
    name: string;
    count: number;
    percentage: number;
    averageHours: number;
  }>;
  efficiencyBySpeed: Array<{
    speedType: string;
    speedName: string;
    count: number;
    averageEfficiency: number;
    averageQuality: number;
  }>;
}

interface PeriodOverviewDashboardProps {
  dateRange?: DateRange;
  onDataLoad?: (data: PeriodOverviewData) => void;
}

// ── 색상 및 상수 정의 ──────────────────────────────────────────────────

const STAGE_COLORS: Record<string, string> = {
  '1': '#4da34c', // 세이지 그린
  '2': '#ff8c42', // 오렌지
  '3': '#6eb5ff', // 스카이 블루
  '4': '#ff6246'  // 토마토
};

const MEDIA_COLORS = {
  'AD': '#ff6246',
  'CC': '#4da34c',
  'SL': '#6eb5ff',
  'AI': '#ff8c42',
  'CI': '#f9c784',
  'SI': '#c75146',
  'AR': '#8a3033',
  'CR': '#66a866',
  'SR': '#ff9a86'
};

// ── 메인 컴포넌트 ──────────────────────────────────────────────────────

export function PeriodOverviewDashboard({ dateRange, onDataLoad }: PeriodOverviewDashboardProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PeriodOverviewData | null>(null);

  // 날짜 포맷 유틸리티
  const formatDateToISO = (date: Date): string => {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // 데이터 로딩
  useEffect(() => {
    const fetchOverviewData = async () => {
      if (!dateRange?.from || !dateRange?.to) return;

      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams({
          start_date: formatDateToISO(dateRange.from),
          end_date: formatDateToISO(dateRange.to)
        });

        const response = await fetchApi<PeriodOverviewData>(
          `/admin/api/production/analytics/period-overview?${params.toString()}`
        );

        setData(response);
        onDataLoad?.(response);
      } catch (err) {
        console.error('기간별 종합 데이터 로딩 오류:', err);
        setError('데이터를 불러오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchOverviewData();
  }, [dateRange, onDataLoad]);

  // 트렌드 아이콘 및 색상
  const getTrendIcon = (trend: string, percentage: number) => {
    if (trend === 'increasing') {
      return <TrendingUp className="w-4 h-4 text-green-600" />;
    } else if (trend === 'decreasing') {
      return <TrendingDown className="w-4 h-4 text-red-600" />;
    }
    return <Activity className="w-4 h-4 text-gray-600" />;
  };

  const getTrendColor = (trend: string) => {
    if (trend === 'increasing') return 'text-green-600';
    if (trend === 'decreasing') return 'text-red-600';
    return 'text-gray-600';
  };

  // 렌더링
  if (!dateRange?.from || !dateRange?.to) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          분석할 기간을 선택해주세요.
        </AlertDescription>
      </Alert>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-[#ff6246]" />
        <span className="ml-2 text-gray-600">종합 분석 데이터를 불러오는 중...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert className="border-red-200 bg-red-50">
        <AlertCircle className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-800">
          {error}
        </AlertDescription>
      </Alert>
    );
  }

  if (!data) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          표시할 데이터가 없습니다.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* 핵심 지표 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <MetricCard
          title="완료 영화"
          value={data.summary.totalMovies}
          icon={<Film className="w-5 h-5" />}
          color="text-[#ff6246]"
        />
        <MetricCard
          title="제작 미디어"
          value={data.summary.totalAssets}
          icon={<Target className="w-5 h-5" />}
          color="text-[#4da34c]"
        />
        <MetricCard
          title="총 작업시간"
          value={`${data.summary.totalWorkHours.toFixed(0)}h`}
          icon={<Clock className="w-5 h-5" />}
          color="text-[#6eb5ff]"
        />
        <MetricCard
          title="평균 제작시간"
          value={`${data.summary.averageHoursPerAsset.toFixed(1)}h`}
          icon={<Zap className="w-5 h-5" />}
          color="text-[#ff8c42]"
        />
        <MetricCard
          title="평균 소요일"
          value={`${data.summary.averageDaysPerAsset.toFixed(1)}일`}
          icon={<BarChart3 className="w-5 h-5" />}
          color="text-[#f9c784]"
        />
        <MetricCard
          title="완료율"
          value={`${data.summary.completionRate.toFixed(1)}%`}
          icon={<Activity className="w-5 h-5" />}
          color="text-[#c75146]"
        />
      </div>

      {/* 생산성 트렌드 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>생산성 트렌드</span>
            <div className="flex items-center gap-2">
              {getTrendIcon(data.productivityTrend.trend, data.productivityTrend.changePercentage)}
              <span className={cn("text-sm font-medium", getTrendColor(data.productivityTrend.trend))}>
                {data.productivityTrend.changePercentage > 0 ? '+' : ''}
                {data.productivityTrend.changePercentage.toFixed(1)}%
              </span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data.dailyProductivity}>
              <defs>
                <linearGradient id="colorAssets" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ff6246" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#ff6246" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4da34c" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#4da34c" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="completedAssets"
                stroke="#ff6246"
                fillOpacity={1}
                fill="url(#colorAssets)"
                name="완료 미디어"
              />
              <Area
                yAxisId="right"
                type="monotone"
                dataKey="workHours"
                stroke="#4da34c"
                fillOpacity={1}
                fill="url(#colorHours)"
                name="작업 시간"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 병목 구간 분석 */}
        <Card>
          <CardHeader>
            <CardTitle>주요 병목 구간</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.bottleneckAnalysis.map((bottleneck, index) => (
                <div key={bottleneck.stage} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: STAGE_COLORS[bottleneck.stage] }}
                      />
                      <span className="font-medium">{bottleneck.stageName}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-gray-600">
                        빈도: <span className="font-medium">{bottleneck.frequency}%</span>
                      </span>
                      <Badge variant="outline" className="text-xs">
                        평균 {bottleneck.averageDelay}일 지연
                      </Badge>
                    </div>
                  </div>
                  <Progress 
                    value={bottleneck.frequency} 
                    className="h-2"
                    style={{
                      '--progress-background': STAGE_COLORS[bottleneck.stage]
                    } as React.CSSProperties}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 미디어 유형별 분포 */}
        <Card>
          <CardHeader>
            <CardTitle>미디어 유형별 제작 현황</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.mediaTypeDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" name="제작 수">
                  {data.mediaTypeDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={MEDIA_COLORS[entry.type as keyof typeof MEDIA_COLORS]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* 작업 속도별 효율성 */}
      <Card>
        <CardHeader>
          <CardTitle>작업 속도별 효율성 분석</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={data.efficiencyBySpeed}>
              <PolarGrid />
              <PolarAngleAxis dataKey="speedName" />
              <PolarRadiusAxis angle={90} domain={[0, 5]} />
              <Radar
                name="효율성"
                dataKey="averageEfficiency"
                stroke="#ff6246"
                fill="#ff6246"
                fillOpacity={0.6}
              />
              <Radar
                name="품질"
                dataKey="averageQuality"
                stroke="#4da34c"
                fill="#4da34c"
                fillOpacity={0.6}
              />
              <Legend />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

// ── 메트릭 카드 컴포넌트 ──────────────────────────────────────────────

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color?: string;
}

function MetricCard({ title, value, icon, color = "text-gray-600" }: MetricCardProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-600">{title}</p>
            <p className="text-xl font-bold mt-1">{value}</p>
          </div>
          <div className={color}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
