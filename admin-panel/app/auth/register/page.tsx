import { Metadata } from "next";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { PublicRoute } from "@/components/auth/PublicRoute";

export const metadata: Metadata = {
  title: "회원가입 | 영화 접근성 관리 시스템",
  description: "영화 접근성 관리 시스템 회원가입 페이지입니다.",
};

export default function RegisterPage() {
  return (
    <PublicRoute>
      <div className="container flex h-screen flex-col items-center justify-center">
        <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px] md:w-[450px]">
          <div className="flex flex-col space-y-2 text-center mb-4">
            <h1 className="text-3xl font-bold">토마토</h1>
            <p className="text-sm text-muted-foreground">
              영화 접근성 관리 시스템에 회원가입하세요
            </p>
          </div>
          <RegisterForm />
        </div>
      </div>
    </PublicRoute>
  );
}
