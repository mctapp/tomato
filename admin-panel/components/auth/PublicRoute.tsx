// components/auth/PublicRoute.tsx

"use client";

import { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/utils/api-client";

interface PublicRouteProps {
  children: ReactNode;
  redirectAuthenticated?: string;
}

export function PublicRoute({ 
  children, 
  redirectAuthenticated = '/dashboard'
}: PublicRouteProps) {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    let mounted = true;
    
    const checkAuth = async () => {
      try {
        await apiClient.get('/api/auth/me');
        
        // 인증된 상태면 리다이렉트
        if (mounted && redirectAuthenticated) {
          router.push(redirectAuthenticated);
        }
      } catch (error: any) {
        // 401 에러는 정상 - 인증되지 않은 상태
        if (mounted) {
          setIsChecking(false);
        }
      }
    };
    
    checkAuth();
    
    return () => {
      mounted = false;
    };
  }, []); // 의존성 배열 비움

  // 체크 중이면 아무것도 렌더링하지 않음
  if (isChecking) {
    return null;
  }

  return <>{children}</>;
}
