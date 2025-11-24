"use client";

import { DistributorForm } from '@/components/distributors/DistributorForm';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { useCreateDistributor } from '@/hooks/data/useDistributor';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useRouter } from 'next/navigation';
import { Loader2, Building, ArrowLeft } from 'lucide-react';
import { DistributorCreate } from '@/types/distributor';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function CreateDistributorPage() {
  const router = useRouter();
  const createMutation = useCreateDistributor();

  const handleSubmit = async (data: DistributorCreate) => {
    try {
      await createMutation.mutateAsync(data);
      toast.success("배급사가 성공적으로 등록되었습니다");
      router.push('/distributors');
    } catch (error) {
      toast.error("오류", {
        description: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다"
      });
      console.error('Error creating distributor:', error);
    }
  };

  return (
    <ProtectedRoute>
      <div className="max-w-[1200px] mx-auto py-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold tracking-tight text-[#333333]">배급사 등록</h1>
          
          <Button
            variant="ghost"
            className="hover:bg-[#f5fbf5] hover:text-[#4da34c]"
            onClick={() => router.push("/distributors")}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            목록으로
          </Button>
        </div>
        
        <Card className="border border-gray-300 shadow-sm hover:shadow-md transition-all duration-300 rounded-xl overflow-hidden">
          <CardHeader className="p-4 pb-2 bg-white">
            <CardTitle className="text-lg font-medium text-[#333333] flex items-center">
              <Building className="h-5 w-5 mr-2 text-[#ff6246]" />
              배급사 정보
            </CardTitle>
            <CardDescription>새로운 배급사 정보를 입력해주세요</CardDescription>
          </CardHeader>
          <CardContent className="p-4">
            {createMutation.isPending ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
              </div>
            ) : (
              <DistributorForm
                onSubmit={handleSubmit}
                isLoading={createMutation.isPending}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  );
}

// 정적 생성 비활성화 - 항상 동적 렌더링
export const dynamic = 'force-dynamic';
