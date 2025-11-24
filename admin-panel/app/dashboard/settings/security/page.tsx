"use client";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { MFASetup } from "@/components/settings/mfa-setup";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function SecuritySettingsPage() {
  const router = useRouter();

  return (
    <ProtectedRoute>
      <div className="max-w-[800px] mx-auto py-10">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">보안 설정</h1>
            <p className="text-gray-600 mt-1">
              계정 보안 및 인증 설정을 관리합니다
            </p>
          </div>
          
          <Button 
            variant="ghost" 
            onClick={() => router.push('/dashboard/settings')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            설정으로 돌아가기
          </Button>
        </div>
        
        <div className="space-y-6">
          <MFASetup />
        </div>
      </div>
    </ProtectedRoute>
  );
}
