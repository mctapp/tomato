// app/accessmedia/[id]/page.tsx
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardFooter 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { 
  ArrowLeft, 
  Pencil, 
  Trash2, 
  FileText, 
  Settings, 
  Lock, 
  Download,
  Eye,
  Calendar,
  Film,
  Globe,
  Tag,
  Clock,
  Info,
  AlertCircle,
  Play,
  Pause,
  Volume2,
  FileVideo,
  File,
  RefreshCw,
  User,
  Shield,
  Check,
  X
} from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useAccessAsset, useDeleteAccessAsset, useUpdatePublishingStatus, useToggleLockStatus } from '@/hooks/useAccessAssets';
import { useMovies } from '@/hooks/useMovies';
import { useGuidelines } from '@/hooks/useGuidelines';
import { Skeleton } from '@/components/ui/skeleton';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Progress } from '@/components/ui/progress';
import { useQuery } from '@tanstack/react-query';
import AudioPlayer from '@/components/audio/AudioPlayer';
import PrivateAudioPlayer from '@/components/audio/PrivateAudioPlayer';
import PrivateSubtitleViewer from '@/components/subtitle/PrivateSubtitleViewer';
import { AccessControl } from '@/components/accessmedia/AccessControl';
import { CreditsManager } from '@/components/accessmedia/CreditsManager';

// 현재 관리자 ID
const CURRENT_ADMIN_ID = 1;

// 새로운 훅: 미리보기 데이터 가져오기
function useAccessAssetPreview(assetId: number | undefined) {
  return useQuery({
    queryKey: ['accessAssetPreview', assetId],
    queryFn: async () => {
      if (!assetId) return null;
      
      const response = await fetch(`/admin/api/access-assets/${assetId}/preview`);
      if (!response.ok) {
        throw new Error(`API 호출 실패: ${response.status}`);
      }
      return response.json();
    },
    enabled: !!assetId,
    staleTime: 1000 * 60 * 5,
  });
}

// 자막 인터페이스 정의
interface SubtitleItem {
  startTime: number;
  endTime: number;
  text: string;
}

// API 기본 URL 설정
const API_BASE_URL = '';

// 비디오 파일 표시 컴포넌트 (재생 불가)
function VideoFileDisplay({ filename, url }: { filename: string, url?: string }) {
  return (
    <div className="border rounded-lg p-6 bg-gray-50 text-center">
      <div className="mb-4 flex justify-center">
        <FileVideo className="h-16 w-16 text-gray-400" />
      </div>
      <h3 className="text-lg font-medium text-gray-700">비디오 파일</h3>
      <p className="text-sm text-gray-500 mt-2 mb-4">
        이 비디오 파일은 웹에서 직접 재생을 지원하지 않습니다.
      </p>
      <div className="bg-white p-3 rounded-md border text-left">
        <div className="flex items-center">
          <File className="h-5 w-5 text-gray-400 mr-2" />
          <span className="text-sm font-medium truncate">{filename}</span>
        </div>
      </div>
      <Button variant="outline" className="mt-4" disabled={!url} onClick={() => url && window.open(url, '_blank')}>
        <Download className="h-4 w-4 mr-2" />
        파일 다운로드
      </Button>
    </div>
  );
}

// 미디어 파일 처리 컴포넌트
function MediaFileHandler({ asset }: { asset: any }) {
  const { data: previewData, isLoading: isLoadingPreview, error: previewError } = useAccessAssetPreview(asset?.id);
  
  if (isLoadingPreview) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (previewError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>미디어 정보 로드 오류</AlertTitle>
        <AlertDescription>
          미디어 파일 정보를 불러오는 중 오류가 발생했습니다. 다시 시도해주세요.
        </AlertDescription>
      </Alert>
    );
  }
  
  if (!previewData || (!previewData.file_url && !previewData.presigned_url)) {
    return (
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>미디어 파일 없음</AlertTitle>
        <AlertDescription>현재 업로드된 미디어 파일이 없습니다.</AlertDescription>
      </Alert>
    );
  }
  
  const isPresignedUrl = previewData.presigned_url && previewData.presigned_url.includes('X-Amz-Algorithm');
  console.log("MediaFileHandler - 사용할 URL 유형:", isPresignedUrl ? "presigned URL" : "file URL");
  
  const playerType = previewData.player_type;
  const fileUrl = isPresignedUrl ? previewData.presigned_url : previewData.file_url;
  const originalFilename = previewData.original_filename;
  
  if (playerType === 'subtitle') {
    console.log("MediaFileHandler - Using PrivateSubtitleViewer");
    return (
      <PrivateSubtitleViewer 
        src={fileUrl} 
        title={originalFilename} 
        subtitleData={previewData.subtitle_data}
        onDownload={() => fileUrl && window.open(fileUrl, '_blank')}
      />
    );
  } else if (playerType === 'audio') {
    if (isPresignedUrl) {
      console.log("MediaFileHandler - Using PrivateAudioPlayer with presigned URL");
      return <PrivateAudioPlayer src={fileUrl} title={originalFilename} />;
    } else {
      console.log("MediaFileHandler - Using standard AudioPlayer with file URL");
      return <AudioPlayer src={fileUrl} title={originalFilename} />;
    }
  } else if (playerType === 'video') {
    return <VideoFileDisplay filename={originalFilename} url={fileUrl} />;
  }
  
  return (
    <div className="border rounded-lg p-6 bg-gray-50 text-center">
      <div className="mb-4 flex justify-center">
        <File className="h-16 w-16 text-gray-400" />
      </div>
      <h3 className="text-lg font-medium text-gray-700">미디어 파일</h3>
      <p className="text-sm text-gray-500 mt-2 mb-4">
        이 파일 형식은 웹에서 직접 재생을 지원하지 않습니다.
      </p>
      <div className="bg-white p-3 rounded-md border text-left">
        <div className="flex items-center">
          <File className="h-5 w-5 text-gray-400 mr-2" />
          <span className="text-sm font-medium truncate">{originalFilename}</span>
        </div>
      </div>
      <Button 
        variant="outline" 
        className="mt-4" 
        onClick={() => fileUrl && window.open(fileUrl, '_blank')}
        disabled={!fileUrl}
      >
        <Download className="h-4 w-4 mr-2" />
        파일 다운로드
      </Button>
    </div>
  );
}

function AccessMediaDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const assetId = parseInt(params.id, 10);
  
  const { data: movies = [], isLoading: isLoadingMovies } = useMovies();
  const { data: guidelines = [], isLoading: isLoadingGuidelines } = useGuidelines();
  
  const { 
    data: asset, 
    isLoading, 
    isError, 
    error,
    refetch
  } = useAccessAsset(assetId);
  
  const deleteAssetMutation = useDeleteAccessAsset();
  
  useEffect(() => {
    if (asset) {
      console.log('Asset Data:', asset);
      console.log('Movies:', movies);
      console.log('Guidelines:', guidelines);
    }
  }, [asset, movies, guidelines]);
  
  const getMovieInfo = () => {
    if (!asset || !asset.movieId || !movies.length) return { title: '연결된 영화 없음' };
    
    const movie = movies.find(m => m.id === asset.movieId);
    return movie || { title: '연결된 영화 없음' };
  };
  
  const getGuidelineInfo = () => {
    if (!asset || !asset.guidelineId || !guidelines.length) return { name: '연결된 가이드라인 없음' };
    
    const guideline = guidelines.find(g => g.id === asset.guidelineId);
    return guideline || { name: '연결된 가이드라인 없음' };
  };
  
  const handleDeleteAsset = async () => {
    if (confirm('이 자산을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      try {
        await deleteAssetMutation.mutateAsync(assetId);
        router.push('/accessmedia');
      } catch (error) {
        console.error('Delete error:', error);
        alert('삭제 중 오류가 발생했습니다.');
      }
    }
  };
  
  const getMediaTypeColor = (mediaType: string) => {
    const colors: Record<string, string> = {
      'AD': 'bg-blue-500',
      'CC': 'bg-green-500',
      'SL': 'bg-purple-500',
      'AI': 'bg-blue-300',
      'CI': 'bg-green-300',
      'SI': 'bg-purple-300',
      'AR': 'bg-blue-200',
      'CR': 'bg-green-200',
      'SR': 'bg-purple-200',
    };
    
    return colors[mediaType] || 'bg-gray-500';
  };
  
  const getPublishingStatusBadge = (status: string) => {
    const variants: Record<string, { className: string, text: string }> = {
      'draft': { className: 'bg-gray-100', text: '초안' },
      'review': { className: 'bg-yellow-100', text: '검토 중' },
      'published': { className: 'bg-green-100', text: '게시됨' },
      'archived': { className: 'bg-gray-200', text: '보관됨' },
    };
    
    const variant = variants[status] || { className: '', text: status };
    
    return (
      <Badge variant="outline" className={variant.className}>
        {variant.text}
      </Badge>
    );
  };
  
  const getProductionStatusBadge = (status: string) => {
    const variants: Record<string, { className: string, text: string }> = {
      'planning': { className: 'bg-blue-100', text: '계획 중' },
      'in_progress': { className: 'bg-yellow-100', text: '진행 중' },
      'completed': { className: 'bg-green-100', text: '완료됨' },
      'delayed': { className: 'bg-red-100', text: '지연됨' },
      'cancelled': { className: 'bg-gray-200', text: '취소됨' },
    };
    
    const variant = variants[status] || { className: '', text: status };
    
    return (
      <Badge variant="outline" className={variant.className}>
        {variant.text}
      </Badge>
    );
  };
  
  const getLanguageDisplay = (language: string) => { 
    const languages: Record<string, string> = { 
      'ko': '한국어', 
      'en': '영어', 
      'zh': '중국어', 
      'ja': '일본어', 
      'vi': '베트남어', 
      'tl': '필리핀어', 
      'ne': '네팔어', 
      'id': '인도네시아어', 
      'km': '캄보디아어', 
      'my': '미얀마어', 
      'si': '스리랑카어'
    };
    
    return languages[language] || language;
  };
  
  const getAssetTypeDisplay = (assetType: string) => {
    const types: Record<string, string> = {
      'description': '해설',
      'introduction': '소개',
      'review': '리뷰',
    };
    
    return types[assetType] || assetType;
  };
  
  const getAccessPolicyDisplay = (policy: string) => {
    const policies: Record<string, string> = {
      'private': '비공개',
      'public': '공개',
      'restricted': '제한됨',
      'educational': '교육용',
      'commercial': '상업용',
    };
    
    return policies[policy] || policy;
  };
  
  if (isLoading || isLoadingMovies || isLoadingGuidelines) {
    return (
      <div className="max-w-[1200px] mx-auto py-6 space-y-6">
        <div className="flex justify-end space-x-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
        </div>
        
        <div className="grid grid-cols-3 gap-6">
          <Skeleton className="h-[600px] col-span-2" />
          <div className="space-y-6">
            <Skeleton className="h-[290px]" />
            <Skeleton className="h-[290px]" />
          </div>
        </div>
      </div>
    );
  }
  
  if (isError) {
    return (
      <div className="max-w-[1200px] mx-auto py-6 space-y-6">
        <div className="flex justify-end space-x-2">
          <Button variant="ghost" size="sm" onClick={() => router.push('/accessmedia')}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            목록으로
          </Button>
        </div>
        
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>자산을 불러오는데 실패했습니다</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'}
          </AlertDescription>
        </Alert>
        
        <Button onClick={() => refetch()}>다시 시도</Button>
      </div>
    );
  }
  
  if (!asset) {
    return (
      <div className="max-w-[1200px] mx-auto py-6 space-y-6">
        <div className="flex justify-end space-x-2">
          <Button variant="ghost" size="sm" onClick={() => router.push('/accessmedia')}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            목록으로
          </Button>
        </div>
        
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>자산이 존재하지 않습니다</AlertTitle>
          <AlertDescription>
            요청한 ID {assetId}에 해당하는 접근성 미디어 자산을 찾을 수 없습니다.
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  const movieInfo = getMovieInfo();
  const guidelineInfo = getGuidelineInfo();
  
  return (
    <div className="max-w-[1200px] mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight text-[#333333]">{asset.name}</h1>
        
        <div className="flex space-x-2">
          <Button
            variant="ghost"
            className="hover:bg-[#f5fbf5] hover:text-[#4da34c]"
            onClick={() => router.push('/accessmedia')}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            목록으로
          </Button>
          
          <Button
            variant="outline"
            className="hover:bg-[#f5fbf5] hover:text-[#4da34c] hover:border-[#4da34c] transition-colors"
            onClick={() => router.push(`/accessmedia/${assetId}/edit`)}
          >
            <Pencil className="h-4 w-4 mr-1" />
            편집
          </Button>
          
          <Button
            variant="outline"
            className="hover:bg-[#fff5f3] hover:text-[#ff6246] hover:border-[#ff6246] transition-colors"
            onClick={handleDeleteAsset}
            disabled={deleteAssetMutation.isPending}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            삭제
          </Button>
        </div>
      </div>
      
      <div className="flex flex-wrap gap-2 items-center">
        <Badge className={`${getMediaTypeColor(asset.mediaType)} text-white`}>
          {asset.mediaType}
        </Badge>
        
        <Badge variant="outline">
          {getLanguageDisplay(asset.language)}
        </Badge>
        
        <Badge variant="outline">
          {getAssetTypeDisplay(asset.assetType)}
        </Badge>
        
        {getPublishingStatusBadge(asset.publishingStatus)}
        
        {getProductionStatusBadge(asset.productionStatus)}
        
        {asset.isPublic ? (
          <Badge variant="outline" className="bg-green-100">공개</Badge>
        ) : (
          <Badge variant="outline">비공개</Badge>
        )}
        
        {asset.isLocked ? (
          <Badge variant="outline" className="bg-red-100">잠김</Badge>
        ) : (
          <Badge variant="outline" className="bg-green-100">열림</Badge>
        )}
      </div>
      
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <Card className="border border-gray-300 shadow-sm hover:shadow-md transition-all duration-300 rounded-xl overflow-hidden">
            <CardHeader className="p-4 pb-2 bg-white">
              <CardTitle className="text-lg font-medium text-[#333333] flex items-center">
                <Info className="h-5 w-5 mr-2 text-[#ff6246]" />
                기본 정보
              </CardTitle>
              <CardDescription>접근성 미디어 자산의 상세 정보</CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">영화</p>
                  <p className="font-medium">{movieInfo.title}</p>
                </div>
                
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">미디어 유형</p>
                  <div className="flex items-center">
                    <Badge className={`${getMediaTypeColor(asset.mediaType)} text-white mr-2`}>
                      {asset.mediaType}
                    </Badge>
                    <span>
                      {asset.mediaType === 'AD' ? '음성해설 (Audio Description)' :
                       asset.mediaType === 'CC' ? '자막해설 (Closed Caption)' :
                       asset.mediaType === 'SL' ? '수어해설 (Sign Language)' :
                       asset.mediaType === 'AI' ? '음성소개 (Audio Introduction)' :
                       asset.mediaType === 'CI' ? '자막소개 (Caption Introduction)' :
                       asset.mediaType === 'SI' ? '수어소개 (Sign Introduction)' :
                       asset.mediaType === 'AR' ? '음성리뷰 (Audio Review)' :
                       asset.mediaType === 'CR' ? '자막리뷰 (Caption Review)' :
                       asset.mediaType === 'SR' ? '수어리뷰 (Sign Review)' : asset.mediaType}
                    </span>
                  </div>
                </div>
                
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">언어</p>
                  <p className="font-medium">{getLanguageDisplay(asset.language)}</p>
                </div>
                
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">자산 유형</p>
                  <p className="font-medium">{getAssetTypeDisplay(asset.assetType)}</p>
                </div>
                
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">제작 연도</p>
                  <p className="font-medium">{asset.productionYear || '정보 없음'}</p>
                </div>
                
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">가이드라인</p>
                  <p className="font-medium">{guidelineInfo.name}</p>
                </div>
              </div>
              
              <Separator className="my-4" />
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">게시 상태</p>
                  <div className="flex items-center">
                    {getPublishingStatusBadge(asset.publishingStatus)}
                  </div>
                </div>
                
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">제작 상태</p>
                  <div className="flex items-center">
                    {getProductionStatusBadge(asset.productionStatus)}
                  </div>
                </div>
                
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">접근 정책</p>
                  <p className="font-medium">{getAccessPolicyDisplay(asset.accessPolicy)}</p>
                </div>
                
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">지원 OS</p>
                  <div className="flex flex-wrap gap-1">
                    {asset.supportedOs && (
                      typeof asset.supportedOs === 'string' ? (
                        <Badge key={asset.supportedOs} variant="outline">{asset.supportedOs}</Badge>
                      ) : Array.isArray(asset.supportedOs) && asset.supportedOs.length > 0 ? (
                        asset.supportedOs.map((os: string) => (
                          <Badge key={os} variant="outline">{os}</Badge>
                        ))
                      ) : (
                        <span>지정된 OS 없음</span>
                      )
                    )}
                  </div>
                </div>
                
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">공개 여부</p>
                  <div className="flex items-center">
                    {asset.isPublic ? (
                      <Badge variant="outline" className="bg-green-100">공개</Badge>
                    ) : (
                      <Badge variant="outline">비공개</Badge>
                    )}
                  </div>
                </div>
                
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">잠금 상태</p>
                  <div className="flex items-center">
                    {asset.isLocked ? (
                      <Badge variant="outline" className="bg-red-100">잠김</Badge>
                    ) : (
                      <Badge variant="outline" className="bg-green-100">열림</Badge>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="space-y-3 mt-4">
                <p className="text-sm font-medium text-muted-foreground">설명</p>
                <div className="p-4 bg-gray-50 rounded-md">
                  <p className="whitespace-pre-wrap">{asset.description || '등록된 설명이 없습니다.'}</p>
                </div>
              </div>
              
              <Separator className="my-4" />
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">생성일</p>
                  <p className="font-medium">{format(new Date(asset.createdAt), 'PPP p', { locale: ko })}</p>
                </div>
                
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">마지막 업데이트</p>
                  <p className="font-medium">{format(new Date(asset.updatedAt), 'PPP p', { locale: ko })}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <CreditsManager assetId={assetId} mediaType={asset.mediaType} />
        </div>
        
        <div className="space-y-6">
          <Card className="border border-gray-300 shadow-sm hover:shadow-md transition-all duration-300 rounded-xl overflow-hidden">
            <CardHeader className="p-4 pb-2 bg-white">
              <CardTitle className="text-lg font-medium text-[#333333] flex items-center">
                <FileText className="h-5 w-5 mr-2 text-[#ff6246]" />
                미디어 파일
              </CardTitle>
              <CardDescription>업로드된 미디어 파일 정보 및 미리보기</CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              <MediaFileHandler asset={asset} />
            </CardContent>
          </Card>
          
          <Card className="border border-gray-300 shadow-sm hover:shadow-md transition-all duration-300 rounded-xl overflow-hidden">
            <CardHeader className="p-4 pb-2 bg-white">
              <CardTitle className="text-lg font-medium text-[#333333] flex items-center">
                <Lock className="h-5 w-5 mr-2 text-[#ff6246]" />
                접근 제어
              </CardTitle>
              <CardDescription>접근성 미디어 자산의 접근 제어 설정</CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              <AccessControl
                assetId={assetId}
                isLocked={asset.isLocked}
              />
            </CardContent>
          </Card>       
        </div>
      </div>
    </div>
  );
}

export default function ProtectedAccessMediaDetailPage({ params }: { params: { id: string } }) {
  return (
    <ProtectedRoute>
      <AccessMediaDetailPage params={params} />
    </ProtectedRoute>
  );
}
