// components/production/ComparisonAnalysis.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  LineChart,
  Line,
  ScatterChart,
  Scatter,
  Cell
} from 'recharts';
import { 
  Calendar,
  Users,
  Film,
  BarChart3,
  AlertCircle,
  Loader2,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { fetchApi } from '@/lib/api';
import { cn } from '@/lib/utils';

// ── 타입 정의 ──────────────────────────────────────────────────────────

type ComparisonType = 'period' | 'producer' | 'mediaType' | 'project';

interface ComparisonData {
  type: ComparisonType;
  items: ComparisonItem[];
  metrics: ComparisonMetrics;
}

interface ComparisonItem {
  id: string;
  name: string;
  totalAssets: number;
  totalHours: number;
  averageHours: number;
  efficiency: number;
  quality: number;
  completionRate: number;
  bottleneckStage?: string;
}

interface ComparisonMetrics {
  bestPerformer: string;
  worstPerformer: string;
  averageImprovement: number;
  keyInsights: string[];
}

interface PeriodComparisonData {
  period1: {
    label: string;
    data: ComparisonItem;
  };
  period2: {
    label: string;
    data: ComparisonItem;
  };
  changes: {
    assets: number;
    hours: number;
    efficiency: number;
    quality: number;
  };
}

interface ComparisonOption {
  id: string;
  name: string;
}

interface ComparisonOptionsResponse {
  producers: ComparisonOption[];
  mediaTypes: ComparisonOption[];
  projects: ComparisonOption[];
}

interface ComparisonAnalysisProps {
  dateRange?: DateRange;
}

// ── 색상 정의 ──────────────────────────────────────────────────────────

const COMPARISON_COLORS = {
  primary: '#ff6246',
  secondary: '#4da34c',
  tertiary: '#6eb5ff',
  quaternary: '#ff8c42',
  positive: '#4da34c',
  negative: '#c75146',
  neutral: '#94a3b8'
};

// ── 메인 컴포넌트 ──────────────────────────────────────────────────────

export function ComparisonAnalysis({ dateRange }: ComparisonAnalysisProps) {
  const [comparisonType, setComparisonType] = useState<ComparisonType>('period');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [comparisonData, setComparisonData] = useState<ComparisonData | null>(null);
  const [periodComparison, setPeriodComparison] = useState<PeriodComparisonData | null>(null);
  
  // 선택 상태
  const [selectedProducers, setSelectedProducers] = useState<string[]>([]);
  const [selectedMediaTypes, setSelectedMediaTypes] = useState<string[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [availableOptions, setAvailableOptions] = useState<ComparisonOptionsResponse>({
    producers: [],
    mediaTypes: [],
    projects: []
  });

  // 날짜 포맷 유틸리티
  const formatDateToISO = (date: Date): string => {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // 선택 가능한 옵션 로드 - 실제 API 사용
  useEffect(() => {
    const loadOptions = async () => {
      try {
        const options = await fetchApi<ComparisonOptionsResponse>('/admin/api/production/analytics/comparison-options');
        setAvailableOptions(options);
      } catch (err) {
        console.error('옵션 로딩 오류:', err);
        setAvailableOptions({
          producers: [],
          mediaTypes: [],
          projects: []
        });
      }
    };

    loadOptions();
  }, []);

  // 비교 데이터 로드
  const loadComparisonData = async () => {
    if (!dateRange?.from || !dateRange?.to) return;

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        type: comparisonType,
        start_date: formatDateToISO(dateRange.from),
        end_date: formatDateToISO(dateRange.to)
      });

      // 선택된 항목들 추가
      if (comparisonType === 'producer' && selectedProducers.length > 0) {
        params.append('producer_ids', selectedProducers.join(','));
      } else if (comparisonType === 'mediaType' && selectedMediaTypes.length > 0) {
        params.append('media_types', selectedMediaTypes.join(','));
      } else if (comparisonType === 'project' && selectedProjects.length > 0) {
        params.append('project_ids', selectedProjects.join(','));
      }

      // 실제 API 호출
      const data = await fetchApi<ComparisonData>(`/admin/api/production/analytics/comparison?${params.toString()}`);
      
      if (comparisonType === 'period' && data.items.length >= 2) {
        // period 타입은 별도 처리
        const current = data.items[0];
        const previous = data.items[1];
        
        const periodData: PeriodComparisonData = {
          period1: {
            label: current.name,
            data: current
          },
          period2: {
            label: previous.name,
            data: previous
          },
          changes: {
            assets: previous.totalAssets > 0 ? ((current.totalAssets - previous.totalAssets) / previous.totalAssets) * 100 : 0,
            hours: previous.totalHours > 0 ? ((current.totalHours - previous.totalHours) / previous.totalHours) * 100 : 0,
            efficiency: previous.efficiency > 0 ? ((current.efficiency - previous.efficiency) / previous.efficiency) * 100 : 0,
            quality: previous.quality > 0 ? ((current.quality - previous.quality) / previous.quality) * 100 : 0
          }
        };
        setPeriodComparison(periodData);
        setComparisonData(null);
      } else {
        setComparisonData(data);
        setPeriodComparison(null);
      }

    } catch (err) {
      console.error('비교 데이터 로딩 오류:', err);
      setError('비교 데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 변화율 표시 컴포넌트
  const ChangeIndicator = ({ value, suffix = '%' }: { value: number; suffix?: string }) => {
    const isPositive = value > 0;
    const isNeutral = value === 0;
    
    return (
      <div className={cn(
        "flex items-center gap-1 text-sm font-medium",
        isPositive && "text-green-600",
        !isPositive && !isNeutral && "text-red-600",
        isNeutral && "text-gray-600"
      )}>
        {isPositive && <TrendingUp className="w-4 h-4" />}
        {!isPositive && !isNeutral && <TrendingDown className="w-4 h-4" />}
        {isNeutral && <Minus className="w-4 h-4" />}
        <span>
          {isPositive && '+'}{value.toFixed(1)}{suffix}
        </span>
      </div>
    );
  };

  // 탭 변경 시 데이터 로드
  useEffect(() => {
    if ((comparisonType === 'producer' && selectedProducers.length > 0) ||
        (comparisonType === 'mediaType' && selectedMediaTypes.length > 0) ||
        (comparisonType === 'project' && selectedProjects.length > 0) ||
        comparisonType === 'period') {
      loadComparisonData();
    }
  }, [comparisonType, selectedProducers, selectedMediaTypes, selectedProjects, dateRange]);

  // 렌더링
  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-[#ff6246]" />
        <span className="ml-2 text-gray-600">비교 분석 데이터를 불러오는 중...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs value={comparisonType} onValueChange={(v) => setComparisonType(v as ComparisonType)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="period" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            기간 비교
          </TabsTrigger>
          <TabsTrigger value="producer" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            프로듀서 비교
          </TabsTrigger>
          <TabsTrigger value="mediaType" className="flex items-center gap-2">
            <Film className="w-4 h-4" />
            미디어 유형 비교
          </TabsTrigger>
          <TabsTrigger value="project" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            프로젝트 비교
          </TabsTrigger>
        </TabsList>

        {/* 기간 비교 */}
        <TabsContent value="period" className="space-y-6">
          {periodComparison ? (
            <>
              {/* 기간 요약 카드 */}
              <div className="grid grid-cols-2 gap-6">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">{periodComparison.period1.label}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">제작 미디어</span>
                        <span className="font-medium">{periodComparison.period1.data.totalAssets}개</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">총 작업시간</span>
                        <span className="font-medium">{periodComparison.period1.data.totalHours}시간</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">평균 효율성</span>
                        <span className="font-medium">{periodComparison.period1.data.efficiency.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">평균 품질</span>
                        <span className="font-medium">{periodComparison.period1.data.quality.toFixed(1)}/5</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">{periodComparison.period2.label}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">제작 미디어</span>
                        <span className="font-medium">{periodComparison.period2.data.totalAssets}개</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">총 작업시간</span>
                        <span className="font-medium">{periodComparison.period2.data.totalHours}시간</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">평균 효율성</span>
                        <span className="font-medium">{periodComparison.period2.data.efficiency.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">평균 품질</span>
                        <span className="font-medium">{periodComparison.period2.data.quality.toFixed(1)}/5</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* 변화율 표시 */}
              <Card>
                <CardHeader>
                  <CardTitle>주요 변화 지표</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-6">
                    <div>
                      <p className="text-sm text-gray-600">제작 미디어</p>
                      <ChangeIndicator value={periodComparison.changes.assets} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">작업 시간</p>
                      <ChangeIndicator value={periodComparison.changes.hours} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">효율성</p>
                      <ChangeIndicator value={periodComparison.changes.efficiency} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">품질</p>
                      <ChangeIndicator value={periodComparison.changes.quality} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 비교 차트 */}
              <Card>
                <CardHeader>
                  <CardTitle>기간별 성과 비교</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={[
                      {
                        metric: '제작 미디어',
                        [periodComparison.period1.label]: periodComparison.period1.data.totalAssets,
                        [periodComparison.period2.label]: periodComparison.period2.data.totalAssets
                      },
                      {
                        metric: '작업시간(10h)',
                        [periodComparison.period1.label]: periodComparison.period1.data.totalHours / 10,
                        [periodComparison.period2.label]: periodComparison.period2.data.totalHours / 10
                      },
                      {
                        metric: '효율성(x10)',
                        [periodComparison.period1.label]: periodComparison.period1.data.efficiency * 10,
                        [periodComparison.period2.label]: periodComparison.period2.data.efficiency * 10
                      },
                      {
                        metric: '품질(x10)',
                        [periodComparison.period1.label]: periodComparison.period1.data.quality * 10,
                        [periodComparison.period2.label]: periodComparison.period2.data.quality * 10
                      }
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="metric" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey={periodComparison.period1.label} fill={COMPARISON_COLORS.primary} />
                      <Bar dataKey={periodComparison.period2.label} fill={COMPARISON_COLORS.secondary} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </>
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                비교할 기간의 데이터가 없습니다.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        {/* 프로듀서 비교 */}
        <TabsContent value="producer" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>비교할 프로듀서 선택</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {availableOptions.producers.map(producer => (
                  <Badge
                    key={producer.id}
                    variant={selectedProducers.includes(producer.id) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => {
                      setSelectedProducers(prev =>
                        prev.includes(producer.id)
                          ? prev.filter(id => id !== producer.id)
                          : [...prev, producer.id]
                      );
                    }}
                  >
                    {producer.name}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {comparisonData && comparisonData.items.length > 0 && (
            <>
              {/* 프로듀서별 효율성 차트 */}
              <Card>
                <CardHeader>
                  <CardTitle>프로듀서별 성과 지표</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <RadarChart data={comparisonData.items}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="name" />
                      <PolarRadiusAxis angle={90} domain={[0, 5]} />
                      <Radar
                        name="효율성"
                        dataKey="efficiency"
                        stroke={COMPARISON_COLORS.primary}
                        fill={COMPARISON_COLORS.primary}
                        fillOpacity={0.6}
                      />
                      <Radar
                        name="품질"
                        dataKey="quality"
                        stroke={COMPARISON_COLORS.secondary}
                        fill={COMPARISON_COLORS.secondary}
                        fillOpacity={0.6}
                      />
                      <Legend />
                      <Tooltip />
                    </RadarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* 프로듀서별 상세 비교 */}
              <Card>
                <CardHeader>
                  <CardTitle>상세 비교</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2">프로듀서</th>
                          <th className="text-center py-2">담당 미디어</th>
                          <th className="text-center py-2">총 작업시간</th>
                          <th className="text-center py-2">평균 제작시간</th>
                          <th className="text-center py-2">효율성</th>
                          <th className="text-center py-2">품질</th>
                          <th className="text-center py-2">완료율</th>
                        </tr>
                      </thead>
                      <tbody>
                        {comparisonData.items.map(item => (
                          <tr key={item.id} className="border-b">
                            <td className="py-2 font-medium">{item.name}</td>
                            <td className="text-center py-2">{item.totalAssets}</td>
                            <td className="text-center py-2">{item.totalHours}h</td>
                            <td className="text-center py-2">{item.averageHours.toFixed(1)}h</td>
                            <td className="text-center py-2">
                              <Badge variant={item.efficiency >= 1 ? "default" : "secondary"}>
                                {item.efficiency.toFixed(2)}
                              </Badge>
                            </td>
                            <td className="text-center py-2">{item.quality.toFixed(1)}/5</td>
                            <td className="text-center py-2">{item.completionRate.toFixed(0)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* 미디어 유형 비교 */}
        <TabsContent value="mediaType" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>비교할 미디어 유형 선택</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {availableOptions.mediaTypes.map(mediaType => (
                  <Badge
                    key={mediaType.id}
                    variant={selectedMediaTypes.includes(mediaType.id) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => {
                      setSelectedMediaTypes(prev =>
                        prev.includes(mediaType.id)
                          ? prev.filter(id => id !== mediaType.id)
                          : [...prev, mediaType.id]
                      );
                    }}
                  >
                    {mediaType.name}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {comparisonData && comparisonData.items.length > 0 && (
            <>
              {/* 미디어 유형별 분포 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>평균 제작 시간 비교</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={comparisonData.items}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="averageHours" fill={COMPARISON_COLORS.primary}>
                          {comparisonData.items.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={Object.values(COMPARISON_COLORS)[index % 4]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>효율성 vs 품질</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <ScatterChart>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="efficiency" name="효율성" />
                        <YAxis dataKey="quality" name="품질" />
                        <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                        <Scatter name="미디어 유형" data={comparisonData.items} fill={COMPARISON_COLORS.primary}>
                          {comparisonData.items.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={Object.values(COMPARISON_COLORS)[index % 4]} />
                          ))}
                        </Scatter>
                      </ScatterChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        {/* 프로젝트 비교 */}
        <TabsContent value="project" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>비교할 프로젝트 선택</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {availableOptions.projects.map(project => (
                  <Badge
                    key={project.id}
                    variant={selectedProjects.includes(project.id) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => {
                      setSelectedProjects(prev =>
                        prev.includes(project.id)
                          ? prev.filter(id => id !== project.id)
                          : [...prev, project.id]
                      );
                    }}
                  >
                    {project.name}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {comparisonData && comparisonData.items.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>프로젝트별 종합 비교</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={comparisonData.items}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="totalHours"
                      stroke={COMPARISON_COLORS.primary}
                      name="작업시간"
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="quality"
                      stroke={COMPARISON_COLORS.secondary}
                      name="품질점수"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* 핵심 인사이트 */}
      {comparisonData && comparisonData.metrics.keyInsights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-[#ff6246]" />
              핵심 인사이트
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {comparisonData.metrics.keyInsights.map((insight, index) => (
                <li key={index} className="flex items-start gap-2">
                  <ArrowRight className="w-4 h-4 text-[#ff6246] mt-0.5" />
                  <span className="text-sm">{insight}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* 에러 표시 */}
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            {error}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
