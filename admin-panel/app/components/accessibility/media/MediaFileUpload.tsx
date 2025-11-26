// app/components/accessibility/media/MediaFileUpload.tsx
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UploadCloud, Download, Trash2, AlertCircle, CheckCircle } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useUploadAccessAssetFile, useAccessAssetFile, useDeleteAccessAssetFile, useDownloadUrl } from '@/hooks/useAccessAssetFile';
import { Skeleton } from '@/components/ui/skeleton';

interface MediaFileUploadProps {
  assetId: number;
  mediaType: string;
}

export function MediaFileUpload({ assetId, mediaType }: MediaFileUploadProps) {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // 파일 정보 가져오기
  const { data: fileInfo, isLoading: isLoadingFile } = useAccessAssetFile(assetId);
  
  // 다운로드 URL 가져오기
  const { data: downloadUrl } = useDownloadUrl(
    assetId, 
    3600, 
    !!fileInfo?.id
  );
  
  // 파일 업로드 뮤테이션
  const uploadFileMutation = useUploadAccessAssetFile(assetId);
  
  // 파일 삭제 뮤테이션
  const deleteFileMutation = useDeleteAccessAssetFile(assetId);

  // 미디어 타입별 허용되는 파일 형식
  const mediaTypeConfig: Record<string, { acceptedTypes: string[], maxSize: number, description: string }> = {
    "AD": {
      acceptedTypes: [".mp3", ".m4a", ".wav", ".aac"],
      maxSize: 300 * 1024 * 1024,
      description: "음성해설 파일 (mp3, m4a, wav, aac / 최대 300MB)"
    },
    "CC": {
      acceptedTypes: [".srt", ".vtt", ".json", ".txt"],
      maxSize: 10 * 1024 * 1024,
      description: "자막해설 파일 (srt, vtt, json, txt / 최대 10MB)"
    },
    "SL": {
      acceptedTypes: [".mp4", ".mov", ".webm"],
      maxSize: 500 * 1024 * 1024,
      description: "수어해설 파일 (mp4, mov, webm / 최대 500MB)"
    },
    "IA": {
      acceptedTypes: [".mp3", ".m4a", ".wav", ".aac"],
      maxSize: 100 * 1024 * 1024,
      description: "음성소개 파일 (mp3, m4a, wav, aac / 최대 100MB)"
    },
    "IC": {
      acceptedTypes: [".srt", ".vtt", ".json", ".txt"],
      maxSize: 5 * 1024 * 1024,
      description: "자막소개 파일 (srt, vtt, json, txt / 최대 5MB)"
    },
    "IS": {
      acceptedTypes: [".mp4", ".mov", ".webm"],
      maxSize: 200 * 1024 * 1024,
      description: "수어소개 파일 (mp4, mov, webm / 최대 200MB)"
    },
    "RA": {
      acceptedTypes: [".mp3", ".m4a", ".wav", ".aac"],
      maxSize: 100 * 1024 * 1024,
      description: "음성리뷰 파일 (mp3, m4a, wav, aac / 최대 100MB)"
    },
    "RC": {
      acceptedTypes: [".srt", ".vtt", ".json", ".txt"],
      maxSize: 5 * 1024 * 1024,
      description: "자막리뷰 파일 (srt, vtt, json, txt / 최대 5MB)"
    },
    "RS": {
      acceptedTypes: [".mp4", ".mov", ".webm"],
      maxSize: 200 * 1024 * 1024,
      description: "수어리뷰 파일 (mp4, mov, webm / 최대 200MB)"
    }
  };

  const config = mediaTypeConfig[mediaType] || {
    acceptedTypes: [],
    maxSize: 10 * 1024 * 1024,
    description: "파일 (최대 10MB)"
  };

  // 파일 업로드 드롭존
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: async (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        setError(null);
        setUploadProgress(0);
        
        try {
          await uploadFileMutation.mutateAsync({
            file: acceptedFiles[0],
            supportedOsType: undefined
          });
          
          setUploadProgress(100);
        } catch (err) {
          setError(err instanceof Error ? err.message : '업로드 중 오류가 발생했습니다.');
          setUploadProgress(0);
        }
      }
    },
    accept: config.acceptedTypes.reduce((acc, type) => {
      acc[type] = [];
      return acc;
    }, {} as Record<string, string[]>),
    maxSize: config.maxSize,
    multiple: false,
    disabled: uploadFileMutation.isPending
  });

  // 파일 다운로드 핸들러
  const handleDownload = () => {
    if (downloadUrl?.url) {
      window.open(downloadUrl.url, '_blank');
    }
  };

  // 파일 삭제 핸들러
  const handleDelete = async () => {
    if (confirm('파일을 삭제하시겠습니까?')) {
      try {
        await deleteFileMutation.mutateAsync();
      } catch (err) {
        setError(err instanceof Error ? err.message : '파일 삭제 중 오류가 발생했습니다.');
      }
    }
  };

  // 로딩 중인 경우
  if (isLoadingFile) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>미디어 파일</CardTitle>
          <CardDescription>{config.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>미디어 파일</CardTitle>
        <CardDescription>{config.description}</CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>오류</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {uploadFileMutation.isPending && (
          <div className="mb-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm">업로드 중...</span>
              <span className="text-sm">{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} max={100} />
          </div>
        )}

        {fileInfo ? (
          <>
            {/* 기존 파일 정보 표시 */}
            <div className="p-4 rounded-md border flex items-center justify-between">
              <div className="flex-1 truncate">
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                  <span className="font-medium">{fileInfo.fileName}</span>
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  {(fileInfo.fileSize / 1024 / 1024).toFixed(2)} MB
                </div>
              </div>
              <div className="flex space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleDownload}
                  disabled={!downloadUrl}
                >
                  <Download className="h-4 w-4 mr-1" />
                  다운로드
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-red-500 hover:text-red-700"
                  onClick={handleDelete}
                  disabled={deleteFileMutation.isPending}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  삭제
                </Button>
              </div>
            </div>
            
            {/* 파일 교체 버튼 */}
            <div
              {...getRootProps()}
              className="mt-4 border-2 border-dashed rounded-md p-4 text-center cursor-pointer hover:bg-gray-50 transition-colors"
            >
              <input {...getInputProps()} />
              <UploadCloud className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500">
                {isDragActive
                  ? "파일을 여기에 놓으세요..."
                  : "새 파일을 업로드하려면 클릭하거나 파일을 드래그하세요"}
              </p>
            </div>
          </>
        ) : (
          // 파일이 없는 경우 업로드 UI 표시
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-md p-8 text-center cursor-pointer transition-colors
              ${isDragActive ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-primary'}`}
          >
            <input {...getInputProps()} />
            <UploadCloud className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            {isDragActive ? (
              <p className="text-primary font-medium">파일을 여기에 놓으세요...</p>
            ) : (
              <>
                <p className="font-medium mb-1">파일을 드래그하거나 클릭하여 업로드하세요</p>
                <p className="text-sm text-gray-500">
                  {config.acceptedTypes.join(', ')} 형식, 최대 {Math.round(config.maxSize / 1024 / 1024)}MB
                </p>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
