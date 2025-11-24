// components/dashboard/cards/ProfileCard.tsx

"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from "@/components/ui/button";
import { BaseCard } from './BaseCard';
import { UserData } from '@/lib/dashboard/types';
import { Role } from '@/types/auth';
import { BUTTON_STYLES } from '@/lib/dashboard/constants';
import { apiClient } from '@/lib/utils/api-client';

interface UserResponse {
  id: number;
  email: string;
  username?: string;
  role: Role;
  isActive: boolean;
  isAdmin: boolean;
}

const ProfileCard = () => {
  const router = useRouter();
  const [user, setUser] = useState<UserResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  
  // 사용자 정보 가져오기
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // /admin 제거
        const userData = await apiClient.get<UserResponse>('/api/auth/me');
        setUser(userData);
      } catch (error: any) {
        console.error('사용자 정보 가져오기 실패:', error);
        // 401 에러는 인증 만료
        if (error.response?.status === 401) {
          toast.error('인증이 만료되었습니다. 다시 로그인해주세요.');
          router.push('/auth/login');
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [router]);
  
  // 로그아웃 함수
  const handleLogout = useCallback(async () => {
    setIsLoggingOut(true);
    
    try {
      // /admin 제거
      await apiClient.post('/api/auth/logout', {});
      
      toast.success('로그아웃 되었습니다');
      
      // 로그인 페이지로 리다이렉트
      router.push('/auth/login');
    } catch (error) {
      console.error('로그아웃 실패:', error);
      toast.error('로그아웃 중 오류가 발생했습니다');
      setIsLoggingOut(false);
    }
  }, [router]);
  
  // 역할 라벨 가져오기
  const getRoleLabel = (role: Role) => {
    switch(role) {
      case Role.SUPER_ADMIN:
        return "최고관리자";
      case Role.ADMIN:
        return "관리자";
      case Role.EDITOR:
        return "편집자";
      case Role.USER:
        return "일반사용자";
      default:
        return "미지정";
    }
  };
  
  // 카드 컨텐츠
  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-20">
          <Loader2 className="h-5 w-5 animate-spin mr-2 text-[#ff6246]" />
          <span className="text-sm text-gray-500">사용자 정보 로딩 중...</span>
        </div>
      );
    }
    
    if (!user) {
      return (
        <div className="text-center text-muted-foreground">
          사용자 정보를 불러올 수 없습니다
        </div>
      );
    }
    
    return (
      <div className="space-y-1">
        <p className="text-gray-500">
          <span className="font-semibold">이름:</span> {user.username || '미등록'}
        </p>
        <p className="text-gray-500">
          <span className="font-semibold">이메일:</span> {user.email}
        </p>
        <p className="text-gray-500">
          <span className="font-semibold">역할:</span> {getRoleLabel(user.role)}
        </p>
        <p className="text-gray-500">
          <span className="font-semibold">상태:</span> {user.isActive ? '활성' : '비활성'}
        </p>
      </div>
    );
  };
  
  // 로그아웃 버튼
  const renderFooter = () => (
    <Button 
      variant="outline" 
      className={BUTTON_STYLES.rightButton}
      onClick={handleLogout}
      disabled={isLoggingOut}
    >
      {isLoggingOut ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          로그아웃 중...
        </>
      ) : (
        '로그아웃'
      )}
    </Button>
  );
  
  return (
    <BaseCard
      id="profile"
      title="사용자 정보"
      description="계정 정보를 확인하세요"
      type="profile"
      footerContent={renderFooter()}
    >
      {renderContent()}
    </BaseCard>
  );
};

export default ProfileCard;
