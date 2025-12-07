// /components/dashboard/cards/IPManagementCard.tsx
import { useEffect, useState } from 'react';
import { Loader2, Shield, List, PlusCircle, AlertTriangle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { BaseCard } from './BaseCard';
import { BUTTON_STYLES } from '@/lib/dashboard/constants';
import { apiClient } from '@/lib/utils/api-client';

interface CurrentIPResponse {
  ip_address: string;
  username: string | null;
  is_registered: boolean;
}

interface IPStats {
  total_ips: number;
  active_ips: number;
  inactive_ips: number;
  recent_logs_30d: number;
  today_logs: number;
}

const IPManagementCard = () => {
  const [currentIP, setCurrentIP] = useState<CurrentIPResponse | null>(null);
  const [stats, setStats] = useState<IPStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // 현재 IP 조회와 통계를 병렬로 가져오기
        const [ipData, statsData] = await Promise.all([
          apiClient.get<CurrentIPResponse>('/api/admin/ip-management/current-ip'),
          apiClient.get<IPStats>('/api/admin/ip-management/stats')
        ]);

        setCurrentIP(ipData);
        setStats(statsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "알 수 없는 오류");
        console.error("IP 정보 로드 오류:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();

    // 30초마다 데이터 갱신 (실시간 반영)
    const interval = setInterval(fetchData, 30 * 1000);

    return () => clearInterval(interval);
  }, []);

  // IP 목록 페이지로 새 창에서 열기
  const goToIPList = () => {
    window.open('/ip-management?tab=list', '_blank');
  };

  // IP 등록 페이지로 새 창에서 열기
  const goToIPRegister = () => {
    window.open('/ip-management?tab=register', '_blank');
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-20">
          <Loader2 className="h-6 w-6 animate-spin text-[#ff6246]" />
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex items-center text-destructive">
          <AlertTriangle className="h-5 w-5 mr-2" />
          <p>{error}</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {/* 현재 접속 IP 정보 */}
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">현재 접속 IP</span>
            {currentIP?.is_registered ? (
              <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700">등록됨</span>
            ) : (
              <span className="px-2 py-0.5 text-xs rounded-full bg-yellow-100 text-yellow-700">미등록</span>
            )}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-lg font-bold text-[#333333]">{currentIP?.ip_address || '-'}</span>
          </div>
          {currentIP?.username && (
            <div className="mt-1">
              <span className="text-sm text-gray-500">사용자: </span>
              <span className="text-sm font-medium text-[#333333]">{currentIP.username}</span>
            </div>
          )}
        </div>

        {/* 통계 */}
        {stats && (
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-2 bg-blue-50 rounded-lg">
              <p className="text-xl font-bold text-blue-600">{stats.active_ips}</p>
              <p className="text-xs text-gray-500">활성 IP</p>
            </div>
            <div className="text-center p-2 bg-orange-50 rounded-lg">
              <p className="text-xl font-bold text-orange-600">{stats.today_logs}</p>
              <p className="text-xs text-gray-500">오늘 접속</p>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderFooter = () => (
    <div className="w-full grid grid-cols-2 gap-2">
      <Button
        variant="outline"
        className={BUTTON_STYLES.leftButton}
        onClick={goToIPList}
      >
        <List className="h-4 w-4 mr-2" />
        IP 목록
      </Button>
      <Button
        variant="outline"
        className={BUTTON_STYLES.rightButton}
        onClick={goToIPRegister}
      >
        <PlusCircle className="h-4 w-4 mr-2" />
        IP 등록
      </Button>
    </div>
  );

  return (
    <BaseCard
      id="ip-management"
      title="접속 IP 관리"
      description="허용된 IP 주소를 관리합니다"
      type="ip-management"
      footerContent={renderFooter()}
    >
      {renderContent()}
    </BaseCard>
  );
};

export default IPManagementCard;
