// app/components/common/uploads/ImageUpload.tsx
"use client";
import React, { useState, useEffect } from 'react';
import { FileUploadBase } from './FileUploadBase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Image, File } from 'lucide-react';

interface ImageUploadProps {
  directory: string;
  isPublic?: boolean;
  entityType: string;
  entityId: number;
  usageType: string;
  onUploadComplete?: (fileData: any) => void;
  onError?: (error: any) => void;
  initialImageUrl?: string;
}

export function ImageUpload({
  directory,
  isPublic = true,
  entityType,
  entityId,
  usageType,
  onUploadComplete,
  onError,
  initialImageUrl
}: ImageUploadProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialImageUrl || null);
  const [fileInfo, setFileInfo] = useState<{
    name: string;
    type: string;
    size: number;
  } | null>(null);
  
  // Try to fetch file info if initialImageUrl is provided
  useEffect(() => {
    if (initialImageUrl) {
      const fileId = initialImageUrl.split('/').pop();
      if (fileId && !isNaN(Number(fileId))) {
        fetch(`/admin/api/uploads/files/${fileId}`)
          .then(res => {
            if (res.ok) return res.json();
            throw new Error('Failed to fetch file info');
          })
          .then(data => {
            setFileInfo({
              name: data.original_filename,
              type: data.content_type,
              size: data.file_size
            });
          })
          .catch(err => console.error('Error fetching file info:', err));
      }
    }
  }, [initialImageUrl]);
  
  const handleUploadComplete = (fileData: any) => {
    // For public files, we can show the image immediately
    if (fileData.is_public && fileData.public_url) {
      setPreviewUrl(fileData.public_url);
    } else if (fileData.presigned_url) {
      // For private files, we use the presigned URL for preview
      setPreviewUrl(fileData.presigned_url);
    }
    
    // Set file info
    setFileInfo({
      name: fileData.original_filename,
      type: fileData.content_type,
      size: fileData.file_size
    });
    
    if (onUploadComplete) {
      onUploadComplete(fileData);
    }
  };
  
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center text-lg">
          <Image className="mr-2 h-5 w-5" />
          이미지 업로드
        </CardTitle>
        <CardDescription>
          {isPublic ? "공개" : "비공개"} 이미지 파일을 업로드하세요
        </CardDescription>
      </CardHeader>
      <CardContent>
        {previewUrl && (
          <div className="mb-4 p-2 border rounded-md">
            <img 
              src={previewUrl} 
              alt="미리보기" 
              className="w-full max-h-48 object-contain"
            />
            
            {fileInfo && (
              <div className="mt-2 px-2">
                <p className="text-sm font-medium truncate">{fileInfo.name}</p>
                <div className="flex gap-2 mt-1">
                  <Badge variant="outline">
                    {fileInfo.type.split('/')[1]?.toUpperCase() || fileInfo.type}
                  </Badge>
                  <Badge variant="outline">{formatFileSize(fileInfo.size)}</Badge>
                </div>
              </div>
            )}
          </div>
        )}
        
        <FileUploadBase
          directory={directory}
          isPublic={isPublic}
          entityType={entityType}
          entityId={entityId}
          usageType={usageType}
          acceptedFileTypes={[
            'image/jpeg', 
            'image/png', 
            'image/gif', 
            'image/webp'
          ]}
          onUploadComplete={handleUploadComplete}
          onError={onError}
        />
      </CardContent>
    </Card>
  );
}
