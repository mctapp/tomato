// /components/dashboard/cards/UsersCard.tsx
import { Button } from "@/components/ui/button";
import { BaseCard } from './BaseCard';
import { ListFilter, PlusCircle } from 'lucide-react';
import Link from 'next/link';
import { BUTTON_STYLES } from '@/lib/dashboard/constants';

const UsersCard = () => {
  const renderContent = () => (
    <p className="text-sm text-muted-foreground">
      새로운 사용자를 등록하고, 기존 사용자의 권한을 관리합니다.
    </p>
  );
  
  const renderFooter = () => (
    <div className="w-full grid grid-cols-2 gap-2">
      <Link href="/users" target="_blank" rel="noopener noreferrer">
        <Button 
          variant="outline" 
          className={BUTTON_STYLES.leftButton}
        >
          <ListFilter className="h-4 w-4 mr-2" />
          사용자 목록
        </Button>
      </Link>
      <Link href="/users/create" target="_blank" rel="noopener noreferrer">
        <Button 
          variant="outline"
          className={BUTTON_STYLES.rightButton}
        >
          <PlusCircle className="h-4 w-4 mr-2" />
          사용자 등록
        </Button>
      </Link>
    </div>
  );
  
  return (
    <BaseCard
      id="users"
      title="사용자 관리"
      description="시스템 사용자 관리"
      type="users"
      footerContent={renderFooter()}
    >
      {renderContent()}
    </BaseCard>
  );
};

export default UsersCard;
