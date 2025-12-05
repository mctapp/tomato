// /components/dashboard/cards/AssetCard.tsx
import { Button } from "@/components/ui/button";
import { BaseCard } from './BaseCard';
import { ListFilter, PlusCircle } from 'lucide-react';
import Link from 'next/link';
import { BUTTON_STYLES } from '@/lib/dashboard/constants';
import { AccessibilityMediaManagementCard } from "@/components/dashboard/AccessibilityMediaManagementCard";

const AssetCard = () => {
  const renderFooter = () => (
    <div className="w-full flex justify-between">
      <Link href="/accessmedia" target="_blank" rel="noopener noreferrer">
        <Button
          variant="outline"
          className={BUTTON_STYLES.leftButton}
        >
          <ListFilter className="h-4 w-4 mr-2" />
          미디어 목록
        </Button>
      </Link>
      <Link href="/accessmedia/create" target="_blank" rel="noopener noreferrer">
        <Button
          variant="outline"
          className={BUTTON_STYLES.rightButton}
        >
          <PlusCircle className="h-4 w-4 mr-2" />
          미디어 등록
        </Button>
      </Link>
    </div>
  );
  
  return (
    <BaseCard
      id="asset"
      title="접근성 미디어 관리"
      description="접근성 미디어 자산을 관리하세요"
      type="asset"
      footerContent={renderFooter()}
    >
      <AccessibilityMediaManagementCard />
    </BaseCard>
  );
};

export default AssetCard;
