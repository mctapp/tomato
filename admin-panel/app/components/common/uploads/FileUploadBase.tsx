// app/components/common/uploads/FileUploadBase.tsx
import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { UploadCloud, X, AlertCircle, CheckCircle2 } from 'lucide-react';

interface FileUploadBaseProps {
  directory: string;
  isPublic?: boolean;
  maxSize?: number;
  acceptedFileTypes?: string[];
  entityType: string;
  entityId: number;
  usageType: string;
  onUploadComplete?: (fileData: any) => void;
  onError?: (error: any) => void;
}

export function FileUploadBase({
  directory,
  isPublic = false,
  maxSize = 10 * 1024 * 1024, // 10MB default
  acceptedFileTypes,
  entityType,
  entityId,
  usageType,
  onUploadComplete,
  onError
}: FileUploadBaseProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<any>(null);

  const handleUpload = useCallback(async (file: File) => {
    setIsUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      // Try new key first, fallback to old key for backwards compatibility
      let token = localStorage.getItem('accessToken');

      // 🔄 Fallback to old key if new key doesn't exist
      if (!token) {
        token = localStorage.getItem('token');
        if (token) {
          console.warn('Using legacy token key. Please re-login to update.');
        }
      }

      if (!token) {
        throw new Error("JWT 토큰이 없습니다. 다시 로그인하세요.");
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('directory', directory);
      formData.append('is_public', (!!isPublic).toString());
      formData.append('entity_type', entityType);
      formData.append('entity_id', entityId.toString());
      formData.append('usage_type', usageType);

      const response = await fetch('/admin/api/uploads/direct', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}` // ✅ JWT 정상 전송
        },
        body: formData,
        credentials: 'include'
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`파일 업로드에 실패했습니다: ${errorText}`);
      }

      const fileData = await response.json();

      setUploadedFile(fileData);
      setIsUploading(false);
      setUploadProgress(100);

      if (onUploadComplete) {
        onUploadComplete(fileData);
      }
    } catch (err) {
      console.error('Upload error:', err);
      setIsUploading(false);
      setError(err instanceof Error ? err.message : 'Unknown upload error');

      if (onError && err instanceof Error) {
        onError(err);
      }
    }
  }, [directory, isPublic, entityType, entityId, usageType, onUploadComplete, onError]);

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop: async (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        await handleUpload(acceptedFiles[0]);
      }
    },
    maxSize: maxSize,
    accept: acceptedFileTypes ? Object.fromEntries(
      acceptedFileTypes.map(type => [type, []])
    ) : undefined,
    multiple: false,
    disabled: isUploading,
  });

  React.useEffect(() => {
    if (fileRejections.length > 0) {
      const rejection = fileRejections[0];
      if (rejection.errors[0].code === 'file-too-large') {
        setError(`파일 크기가 너무 큽니다. 최대 ${Math.round(maxSize / 1024 / 1024)}MB까지 가능합니다.`);
      } else if (rejection.errors[0].code === 'file-invalid-type') {
        setError(`지원하지 않는 파일 형식입니다. ${acceptedFileTypes?.join(', ')} 형식만 가능합니다.`);
      } else {
        setError(rejection.errors[0].message);
      }
    }
  }, [fileRejections, maxSize, acceptedFileTypes]);

  return (
    <div className="space-y-4">
      {!uploadedFile && (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-6 transition-colors cursor-pointer
            ${isDragActive ? 'border-primary bg-primary/10' : 'border-gray-300 hover:border-primary'}`}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center justify-center space-y-2 text-center">
            <UploadCloud className="h-10 w-10 text-gray-400" />
            <h3 className="text-lg font-medium">
              {isDragActive ? '파일을 여기에 놓으세요' : '클릭하거나 파일을 이곳에 끌어다 놓으세요'}
            </h3>
            <p className="text-sm text-gray-500">
              {acceptedFileTypes
                ? `${acceptedFileTypes.join(', ')} 형식, 최대 ${Math.round(maxSize / 1024 / 1024)}MB`
                : `최대 ${Math.round(maxSize / 1024 / 1024)}MB`}
            </p>
          </div>
        </div>
      )}

      {isUploading && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm">업로드 중...</span>
            <span className="text-sm">{uploadProgress}%</span>
          </div>
          <Progress value={uploadProgress} max={100} />
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>오류</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {uploadedFile && !isUploading && (
        <div className="flex items-center p-3 border rounded-md">
          <CheckCircle2 className="h-5 w-5 text-green-500 mr-2" />
          <span className="flex-1 truncate">{uploadedFile.original_filename}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setUploadedFile(null); setError(null); }}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

