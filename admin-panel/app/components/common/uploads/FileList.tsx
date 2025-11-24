// app/components/common/uploads/FileList.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, FileIcon, Trash2, Download, Eye } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface FileItem {
  id: number;
  original_filename: string;
  content_type: string;
  file_size: number;
  is_public: boolean;
  status: string;
  created_at: string;
  presigned_url?: string;
  public_url?: string;
}

interface FileListProps {
  entityType: string;
  entityId: number;
  title?: string;
  description?: string;
  onFileDelete?: (fileId: number) => void;
}

export function FileList({
  entityType,
  entityId,
  title = "파일 목록",
  description = "업로드된 파일 목록입니다",
  onFileDelete
}: FileListProps) {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPreview, setCurrentPreview] = useState<string | null>(null);
  
  const loadFiles = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(
        `/admin/api/uploads/files?entity_type=${entityType}&entity_id=${entityId}&with_urls=true`
      );
      
      if (!response.ok) {
        throw new Error('파일 목록을 불러오는데 실패했습니다');
      }
      
      const data = await response.json();
      setFiles(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : '알 수 없는 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    loadFiles();
  }, [entityType, entityId]);
  
  const handleDelete = async (fileId: number) => {
    if (!confirm('정말로 이 파일을 삭제하시겠습니까?')) {
      return;
    }
    
    try {
      const response = await fetch(`/admin/api/uploads/files/${fileId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error('파일 삭제에 실패했습니다');
      }
      
      // 파일 목록에서 삭제된 파일 제거
      setFiles(files.filter(file => file.id !== fileId));
      
      if (onFileDelete) {
        onFileDelete(fileId);
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : '알 수 없는 오류가 발생했습니다');
    }
  };
  
  const handleDownload = (file: FileItem) => {
    const url = file.is_public ? file.public_url : file.presigned_url;
    if (!url) {
      alert('다운로드 URL을 생성할 수 없습니다');
      return;
    }
    
    window.open(url, '_blank');
  };
  
  const isImageFile = (contentType: string) => {
    return contentType.startsWith('image/');
  };
  
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) {
      return `${bytes} B`;
    } else if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(2)} KB`;
    } else {
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : files.length === 0 ? (
          <p className="text-center py-8 text-gray-500">업로드된 파일이 없습니다</p>
        ) : (
          <div className="space-y-2">
            {files.map((file) => (
              <div 
                key={file.id}
                className="flex items-center justify-between p-3 rounded-md border"
              >
                <div className="flex items-center space-x-3">
                  <FileIcon className="h-8 w-8 text-gray-400" />
                  <div>
                    <p className="font-medium truncate max-w-[200px]">
                      {file.original_filename}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(file.file_size)} • {new Date(file.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  {isImageFile(file.content_type) && (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPreview((file.is_public ? file.public_url : file.presigned_url) || null)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-3xl">
                        <DialogHeader>
                          <DialogTitle>{file.original_filename}</DialogTitle>
                          <DialogDescription>
                            {formatFileSize(file.file_size)} • {file.content_type}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="mt-4">
                          <img
                            src={file.is_public ? file.public_url : file.presigned_url}
                            alt={file.original_filename}
                            className="max-h-[70vh] max-w-full object-contain mx-auto"
                          />
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload(file)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(file.id)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
