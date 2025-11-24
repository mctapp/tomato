// /components/dashboard/cards/DistributorCard.tsx
import { useEffect } from 'react';
import { Loader2, ListFilter, PlusCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { BaseCard } from './BaseCard';
import { useDistributorStats } from "@/hooks/data/useDistributor";
import Link from 'next/link';
import { BUTTON_STYLES } from '@/lib/dashboard/constants';

const DistributorCard = () => {
  const { data: stats, isLoading } = useDistributorStats();
  
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
            <p className="text-2xl font-bold text-[#333333]">{stats?.totalDistributors || 0}</p>
            <p className="text-xs text-gray-500">배급사</p>
          </div>
          <div className="flex flex-col items-center justify-center">
            <p className="text-2xl font-bold text-[#333333]">{stats?.totalContacts || 0}</p>
            <p className="text-xs text-gray-500">담당자</p>
          </div>
        </div>
      </div>
    );
  };
  
  const renderFooter = () => (
    <div className="w-full grid grid-cols-2 gap-2">
      <Link href="/distributors" target="_blank" rel="noopener noreferrer">
        <Button 
          variant="outline" 
          className={BUTTON_STYLES.leftButton}
        >
          <ListFilter className="h-4 w-4 mr-2" />
          배급사 목록
        </Button>
      </Link>
      <Link href="/distributors/create" target="_blank" rel="noopener noreferrer">
        <Button 
          variant="outline"
          className={BUTTON_STYLES.rightButton}
        >
          <PlusCircle className="h-4 w-4 mr-2" />
          배급사 등록
        </Button>
      </Link>
    </div>
  );
  
  return (
    <BaseCard
      id="distributor"
      title="배급사 관리"
      description="배급사 정보 및 담당자를 관리하세요"
      type="distributor"
      footerContent={renderFooter()}
    >
      {renderContent()}
    </BaseCard>
  );
};

export default DistributorCard;
