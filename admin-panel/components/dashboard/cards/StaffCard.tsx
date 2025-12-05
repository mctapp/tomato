// /components/dashboard/cards/StaffCard.tsx
import { Loader2, ListFilter, PlusCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { BaseCard } from './BaseCard';
import { useStaffStats } from "@/hooks/data/useStaffStats";
import Link from 'next/link';
import { BUTTON_STYLES } from '@/lib/dashboard/constants';

const StaffCard = () => {
  const { data: stats, isLoading } = useStaffStats();

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center">
          <Loader2 className="h-4 w-4 animate-spin mr-2 text-[#4da34c]" />
          <span>로딩 중...</span>
        </div>
      );
    }

    return (
      <div className="flex flex-col space-y-4">
        <div className="grid grid-cols-2 gap-4 bg-gray-50 rounded-md p-3">
          <div className="flex flex-col items-center justify-center">
            <p className="text-2xl font-bold text-[#333333]">{stats?.totalStaffs || 0}</p>
            <p className="text-xs text-gray-500">스태프</p>
          </div>
          <div className="flex flex-col items-center justify-center">
            <p className="text-2xl font-bold text-[#333333]">{stats?.totalProducers || 0}</p>
            <p className="text-xs text-gray-500">프로듀서</p>
          </div>
        </div>
      </div>
    );
  };

  const renderFooter = () => (
    <div className="w-full flex justify-between">
      <Link href="/staffs" target="_blank" rel="noopener noreferrer">
        <Button
          variant="outline"
          className={BUTTON_STYLES.leftButton}
        >
          <ListFilter className="h-4 w-4 mr-2" />
          스태프 목록
        </Button>
      </Link>
      <Link href="/staffs/create" target="_blank" rel="noopener noreferrer">
        <Button
          variant="outline"
          className={BUTTON_STYLES.rightButton}
        >
          <PlusCircle className="h-4 w-4 mr-2" />
          스태프 등록
        </Button>
      </Link>
    </div>
  );

  return (
    <BaseCard
      id="staff"
      title="스태프 관리"
      description="스태프 정보를 관리하세요"
      type="staff"
      footerContent={renderFooter()}
    >
      {renderContent()}
    </BaseCard>
  );
};

export default StaffCard;
