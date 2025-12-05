// /components/dashboard/cards/SLInterpreterCard.tsx
import { Loader2, ListFilter, PlusCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { BaseCard } from './BaseCard';
import { useSLInterpreterStats } from "@/hooks/data/useSLInterpreterStats";
import Link from 'next/link';
import { BUTTON_STYLES } from '@/lib/dashboard/constants';

const SLInterpreterCard = () => {
  const { data: stats, isLoading } = useSLInterpreterStats();

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
            <p className="text-2xl font-bold text-[#333333]">{stats?.totalInterpreters || 0}</p>
            <p className="text-xs text-gray-500">통역사</p>
          </div>
          <div className="flex flex-col items-center justify-center">
            <p className="text-2xl font-bold text-[#333333]">{stats?.totalSamples || 0}</p>
            <p className="text-xs text-gray-500">샘플</p>
          </div>
        </div>
      </div>
    );
  };

  const renderFooter = () => (
    <div className="w-full flex justify-between">
      <Link href="/slinterpreters" target="_blank" rel="noopener noreferrer">
        <Button
          variant="outline"
          className={BUTTON_STYLES.leftButton}
        >
          <ListFilter className="h-4 w-4 mr-2" />
          통역사 목록
        </Button>
      </Link>
      <Link href="/slinterpreters/create" target="_blank" rel="noopener noreferrer">
        <Button
          variant="outline"
          className={BUTTON_STYLES.rightButton}
        >
          <PlusCircle className="h-4 w-4 mr-2" />
          통역사 등록
        </Button>
      </Link>
    </div>
  );

  return (
    <BaseCard
      id="sl-interpreter"
      title="수어통역사 관리"
      description="수어통역사 정보를 관리하세요"
      type="sl-interpreter"
      footerContent={renderFooter()}
    >
      {renderContent()}
    </BaseCard>
  );
};

export default SLInterpreterCard;
