// /components/dashboard/cards/ScriptwriterCard.tsx
import { Loader2, ListFilter, PlusCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { BaseCard } from './BaseCard';
import { useScriptwriterStats } from "@/hooks/data/useScriptwriterStats";
import Link from 'next/link';
import { BUTTON_STYLES } from '@/lib/dashboard/constants';

const ScriptwriterCard = () => {
  const { data: stats, isLoading } = useScriptwriterStats();

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
            <p className="text-2xl font-bold text-[#333333]">{stats?.totalADWriters || 0}</p>
            <p className="text-xs text-gray-500">음성해설</p>
          </div>
          <div className="flex flex-col items-center justify-center">
            <p className="text-2xl font-bold text-[#333333]">{stats?.totalCCWriters || 0}</p>
            <p className="text-xs text-gray-500">자막해설</p>
          </div>
        </div>
      </div>
    );
  };

  const renderFooter = () => (
    <div className="w-full flex justify-between">
      <Link href="/scriptwriters" target="_blank" rel="noopener noreferrer">
        <Button
          variant="outline"
          className={BUTTON_STYLES.leftButton}
        >
          <ListFilter className="h-4 w-4 mr-2" />
          작가 목록
        </Button>
      </Link>
      <Link href="/scriptwriters/create" target="_blank" rel="noopener noreferrer">
        <Button
          variant="outline"
          className={BUTTON_STYLES.rightButton}
        >
          <PlusCircle className="h-4 w-4 mr-2" />
          작가 등록
        </Button>
      </Link>
    </div>
  );

  return (
    <BaseCard
      id="scriptwriter"
      title="해설작가 관리"
      description="해설작가 정보를 관리하세요"
      type="scriptwriter"
      footerContent={renderFooter()}
    >
      {renderContent()}
    </BaseCard>
  );
};

export default ScriptwriterCard;
