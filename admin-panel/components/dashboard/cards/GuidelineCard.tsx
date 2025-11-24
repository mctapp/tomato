// /components/dashboard/cards/GuidelineCard.tsx
import { Button } from "@/components/ui/button";
import { BaseCard } from './BaseCard';
import { ListFilter, PlusCircle } from 'lucide-react';
import Link from 'next/link';
import { BUTTON_STYLES } from '@/lib/dashboard/constants';

const GuidelineCard = () => {
  const renderContent = () => (
    <div className="space-y-1">
      <p className="text-sm text-muted-foreground">
        음성해설(AD), 자막해설(CC), 수어해설(SL) 등 접근성 미디어 제작을 위한 
        표준 가이드라인을 등록하고 관리합니다.
      </p>
    </div>
  );
  
  const renderFooter = () => (
    <div className="w-full grid grid-cols-2 gap-2">
      <Link href="/guidelines" target="_blank" rel="noopener noreferrer">
        <Button 
          variant="outline" 
          className={BUTTON_STYLES.leftButton}
        >
          <ListFilter className="h-4 w-4 mr-2" />
          가이드라인 목록
        </Button>
      </Link>
      <Link href="/guidelines/create" target="_blank" rel="noopener noreferrer">
        <Button 
          variant="outline"
          className={BUTTON_STYLES.rightButton}
        >
          <PlusCircle className="h-4 w-4 mr-2" />
          가이드라인 등록
        </Button>
      </Link>
    </div>
  );
  
  return (
    <BaseCard
      id="guideline"
      title="접근성 제작 가이드라인 관리"
      description="접근성 미디어 제작 표준을 관리하세요"
      type="guideline"
      footerContent={renderFooter()}
    >
      {renderContent()}
    </BaseCard>
  );
};

export default GuidelineCard;
