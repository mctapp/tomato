// components/auth/ProtectedRoute.tsx

"use client";

import { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Role } from "@/types/auth";
import { Loader2 } from "lucide-react";
import { apiClient } from "@/lib/utils/api-client";

interface UserResponse {
  id: number;
  email: string;
  role: Role;
  name?: string;
}

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRoles?: Role[];
}

export function ProtectedRoute({ children, requiredRoles = [] }: ProtectedRouteProps) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    
    const checkAuth = async () => {
      try {
        const response = await apiClient.get<UserResponse>('/api/auth/me');
        
        if (mounted && response) {
          setIsAuthenticated(true);
          
          // 역할 체크
          if (requiredRoles.length > 0 && response.role) {
            const hasRequiredRole = requiredRoles.includes(response.role);
            if (!hasRequiredRole) {
              router.push('/unauthorized');
              return;
            }
          }
        }
      } catch (error: any) {
        if (mounted) {
          // 401 에러는 인증되지 않은 상태
          if (error.response?.status === 401) {
            setIsAuthenticated(false);
            router.push('/auth/login');
          } else {
            // 다른 에러는 로그만 남기고 계속 진행
            console.error('Auth check error:', error);
            setIsAuthenticated(true); // 일단 통과시킴
          }
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };
    
    checkAuth();
    
    return () => {
      mounted = false;
    };
  }, []); // 의존성 배열에서 router와 requiredRoles 제거

  // 로딩 중일 때만 로더 표시
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // 인증되지 않은 경우 (이미 리다이렉트 처리됨)
  if (isAuthenticated === false) {
    return null;
  }

  return <>{children}</>;
}
