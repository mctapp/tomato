// app/components/common/uploads/PublicFileUpload.tsx
"use client";

import React from 'react';
import { FileUploadBase } from './FileUploadBase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Globe } from 'lucide-react';

interface PublicFileUploadProps {
  directory: string;
  entityType: string;
  entityId: number;
  usageType: string;
  acceptedFileTypes?: string[];
  onUploadComplete?: (fileData: any) => void;
  onError?: (error: any) => void;
}

export function PublicFileUpload({
  directory,
  entityType,
  entityId,
  usageType,
  acceptedFileTypes,
  onUploadComplete,
  onError
}: PublicFileUploadProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center text-lg">
          <Globe className="mr-2 h-5 w-5" />
          공개 파일 업로드
        </CardTitle>
        <CardDescription>
          이 파일은 인증 없이 누구나 접근 가능합니다
        </CardDescription>
      </CardHeader>
      <CardContent>
        <FileUploadBase
          directory={directory}
          isPublic={true}
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
