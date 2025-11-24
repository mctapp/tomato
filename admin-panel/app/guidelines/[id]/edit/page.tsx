// app/guidelines/[id]/edit/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { toast } from "sonner";
import { ArrowLeft, Save, BookOpen, AlertCircle } from 'lucide-react';
import { GuidelineForm } from '../../../components/accessibility/guidelines/GuidelineForm';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function EditGuidelinePage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [guideline, setGuideline] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchGuideline();
  }, [params.id]);

  const fetchGuideline = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/admin/api/access-guidelines/${params.id}`);
      if (!response.ok) {
        if (response.status === 404) {
          toast.error('가이드라인을 찾을 수 없습니다');
          router.push('/guidelines');
          return;
        }
        throw new Error('Failed to fetch guideline');
      }
      const data = await response.json();
      setGuideline(data);
    } catch (error) {
      console.error('Error fetching guideline:', error);
      const errorMsg = error instanceof Error ? error.message : '가이드라인 정보를 불러오는데 실패했습니다';
      setErrorMessage(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (data: any) => {
    setIsSubmitting(true);
    setErrorMessage(null);
    
    try {
      // 필요한 최소 데이터만 포함
      const formattedData = {
        name: data.name,
        type: data.type,
        field: data.field,
        fieldOther: data.fieldOther || "",
        version: data.version,
        // 불필요한 ID 속성 제거하고 필수 필드만 포함
        contents: (data.contents || []).map((item: any, index: number) => ({
          category: item.category,
          content: item.content,
          sequenceNumber: index + 1
        })),
        feedbacks: (data.feedbacks || []).map((item: any, index: number) => ({
          feedbackType: item.feedbackType,
          content: item.content,
          sequenceNumber: index + 1
        })),
        memos: (data.memos || []).map((item: any) => ({
          content: item.content
        }))
      };

      console.log("가이드라인 수정 데이터:", formattedData);

      // 새로운 엔드포인트 구조 사용 시도
      let url = `/admin/api/access-guidelines/${params.id}`;
      
      const response = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formattedData),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('API Error:', errorData);
        throw new Error('가이드라인 수정에 실패했습니다');
      }

      toast.success('가이드라인이 성공적으로 수정되었습니다');
      router.push(`/guidelines/${params.id}`);
    } catch (error) {
      console.error('Error updating guideline:', error);
      const errorMsg = error instanceof Error ? error.message : '가이드라인 수정 중 오류가 발생했습니다';
      setErrorMessage(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-[1200px] mx-auto py-6 space-y-6">
        <div className="w-full py-24 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!guideline) {
    return (
      <div className="max-w-[1200px] mx-auto py-6 space-y-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            가이드라인을 찾을 수 없습니다.
          </AlertDescription>
        </Alert>
        <Button onClick={() => router.push('/guidelines')} className="mt-4">
          목록으로 돌아가기
        </Button>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="max-w-[1200px] mx-auto py-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold tracking-tight text-[#333333]">가이드라인 수정</h1>
          <Button
            variant="ghost"
            className="hover:bg-[#f5fbf5] hover:text-[#4da34c]"
            onClick={() => router.push(`/guidelines/${params.id}`)}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            상세 보기로
          </Button>
        </div>
        
        <Card className="border border-gray-300 shadow-md hover:shadow-lg transition-all duration-300 rounded-xl overflow-hidden">
          <CardHeader className="p-4 pb-2 bg-white">
            <CardTitle className="text-lg font-medium text-[#333333] flex items-center">
              <BookOpen className="h-5 w-5 mr-2 text-[#ff6246]" />
              가이드라인 정보 수정
            </CardTitle>
            <CardDescription>
              {guideline.name} 가이드라인 정보를 수정합니다.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="p-6">
            {errorMessage && (
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}

            <GuidelineForm 
              initialData={guideline} 
              guidelineId={parseInt(params.id)} 
              onSubmit={handleSubmit} 
              isSubmitting={isSubmitting} 
            />
            
            <div className="pt-6 flex justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push(`/guidelines/${params.id}`)}
                className="border-gray-300 hover:bg-[#fff5f3] hover:text-[#ff6246] hover:border-[#ff6246]"
              >
                취소
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-[#4da34c] hover:bg-[#3d8c3c]"
                onClick={() => {
                  // Form의 submit 이벤트를 트리거하는 코드 (Form에 따라 조정 필요)
                  const submitButton = document.querySelector('button[type="submit"]') as HTMLButtonElement;
if (submitButton && submitButton !== document.activeElement) {
  submitButton.click();
}
                }}
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                    처리 중...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    저장
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  );
}
