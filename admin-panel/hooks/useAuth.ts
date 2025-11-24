// hooks/useAuth.ts
"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Role } from '@/types/auth';
import { apiClient } from '@/lib/utils/api-client';

interface UserResponse {
  id: number;
  email: string;
  username: string;
  fullName?: string;
  role: Role;
  isActive: boolean;
  isAdmin: boolean;
}

interface AuthState {
  isAuthenticated: boolean | null;
  isLoading: boolean;
  user: {
    id?: number;
    email?: string;
    username?: string;
    role?: Role;
  } | null;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: null,
    isLoading: true,
    user: null
  });
  const router = useRouter();
  
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // apiClient 사용으로 변경 - 타입 지정
        const userData = await apiClient.get<UserResponse>('/api/auth/me');
        
        setAuthState({
          isAuthenticated: true,
          isLoading: false,
          user: {
            id: userData.id,
            email: userData.email,
            username: userData.username,
            role: userData.role
          }
        });
      } catch (error: any) {
        console.error('Auth check error:', error);
        
        // 401 에러인 경우에만 인증 실패로 처리
        if (error.response?.status === 401) {
          setAuthState({
            isAuthenticated: false,
            isLoading: false,
            user: null
          });
        } else {
          // 다른 에러는 일시적인 문제일 수 있으므로 인증 상태를 유지
          setAuthState(prev => ({
            ...prev,
            isLoading: false
          }));
        }
      }
    };
    
    checkAuth();
  }, []); // router 제거
  
  const logout = async () => {
    try {
      await apiClient.post('/api/auth/logout', {});
    } catch (error) {
      console.error('Logout error:', error);
    }
    
    setAuthState({
      isAuthenticated: false,
      isLoading: false,
      user: null
    });
    router.push('/auth/login');
  };
  
  return {
    ...authState,
    logout
  };
}
