// components/dashboard/AccessibilityMediaManagementCard.tsx
import React, { useState, useEffect } from "react";
import { Loader2, Lock, AlertTriangle, RefreshCw, Smartphone, Apple } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/utils/api-client";

// API 응답의 실제 구조에 대한 타입 (서비스 코드와 일치해야 함)
interface ApiMediaTypeDetail {
  media_type: string;
  count: number;
  ios_count: number;
  android_count: number;
}

interface ApiTotalSummary {
  total_assets: number;
  total_locked: number;
  total_ios: number;
  total_android: number;
}

interface ApiStatsResponse {
    by_media_type: ApiMediaTypeDetail[];
    total_summary: ApiTotalSummary;
    updated_at: string;
}

// 프론트엔드에서 테이블에 사용할 미디어 타입별 통계 데이터 구조
interface UiMediaTypeStats {
  media_type: string; // 예: "AD"
  displayName: string; // 예: "음성해설"
  count: number;
  ios_count: number;
  android_count: number;
}

// 프론트엔드에서 하단 요약에 사용할 전체 통계 데이터 구조
interface UiOverallStats {
  total_assets: number;
  total_locked: number;
  total_ios_overall: number;
  total_android_overall: number;
  last_updated: string;
}

export function AccessibilityMediaManagementCard() {
  const [mediaTypeStatsUi, setMediaTypeStatsUi] = useState<UiMediaTypeStats[]>([]);
  const [overallStatsUi, setOverallStatsUi] = useState<UiOverallStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const mediaTypeDisplayNames: Record<string, string> = {
    AD: "음성해설", CC: "자막해설", SL: "수어해설",
    IA: "음성소개", IC: "자막소개", IS: "수어소개",
    RA: "음성리뷰", RC: "자막리뷰", RS: "수어리뷰",
  };

  const fetchStats = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // apiClient 사용 - 자동으로 httpOnly 쿠키 포함
      const apiData = await apiClient.get<ApiStatsResponse>('/admin/api/access-assets/stats');

      if (apiData.by_media_type && Array.isArray(apiData.by_media_type)) {
        const transformedMediaStats: UiMediaTypeStats[] = apiData.by_media_type.map(item => ({
          media_type: item.media_type,
          displayName: mediaTypeDisplayNames[item.media_type] || item.media_type,
          count: item.count || 0,
          ios_count: item.ios_count || 0,
          android_count: item.android_count || 0,
        }));
        setMediaTypeStatsUi(transformedMediaStats);
      } else {
        setMediaTypeStatsUi([]);
        console.warn("API 응답에서 by_media_type 데이터가 없거나 형식이 다릅니다.");
      }

      if (apiData.total_summary) {
        const transformedOverall: UiOverallStats = {
          total_assets: apiData.total_summary.total_assets || 0,
          total_locked: apiData.total_summary.total_locked || 0,
          total_ios_overall: apiData.total_summary.total_ios || 0,
          total_android_overall: apiData.total_summary.total_android || 0,
          last_updated: apiData.updated_at
        };
        setOverallStatsUi(transformedOverall);
      } else {
        setOverallStatsUi(null);
        console.warn("API 응답에서 total_summary 데이터가 없습니다.");
      }

    } catch (err: any) {
      // apiClient에서 던지는 에러 메시지에서 401 체크
      if (err.message && err.message.includes('상태 코드: 401')) {
        setError('인증이 만료되었습니다. 다시 로그인해주세요.');
        // 필요시 로그인 페이지로 리다이렉트
        // window.location.href = '/login';
      } else {
        setError(err.message || "접근성 미디어 통계를 불러오는데 실패했습니다");
      }
      console.error("접근성 미디어 통계 로드 오류:", err);
      setMediaTypeStatsUi([]);
      setOverallStatsUi(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <div className="p-4 rounded-lg bg-card text-card-foreground shadow-sm">
        <div className="flex items-center justify-center h-24">
          <Loader2 className="h-6 w-6 animate-spin text-[#ff6246]" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 rounded-lg bg-card text-card-foreground shadow-sm">
        <div className="flex flex-col items-center text-destructive space-y-2">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2" />
            <p className="font-medium">오류 발생</p>
          </div>
          <p className="text-sm text-center">{error}</p>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchStats}
            className="text-[#ff6246] border-[#ff6246] hover:bg-[#ff6246]/10 mt-2"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            재시도
          </Button>
        </div>
      </div>
    );
  }
  
  const displayedMediaTypes = mediaTypeStatsUi.filter(stat => stat.count > 0 || stat.ios_count > 0 || stat.android_count > 0);

  if (displayedMediaTypes.length === 0 && !overallStatsUi) {
     return (
      <div className="p-4 rounded-lg bg-card text-card-foreground shadow-sm">
        <div className="text-center text-gray-500 py-4">
          표시할 접근성 미디어 통계가 없습니다.
        </div>
      </div>
    );
  }

  return (
    // 최상위 div에서 space-y-3을 space-y-0 또는 필요에 맞게 조정. 여기서는 UI상 간격이 필요할 수 있어 유지.
    <div className="p-4 rounded-lg bg-card text-card-foreground shadow-sm space-y-3">
      {/* "접근성 미디어 현황" 타이틀 삭제 */}
      {/* <h3 className="text-lg font-semibold text-gray-800">접근성 미디어 현황</h3> */}
      
      <div className="overflow-x-auto">
        {displayedMediaTypes.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50"> 
                <th className="text-left font-semibold text-gray-600 py-2.5 px-3">유형</th>
                <th className="text-center font-semibold text-gray-600 py-2.5 px-2">등록수</th>
                <th className="text-center font-semibold text-gray-600 py-2.5 px-2">iOS</th>
                <th className="text-center font-semibold text-gray-600 py-2.5 px-2">Android</th>
              </tr>
            </thead>
            <tbody>
              {displayedMediaTypes.map(typeStats => (
                <tr key={typeStats.media_type} className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50/50">
                  <td className="py-2.5 px-3">
                    <div className="flex items-center">
                      <span className={`h-2.5 w-2.5 rounded-full bg-[#ff6246] mr-2 flex-shrink-0`} />
                      <span className="font-medium text-gray-700">{typeStats.displayName}</span>
                    </div>
                  </td>
                  <td className="text-center py-2.5 px-2 font-medium text-gray-700">{typeStats.count}</td>
                  <td className="text-center py-2.5 px-2 text-gray-600">
                    {typeStats.ios_count > 0 ? typeStats.ios_count : <span className="text-gray-400">-</span>}
                  </td>
                  <td className="text-center py-2.5 px-2 text-gray-600">
                    {typeStats.android_count > 0 ? typeStats.android_count : <span className="text-gray-400">-</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          // 테이블 데이터가 없을 경우, 타이틀이 없으므로 이 메시지는 더욱 중요해짐.
          <p className="text-center text-gray-500 py-3">등록된 접근성 미디어 자산이 없습니다.</p>
        )}
      </div>
      
      {overallStatsUi && (
        // overallStatsUi를 감싸는 div에서 border-t (상단 테두리) 제거
        <div className="mt-3 pt-3 space-y-1.5 text-xs text-gray-600"> {/* border-t border-gray-200 제거 */}
          <div className="flex justify-between items-center">
            <span className="font-medium">총 자산 수:</span>
            <span className="font-semibold text-gray-800">{overallStatsUi.total_assets}개</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="font-medium flex items-center">
              <Lock className="h-3.5 w-3.5 mr-1.5 text-amber-600" />
              잠금 설정된 자산:
            </span>
            <span className="font-semibold text-gray-800">{overallStatsUi.total_locked}개</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="font-medium flex items-center">
              <Apple className="h-3.5 w-3.5 mr-1.5 text-gray-700" />
              전체 iOS 지원:
            </span>
            <span className="font-semibold text-gray-800">{overallStatsUi.total_ios_overall}개</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="font-medium flex items-center">
              <Smartphone className="h-3.5 w-3.5 mr-1.5 text-green-600" />
              전체 Android 지원:
            </span>
            <span className="font-semibold text-gray-800">{overallStatsUi.total_android_overall}개</span>
          </div>
           {overallStatsUi.last_updated && (
            <div className="text-right text-gray-400 text-[11px] pt-1">
              최근 업데이트: {new Date(overallStatsUi.last_updated).toLocaleString()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
