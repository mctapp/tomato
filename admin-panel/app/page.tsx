"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import Link from "next/link";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // 이미 로그인한 사용자는 대시보드로 리다이렉트
  useEffect(() => {
    if (!loading && user) {
      router.push("/dashboard");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">로딩 중...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* 헤더 */}
      <header className="border-b">
        <div className="container mx-auto py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">토마토</h1>
          <div className="space-x-2">
            <Link href="/auth/login">
              <Button variant="outline">로그인</Button>
            </Link>
            <Link href="/auth/register">
              <Button>회원가입</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="flex-1">
        <section className="py-20 bg-gradient-to-r from-primary/20 to-primary/10">
          <div className="container mx-auto text-center">
            <h2 className="text-4xl font-bold mb-4">영화 접근성 관리 시스템</h2>
            <p className="text-xl mb-8 max-w-2xl mx-auto">
              영화 콘텐츠에 대한 접근성 미디어(AD, CC, SL 등)를 효율적으로 관리하고,
              사용자 평가를 수집하며, 접근성 미디어 자산의 배포를 제어하는 종합 관리 시스템입니다.
            </p>
            <Link href="/auth/register">
              <Button size="lg">지금 시작하기</Button>
            </Link>
          </div>
        </section>

        <section className="py-16">
          <div className="container mx-auto">
            <h2 className="text-3xl font-bold mb-8 text-center">주요 기능</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-card border rounded-lg p-6 shadow-sm">
                <h3 className="text-xl font-semibold mb-3">미디어 자산 관리</h3>
                <p className="text-muted-foreground">
                  영화별 접근성 미디어 파일을 손쉽게 업로드, 관리 및 배포합니다.
                </p>
              </div>
              <div className="bg-card border rounded-lg p-6 shadow-sm">
                <h3 className="text-xl font-semibold mb-3">사용자 평가 수집</h3>
                <p className="text-muted-foreground">
                  접근성 미디어에 대한 사용자 피드백과 평가를 수집하고 분석합니다.
                </p>
              </div>
              <div className="bg-card border rounded-lg p-6 shadow-sm">
                <h3 className="text-xl font-semibold mb-3">미디어 제작 관리</h3>
                <p className="text-muted-foreground">
                  접근성 미디어 제작 과정을 관리하고 작업 흐름을 최적화합니다.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* 푸터 */}
      <footer className="border-t py-6">
        <div className="container mx-auto text-center text-muted-foreground text-sm">
          &copy; 2025 토마토 영화 접근성 관리 시스템. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
