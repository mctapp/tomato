// app/components/common/uploads/PrivateFileUpload.tsx
"use client";

import React from 'react';
import { FileUploadBase } from './FileUploadBase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LockIcon } from 'lucide-react';

interface PrivateFileUploadProps {
  directory: string;
  entityType: string;
  entityId: number;
  usageType: string;
  acceptedFileTypes?: string[];
  onUploadComplete?: (fileData: any) => void;
  onError?: (error: any) => void;
}

export function PrivateFileUpload({
  directory,
  entityType,
  entityId,
  usageType,
  acceptedFileTypes,
  onUploadComplete,
  onError
}: PrivateFileUploadProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center text-lg">
          <LockIcon className="mr-2 h-5 w-5" />
          비공개 파일 업로드
        </CardTitle>
        <CardDescription>
          이 파일은 인증된 사용자만 접근 가능합니다
        </CardDescription>
      </CardHeader>
      <CardContent>
        <FileUploadBase
          directory={directory}
          isPublic={false}
          entityType={entityType}
          entityId={entityId}
          usageType={usageType}
          acceptedFileTypes={acceptedFileTypes}
          onUploadComplete={onUploadComplete}
          onError={onError}
        />
      </CardContent>
    </Card>
  );
}
