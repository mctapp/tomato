// app/guidelines/create/page.tsx
"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { toast } from "sonner";
import { ArrowLeft, Save, BookOpen, Upload, FileText } from 'lucide-react';
import { GuidelineForm } from '../../components/accessibility/guidelines/GuidelineForm';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

export default function CreateGuidelinePage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadedFileId, setUploadedFileId] = useState<number | null>(null);
  const [uploadedFileData, setUploadedFileData] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (data: any) => {
    setIsSubmitting(true);
    setErrorMessage(null);
    
    try {
      // None 대신 빈 배열로 전송
      const formattedData = {
        ...data,
        // 빈 배열로 설정 (null 사용하지 않음)
        contents: data.contents || [],
        feedbacks: data.feedbacks || [],
        memos: data.memos || []
      };

      console.log("가이드라인 생성 데이터:", formattedData);
      
      const response = await fetch('/admin/api/access-guidelines', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formattedData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('API Error:', errorData);
        throw new Error('가이드라인 생성에 실패했습니다');
      }

      const result = await response.json();
      console.log("가이드라인 생성 결과:", result);
      
      // 파일 ID가 있는 경우 첨부 파일 연결
      if (uploadedFileId) {
        console.log("첨부 파일 연결 시도:", { 
          guidelineId: result.id, 
          fileId: uploadedFileId 
        });
        
        const attachResponse = await fetch(`/admin/api/access-guidelines/${result.id}/attachment`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(uploadedFileId),
        });
        
        // 응답 내용 확인
        let attachResponseData;
        try {
          attachResponseData = await attachResponse.json();
        } catch (e) {
          attachResponseData = await attachResponse.text();
        }
        
        console.log(`첨부 파일 응답 (${attachResponse.status}):`, attachResponseData);
        
        if (!attachResponse.ok) {
          console.error('첨부 파일 연결 실패:', { 
            status: attachResponse.status, 
            statusText: attachResponse.statusText, 
            response: attachResponseData 
          });
          toast.warning('파일 첨부에 실패했습니다.');
        } else {
          console.log("첨부 파일 연결 성공!");
        }
      } else {
        console.log("업로드된 파일 ID가 없습니다.");
      }

      toast.success('가이드라인이 성공적으로 생성되었습니다');
      router.push(`/guidelines/${result.id}`);
    } catch (error) {
      console.error('Error creating guideline:', error);
      const errorMsg = error instanceof Error ? error.message : '가이드라인 생성 중 오류가 발생했습니다';
      setErrorMessage(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileUpload = (fileData: any) => {
    console.log("업로드된 파일 데이터 전체:", fileData);
    
    // fileData의 모든 프로퍼티 확인
    if (fileData) {
      console.log("파일 데이터 프로퍼티:");
      Object.keys(fileData).forEach(key => {
        console.log(`${key}: ${JSON.stringify(fileData[key])}`);
      });
    }
    
    if (fileData && fileData.id) {
      console.log("ID 속성 발견:", fileData.id);
      setUploadedFileId(fileData.id);
      setUploadedFileData(fileData); // 전체 데이터 저장
    } else if (fileData && fileData.fileId) {
      console.log("fileId 속성 발견:", fileData.fileId);
      setUploadedFileId(fileData.fileId);
      setUploadedFileData(fileData);
    } else {
      console.log("ID 속성을 찾을 수 없음:", fileData);
    }
  };

  return (
    <ProtectedRoute>
      <div className="max-w-[1200px] mx-auto py-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold tracking-tight text-[#333333]">새 가이드라인 생성</h1>
          <Button
            variant="ghost"
            className="hover:bg-[#f5fbf5] hover:text-[#4da34c]"
            onClick={() => router.push('/guidelines')}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            목록으로
          </Button>
        </div>
        
        <Card className="border border-gray-300 shadow-md hover:shadow-lg transition-all duration-300 rounded-xl overflow-hidden">
          <CardHeader className="p-4 pb-2 bg-white">
            <CardTitle className="text-lg font-medium text-[#333333] flex items-center">
              <BookOpen className="h-5 w-5 mr-2 text-[#ff6246]" />
              새 가이드라인 정보
            </CardTitle>
            <CardDescription>
              새 가이드라인을 등록합니다. 기본 정보와 세부 내용을 입력해주세요.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="p-6">
            {errorMessage && (
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}

            {/* 현재 uploadedFileId 디버깅 표시 */}
            {uploadedFileId && process.env.NODE_ENV === 'development' && (
              <div className="mb-4 p-2 bg-blue-50 rounded">
                <p className="text-sm text-blue-600">파일 ID: {uploadedFileId}</p>
              </div>
            )}

            <GuidelineForm
              onSubmit={handleSubmit}
              isSubmitting={isSubmitting}
              guidelineId={-1} // 임시 ID 사용
              onFileUpload={handleFileUpload}
            />
            
            <div className="pt-6 flex justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/guidelines')}
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
