import { Metadata } from "next";
import { LoginForm } from "@/components/auth/LoginForm";
import { PublicRoute } from "@/components/auth/PublicRoute";

export const metadata: Metadata = {
  title: "로그인 | 영화 접근성 관리 시스템",
  description: "영화 접근성 관리 시스템 로그인 페이지입니다.",
};

export default function LoginPage() {
  return (
    <PublicRoute>
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-full max-w-[450px] px-4">
          <div className="flex flex-col space-y-2 text-center mb-6">
            <h1 className="text-3xl font-bold text-[#ff6246]">토마토</h1>
            <p className="text-sm text-muted-foreground">
              영화 접근성 관리 시스템에 로그인하세요
            </p>
          </div>
          <LoginForm />
        </div>
      </div>
    </PublicRoute>
  );
}
