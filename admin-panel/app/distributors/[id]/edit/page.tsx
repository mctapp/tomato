
"use client";

import { DistributorForm } from '@/components/distributors/DistributorForm';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { useDistributor, useUpdateDistributor } from '@/hooks/data/useDistributor';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useRouter } from 'next/navigation';
import { Loader2, Building, ArrowLeft, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface EditDistributorPageProps {
  params: { id: string };
}

export default function EditDistributorPage({ params }: EditDistributorPageProps) {
  const router = useRouter();
  const distributorId = parseInt(params.id);
  const { data: distributor, isLoading, error } = useDistributor(distributorId);
  const updateMutation = useUpdateDistributor();

  const handleSubmit = async (data: any) => {
    try {
      await updateMutation.mutateAsync({ id: distributorId, data });
      toast.success("배급사 정보가 성공적으로 수정되었습니다");
      router.push(`/distributors/${distributorId}`);
    } catch (error) {
      toast.error("오류", {
        description: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다"
      });
      console.error('Error updating distributor:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-[1200px] mx-auto py-6 flex justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (error || !distributor) {
    const errorMessage = error instanceof Error ? error.message : (typeof error === 'string' ? error : "배급사 정보를 불러올 수 없습니다. 다시 시도해주세요.");
    
    return (
      <div className="max-w-[1200px] mx-auto py-6">
        <div className="bg-destructive/10 p-4 rounded-md text-destructive">
          {errorMessage}
        </div>
        <Button 
          variant="outline" 
          className="mt-4"
          onClick={() => router.push('/distributors')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" /> 목록으로 돌아가기
        </Button>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="max-w-[1200px] mx-auto py-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold tracking-tight text-[#333333]">
            {distributor.name} 수정
          </h1>
          
          <div className="flex space-x-2">
            <Button
              variant="ghost"
              className="hover:bg-[#f5fbf5] hover:text-[#4da34c]"
              onClick={() => router.push(`/distributors/${distributorId}`)}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              돌아가기
            </Button>
          </div>
        </div>
        
        <Card className="border border-gray-300 shadow-sm hover:shadow-md transition-all duration-300 rounded-xl overflow-hidden">
          <CardHeader className="p-4 pb-2 bg-white">
            <CardTitle className="text-lg font-medium text-[#333333] flex items-center">
              <Pencil className="h-5 w-5 mr-2 text-[#ff6246]" />
              배급사 정보 수정
            </CardTitle>
            <CardDescription>배급사 정보를 수정해주세요</CardDescription>
          </CardHeader>
          <CardContent className="p-4">
            {updateMutation.isPending ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
              </div>
            ) : (
              <DistributorForm 
                defaultValues={distributor}
                onSubmit={handleSubmit}
                isLoading={updateMutation.isPending}
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
