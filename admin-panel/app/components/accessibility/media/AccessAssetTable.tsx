// app/components/accessibility/media/AccessAssetTable.tsx
import React, { ReactElement } from 'react';
import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import {
  Eye,
  Pencil,
  Trash2,
  MoreVertical,
  Download,
  Lock,
  Unlock,
  Check,
  Clock,
  Archive,
} from 'lucide-react';
import { AccessAssetResponse } from '@/types/accessAsset';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';

interface AccessAssetTableProps {
  assets: AccessAssetResponse[];
  isLoading: boolean;
  onViewAsset: (asset: AccessAssetResponse) => void;
  onEditAsset: (asset: AccessAssetResponse) => void;
  onDeleteAsset: (asset: AccessAssetResponse) => void;
  onDownloadAsset: (asset: AccessAssetResponse) => void;
  onToggleLock: (asset: AccessAssetResponse, isLocked: boolean) => void;
  onChangePublishingStatus: (asset: AccessAssetResponse, status: string) => void;
}

export function AccessAssetTable({
  assets,
  isLoading,
  onViewAsset,
  onEditAsset,
  onDeleteAsset,
  onDownloadAsset,
  onToggleLock,
  onChangePublishingStatus,
}: AccessAssetTableProps) {
  const getMediaTypeBadge = (mediaType: string) => {
    const colors: Record<string, string> = {
      'AD': 'bg-blue-500',
      'CC': 'bg-green-500',
      'SL': 'bg-purple-500',
      'IA': 'bg-blue-300',
      'IC': 'bg-green-300',
      'IS': 'bg-purple-300',
      'RA': 'bg-blue-200',
      'RC': 'bg-green-200',
      'RS': 'bg-purple-200',
    };

    return (
      <Badge className={`${colors[mediaType] || 'bg-gray-500'} text-white`}>
        {mediaType}
      </Badge>
    );
  };

  const getLanguageBadge = (language: string) => {
    const languages: Record<string, string> = {
      'ko': '한국어',
      'en': '영어',
      'ja': '일본어',
      'zh': '중국어',
      'vi': '베트남어',
    };

    return (
      <Badge variant="outline">
        {languages[language] || language}
      </Badge>
    );
  };

  const getPublishingStatusBadge = (status: string) => {
    const variants: Record<string, ReactElement> = {
      'draft': <Badge variant="outline" className="bg-gray-100">초안</Badge>,
      'review': <Badge variant="outline" className="bg-yellow-100">검토 중</Badge>,
      'published': <Badge variant="outline" className="bg-green-100">게시됨</Badge>,
      'archived': <Badge variant="outline" className="bg-gray-200">보관됨</Badge>,
    };

    return variants[status] || <Badge variant="outline">{status}</Badge>;
  };

  if (isLoading) {
    return <div className="py-10 text-center">로딩 중...</div>;
  }

  if (!assets.length) {
    return <div className="py-10 text-center">자산이 없습니다.</div>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>이름</TableHead>
          <TableHead>미디어</TableHead>
          <TableHead>언어</TableHead>
          <TableHead>상태</TableHead>
          <TableHead>공개</TableHead>
          <TableHead>잠금</TableHead>
          <TableHead>업데이트</TableHead>
          <TableHead className="text-right">액션</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {assets.map((asset) => (
          <TableRow key={asset.id}>
            <TableCell className="font-medium">{asset.name}</TableCell>
            <TableCell>{getMediaTypeBadge(asset.mediaType)}</TableCell>
            <TableCell>{getLanguageBadge(asset.language)}</TableCell>
            <TableCell>{getPublishingStatusBadge(asset.publishingStatus)}</TableCell>
            <TableCell>
              {asset.isPublic ? (
                <Badge variant="outline" className="bg-green-100">공개</Badge>
              ) : (
                <Badge variant="outline">비공개</Badge>
              )}
            </TableCell>
            <TableCell>
              {asset.isLocked ? (
                <Badge variant="outline" className="bg-red-100">잠금</Badge>
              ) : (
                <Badge variant="outline" className="bg-green-100">열림</Badge>
              )}
            </TableCell>
            <TableCell>
              {formatDistanceToNow(new Date(asset.updatedAt), { 
                addSuffix: true,
                locale: ko
              })}
            </TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end items-center space-x-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onViewAsset(asset)}
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onEditAsset(asset)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDownloadAsset(asset)}
                  disabled={!asset.originalFilename}
                >
                  <Download className="h-4 w-4" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {/* 잠금 상태 토글 */}
                    <DropdownMenuItem onClick={() => onToggleLock(asset, !asset.isLocked)}>
                      {asset.isLocked ? (
                        <>
                          <Unlock className="mr-2 h-4 w-4" />
                          <span>잠금 해제</span>
                        </>
                      ) : (
                        <>
                          <Lock className="mr-2 h-4 w-4" />
                          <span>잠금</span>
                        </>
                      )}
                    </DropdownMenuItem>

                    {/* 게시 상태 변경 */}
                    <DropdownMenuItem onClick={() => onChangePublishingStatus(asset, 'draft')}>
                      <Clock className="mr-2 h-4 w-4" />
                      <span>초안으로 변경</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onChangePublishingStatus(asset, 'review')}>
                      <Eye className="mr-2 h-4 w-4" />
                      <span>검토 요청</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onChangePublishingStatus(asset, 'published')}>
                      <Check className="mr-2 h-4 w-4" />
                      <span>게시</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onChangePublishingStatus(asset, 'archived')}>
                      <Archive className="mr-2 h-4 w-4" />
                      <span>보관</span>
                    </DropdownMenuItem>

                    {/* 삭제 */}
                    <DropdownMenuItem 
                      className="text-red-600"
                      onClick={() => onDeleteAsset(asset)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      <span>삭제</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
