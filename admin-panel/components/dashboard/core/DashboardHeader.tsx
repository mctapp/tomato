// components/dashboard/core/DashboardHeader.tsx
import { Button } from "@/components/ui/button";
import { Save, RefreshCw, GripVertical, Settings } from "lucide-react";
import Link from "next/link";
import { UserData } from "@/types/auth";

interface DashboardHeaderProps {
  user: UserData | null;
  isSaving: boolean;
  onOpenSettings: () => void;
}

export function DashboardHeader({ user, isSaving, onOpenSettings }: DashboardHeaderProps) {
  return (
    <div className="flex justify-between items-center mb-8">
      <div>
        <h1 className="text-3xl font-bold text-[#333333] mb-2">
          <span className="text-[#ff6246]">TOMATO FARM</span>
        </h1>
        <p className="text-sm text-gray-500">미디어센터내일 접근성 관리 시스템</p>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center bg-white p-2 rounded-lg shadow-sm border border-gray-300">
          {isSaving ? (
            <div className="flex items-center">
              <Save className="h-4 w-4 mr-1 text-[#ff6246]" />
              <span className="text-sm text-gray-500">설정 저장 중...</span>
            </div>
          ) : (
            <div className="flex items-center">
              <GripVertical className="h-4 w-4 mr-1 text-gray-400" />
              <span className="text-sm text-gray-500">드래그하여 카드 순서 변경 가능</span>
            </div>
          )}
        </div>
        <Button 
          variant="outline" 
          className="flex items-center"
          onClick={onOpenSettings}
        >
          <Settings className="h-4 w-4 mr-2" />
          대시보드 설정
        </Button>
      </div>
    </div>
  );
}
