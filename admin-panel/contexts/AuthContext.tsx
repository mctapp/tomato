"use client";
import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";

// 사용자 타입 정의
interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

// 인증 컨텍스트 타입 정의
interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
}

// 기본값 생성
const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
  register: async () => {},
});

// 인증 컨텍스트 훅
export const useAuth = () => useContext(AuthContext);

// 인증 프로바이더 컴포넌트
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // 🔄 Legacy token migration: 'token' -> 'accessToken'
    const migrateToken = () => {
      const oldToken = localStorage.getItem('token');
      const newToken = localStorage.getItem('accessToken');

      if (oldToken && !newToken) {
        console.log('Migrating token from old key to new key');
        localStorage.setItem('accessToken', oldToken);
        localStorage.removeItem('token');
      }
    };

    const checkUser = async () => {
      try {
        // Migrate token first
        migrateToken();

        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          controller.abort();
          throw new Error("인증 상태 확인 타임아웃");
        }, 5000);

        const response = await fetch("/api/auth/me", {
          signal: controller.signal,
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
          }
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error("인증 상태 확인 실패:", error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    checkUser();
  }, []);

  // 로그인 함수 (키값을 'accessToken'으로 통일)
  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "로그인 실패");
      }
      const data = await response.json();

      // 🚩 키값 수정 완료
      localStorage.setItem('accessToken', data.access_token);

      setUser(data.user);
      router.push("/dashboard");
    } catch (error) {
      console.error("로그인 에러:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // 로그아웃 함수 (키값을 'accessToken'으로 통일)
  const logout = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      });
      if (!response.ok) {
        throw new Error("로그아웃 실패");
      }
      setUser(null);
      localStorage.removeItem('accessToken');
      router.push("/auth/login");
    } catch (error) {
      console.error("로그아웃 에러:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // 회원가입 함수 (변경없음)
  const register = async (name: string, email: string, password: string) => {
    setLoading(true);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, email, password }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "회원가입 실패");
      }
      router.push("/auth/login?registered=true");
    } catch (error) {
      console.error("회원가입 에러:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  );
}

