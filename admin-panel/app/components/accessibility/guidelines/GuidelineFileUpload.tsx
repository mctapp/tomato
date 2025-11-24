"use client";

import React, { useState } from 'react';
import { PublicFileUpload } from '../../common/uploads/PublicFileUpload';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from "sonner";
import { FileIcon, Trash2 } from 'lucide-react';

interface GuidelineFileUploadProps {
  guidelineId: number;
  initialFileUrl?: string;
  onFileUpdate?: (fileData: any) => void;
}

export function GuidelineFileUpload({ 
  guidelineId, 
  initialFileUrl,
  onFileUpdate 
}: GuidelineFileUploadProps) {
  const [fileUrl, setFileUrl] = useState<string | null>(initialFileUrl || null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [debugFileData, setDebugFileData] = useState<any>(null); // 디버깅용

  // 파일 업로드 완료 핸들러
  const handleUploadComplete = (fileData: any) => {
    console.log("GuidelineFileUpload - 업로드 완료:", fileData);
    setDebugFileData(fileData); // 디버깅용 저장
    
    setFileUrl(fileData.public_url);
    if (onFileUpdate) {
      console.log("부모 컴포넌트로 파일 데이터 전달:", fileData);
      onFileUpdate(fileData);  // 수정: 전체 fileData 객체 전달
    }
    
    toast.success("가이드라인 첨부 파일이 성공적으로 업로드되었습니다.");
  };

  // 파일 삭제 핸들러
  const handleDeleteFile = async () => {
    if (!fileUrl) return;
    
    try {
      setIsDeleting(true);
      
      const response = await fetch(`/admin/api/access-guidelines/${guidelineId}/file`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error('파일 삭제 중 오류가 발생했습니다.');
      }
      
      setFileUrl(null);
      if (onFileUpdate) {
        onFileUpdate(null);
      }
      
      toast.success("가이드라인 첨부 파일이 성공적으로 삭제되었습니다.");
      
    } catch (error) {
      console.error('Error deleting file:', error);
      toast.error(error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>가이드라인 첨부 파일</CardTitle>
        <CardDescription>가이드라인 관련 PDF 파일을 업로드해주세요.</CardDescription>
      </CardHeader>
      <CardContent>
        {/* 디버깅 정보 표시 */}
        {debugFileData && (
          <div className="mb-3 p-2 bg-gray-50 rounded text-xs overflow-auto">
            <details>
              <summary className="cursor-pointer">디버깅 정보</summary>
              <pre>{JSON.stringify(debugFileData, null, 2)}</pre>
            </details>
          </div>
        )}
        
        {fileUrl ? (
          <div className="space-y-4">
            <div className="flex items-center p-3 border rounded-md">
              <FileIcon className="h-6 w-6 mr-2 text-blue-500" />
              <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="flex-1 text-blue-600 hover:underline truncate">
                {fileUrl.split('/').pop()}
              </a>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteFile}
                disabled={isDeleting}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                삭제
              </Button>
            </div>
          </div>
        ) : (
          <PublicFileUpload
            directory={`guidelines`}
            entityType="guideline"
            entityId={guidelineId}
            usageType="attachment"
            acceptedFileTypes={["application/pdf"]}
            onUploadComplete={handleUploadComplete}
          />
        )}
      </CardContent>
    </Card>
  );
}
