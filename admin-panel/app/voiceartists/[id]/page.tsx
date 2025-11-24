// app/voiceartists/[id]/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
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
  Mic,
  Volume2,
  Info,
  AlertCircle,
  Play,
  Pause,
  RefreshCw,
  User,
  Mail,
  Phone,
  MapPin,
  Star,
  FileAudio,
  Download,
  Plus,
  Film,
  Calendar,
  Globe,
  ChevronDown,
  ChevronUp,
  Copy
} from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useVoiceArtist, useDeleteVoiceArtist, useDeleteVoiceArtistSample, useVoiceArtistAccessAssets } from '@/hooks/useVoiceArtists';
import { Skeleton } from '@/components/ui/skeleton';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Progress } from '@/components/ui/progress';
import { VoiceArtist, VoiceArtistExpertise, VoiceArtistSample, VoiceArtistAccessAsset } from '@/types/voiceartists';
import AudioPlayer from '@/components/audio/AudioPlayer';
import { toast } from 'sonner';

// 성별 표시
const GENDER_DISPLAY: Record<string, string> = {
  'male': '남성',
  'female': '여성',
  'other': '기타',
  'prefer_not_to_say': '미표시'
};

// 전문 영역 도메인 표시
const DOMAIN_DISPLAY: Record<string, string> = {
  'movie': '영화',
  'video': '영상물',
  'theater': '연극',
  'performance': '공연',
  'other': '기타'
};

// 미디어 타입 표시
const MEDIA_TYPE_DISPLAY: Record<string, string> = {
  'AD': '음성해설',
  'CC': '자막해설', 
  'SL': '수어해설',
  'AI': '음성소개',
  'CI': '자막소개',
  'SI': '수어소개',
  'AR': '음성리뷰',
  'CR': '자막리뷰',
  'SR': '수어리뷰'
};

// 언어 표시
const LANGUAGE_DISPLAY: Record<string, string> = {
  'ko': '한국어',
  'en': '영어',
  'ja': '일본어',
  'zh': '중국어',
  'vi': '베트남어',
  'fr': '프랑스어',
  'es': '스페인어',
  'de': '독일어',
  'ru': '러시아어',
  'ar': '아랍어',
  'th': '태국어'
};

// 레벨별 배지 색상
const getLevelBadgeColor = (level: number | undefined): string => {
  if (!level) return 'bg-gray-100 text-gray-800';
  if (level >= 7) return 'bg-purple-100 text-purple-800';
  if (level >= 5) return 'bg-green-100 text-green-800';
  if (level >= 3) return 'bg-blue-100 text-blue-800';
  return 'bg-gray-100 text-gray-800';
};

// 클립보드 복사 함수
const copyToClipboard = async (text: string, type: string) => {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${type}이(가) 클립보드에 복사되었습니다`);
  } catch (err) {
    toast.error("복사 실패", {
      description: "클립보드 복사에 실패했습니다"
    });
  }
};

// 등급 표시 컴포넌트
interface GradeDisplayProps {
  grade: number;
}

function GradeDisplay({ grade }: GradeDisplayProps) {
  return (
    <div className="flex items-center">
      {Array.from({ length: 9 }).map((_, i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${
            i < grade ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
          }`}
        />
      ))}
      <span className="ml-2 text-sm font-medium">{grade}/9</span>
    </div>
  );
}

interface VoiceArtistDetailPageProps {
  params: { id: string };
}

function VoiceArtistDetailPage({ params }: VoiceArtistDetailPageProps) {
  const router = useRouter();
  const artistId = parseInt(params.id, 10);
  const [isInfoExpanded, setIsInfoExpanded] = useState(false); // 기본값 false (접힘)
  
  // 성우 데이터 조회
  const { 
    data: artist, 
    isLoading, 
    isError, 
    error,
    refetch
  } = useVoiceArtist(artistId);
  
  // 성우가 참여한 접근성 미디어 자산 조회
  const { 
    data: accessAssets, 
    isLoading: isLoadingAssets 
  } = useVoiceArtistAccessAssets(artistId);
  
  // 성우 삭제 뮤테이션
  const deleteArtistMutation = useDeleteVoiceArtist();
  
  // 샘플 삭제 뮤테이션
  const deleteSampleMutation = useDeleteVoiceArtistSample();
  
  // 성우 삭제 핸들러
  const handleDeleteArtist = async () => {
    if (confirm('이 성우를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      try {
        await deleteArtistMutation.mutateAsync(artistId);
        router.push('/voiceartists');
      } catch (error) {
        console.error('Delete error:', error);
        alert('삭제 중 오류가 발생했습니다.');
      }
    }
  };
  
  // 샘플 삭제 핸들러
  const handleDeleteSample = async (sampleId: number) => {
    if (confirm('이 음성 샘플을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      try {
        await deleteSampleMutation.mutateAsync({ 
          voiceArtistId: artistId, 
          sampleId 
        });
        refetch();
      } catch (error) {
        console.error('Delete sample error:', error);
        alert('샘플 삭제 중 오류가 발생했습니다.');
      }
    }
  };

  // API 응답 데이터 로깅 (디버깅용)
  useEffect(() => {
    if (artist) {
      console.log("성우 데이터:", artist);
      if (artist.samples) {
        console.log("샘플 데이터:", artist.samples);
      }
    }
  }, [artist]);
  
  // 로딩 중인 경우
  if (isLoading) {
    return (
      <div className="max-w-[1200px] mx-auto py-6 space-y-6">
        <div className="flex justify-end space-x-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
        </div>
        
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-6">
            <Skeleton className="h-[200px]" />
            <Skeleton className="h-[400px]" />
          </div>
          <Skeleton className="h-[290px]" />
        </div>
      </div>
    );
  }
  
  // 오류가 발생한 경우
  if (isError) {
    return (
      <div className="max-w-[1200px] mx-auto py-6 space-y-6">
        <div className="flex justify-end space-x-2">
          <Button variant="ghost" size="sm" onClick={() => router.push('/voiceartists')}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            목록으로
          </Button>
        </div>
        
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>성우 정보를 불러오는데 실패했습니다</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'}
          </AlertDescription>
        </Alert>
        
        <Button onClick={() => refetch()}>다시 시도</Button>
      </div>
    );
  }
  
  if (!artist) {
    return (
      <div className="max-w-[1200px] mx-auto py-6 space-y-6">
        <div className="flex justify-end space-x-2">
          <Button variant="ghost" size="sm" onClick={() => router.push('/voiceartists')}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            목록으로
          </Button>
        </div>
        
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>성우가 존재하지 않습니다</AlertTitle>
          <AlertDescription>
            요청한 ID {artistId}에 해당하는 성우를 찾을 수 없습니다.
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  // 연도 추출 함수
  const getYear = (dateString: string | undefined) => {
    if (!dateString) return '-';
    try {
      return new Date(dateString).getFullYear().toString();
    } catch {
      return '-';
    }
  };
  
  return (
    <div className="max-w-[1200px] mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight text-[#333333]">{artist.voiceartistName}</h1>
        
        <div className="flex space-x-2">
          <Button
            variant="ghost"
            className="hover:bg-[#f5fbf5] hover:text-[#4da34c]"
            onClick={() => router.push('/voiceartists')}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            목록으로
          </Button>
          
          <Button
            variant="outline"
            className="hover:bg-[#f5fbf5] hover:text-[#4da34c] hover:border-[#4da34c] transition-colors"
            onClick={() => router.push(`/voiceartists/${artistId}/edit`)}
          >
            <Pencil className="h-4 w-4 mr-1" />
            편집
          </Button>
          
          <Button
            variant="outline"
            className="hover:bg-[#fff5f3] hover:text-[#ff6246] hover:border-[#ff6246] transition-colors"
            onClick={handleDeleteArtist}
            disabled={deleteArtistMutation.isPending}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            삭제
          </Button>
        </div>
      </div>
      
      <div className="flex flex-wrap gap-2 items-center">
        {/* 레벨 Badge - 값이 있을 때만 표시 */}
        {(artist.voiceartistLevel !== undefined && artist.voiceartistLevel !== null) && (
          <Badge className={`${getLevelBadgeColor(Number(artist.voiceartistLevel))} border`}>
            Lv.{artist.voiceartistLevel}
          </Badge>
        )}
        
        {artist.voiceartistGender && (
          <Badge variant="outline">
            {GENDER_DISPLAY[artist.voiceartistGender] || artist.voiceartistGender}
          </Badge>
        )}
        
        {artist.voiceartistLocation && (
          <Badge variant="outline" className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {artist.voiceartistLocation}
          </Badge>
        )}
      </div>
      
      {/* 대시보드 스타일의 그리드 레이아웃 */}
      <div className="grid grid-cols-3 gap-6">
        {/* 왼쪽 열 - 기본 정보와 참여 작품 목록 */}
        <div className="col-span-2 space-y-6">
          {/* 기본 정보 섹션 - 펼침/접힘 기능 추가 */}
          <Card className="border border-gray-300 shadow-sm hover:shadow-md transition-all duration-300 rounded-xl overflow-hidden">
            <CardHeader 
              className="p-4 pb-2 bg-white cursor-pointer"
              onClick={() => setIsInfoExpanded(!isInfoExpanded)}
            >
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-lg font-medium text-[#333333] flex items-center">
                    <Info className="h-5 w-5 mr-2 text-[#ff6246]" />
                    기본 정보
                  </CardTitle>
                  <CardDescription>성우 기본 정보</CardDescription>
                </div>
                {isInfoExpanded ? (
                  <ChevronUp className="h-5 w-5 text-gray-500" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-500" />
                )}
              </div>
            </CardHeader>
            <CardContent className="p-4">
              {/* 항상 표시되는 기본 정보 */}
              <div className="flex items-center space-x-4">
                {artist.profileImage ? (
                  <img 
                    src={artist.profileImage} 
                    alt={artist.voiceartistName} 
                    className="h-24 w-24 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-24 w-24 rounded-full bg-gray-100 text-gray-800 flex items-center justify-center text-2xl font-medium">
                    {artist.voiceartistName.slice(0, 2)}
                  </div>
                )}
                
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold">{artist.voiceartistName}</h2>
                  <div className="flex flex-wrap gap-2 text-sm text-gray-500">
                    {artist.voiceartistPhone && (
                      <div className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        <span>{artist.voiceartistPhone}</span>
                        <button
                          onClick={() => copyToClipboard(artist.voiceartistPhone!, "전화번호")}
                          className="p-1 hover:bg-gray-100 rounded transition-colors"
                          title="전화번호 복사"
                        >
                          <Copy className="h-3 w-3 text-gray-500 hover:text-[#ff6246]" />
                        </button>
                      </div>
                    )}
                    
                    {artist.voiceartistEmail && (
                      <div className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        <span>{artist.voiceartistEmail}</span>
                        <button
                          onClick={() => copyToClipboard(artist.voiceartistEmail!, "이메일")}
                          className="p-1 hover:bg-gray-100 rounded transition-colors"
                          title="이메일 복사"
                        >
                          <Copy className="h-3 w-3 text-gray-500 hover:text-[#ff6246]" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* 펼쳤을 때만 표시되는 추가 정보 */}
              {isInfoExpanded && (
                <div className="space-y-6 mt-6">
                  <Separator />
                  
                  {/* 메모 영역 - 값이 있을 때만 표시 */}
                  {(artist.voiceartistMemo && artist.voiceartistMemo.trim() !== '') ? (
                    <>
                      <div className="space-y-3">
                        <p className="text-sm font-medium text-muted-foreground">메모</p>
                        <div className="p-4 bg-gray-50 rounded-md">
                          <p className="whitespace-pre-wrap">{artist.voiceartistMemo}</p>
                        </div>
                      </div>
                      <Separator />
                    </>
                  ) : null}
                  
                  {/* 전문 영역 */}
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-muted-foreground">전문 영역</p>
                    
                    {artist.expertise && artist.expertise.length > 0 ? (
                      <div className="space-y-4">
                        {artist.expertise.map((exp: VoiceArtistExpertise, index: number) => (
                          <div key={index} className="p-4 bg-gray-50 rounded-md">
                            <div className="flex justify-between items-center mb-2">
                              <Badge className="bg-blue-100 text-blue-800">
                                {DOMAIN_DISPLAY[exp.domain] || exp.domain}
                                {exp.domain === 'other' && exp.domainOther && ` (${exp.domainOther})`}
                              </Badge>
                            </div>
                            <GradeDisplay grade={exp.grade} />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 bg-gray-50 rounded-md text-center text-gray-500">
                        등록된 전문 영역이 없습니다.
                      </div>
                    )}
                  </div>
                  
                  <Separator />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">생성일</p>
                      <p className="font-medium">
                        {artist.createdAt ? 
                          (
                            (() => {
                              try {
                                return format(new Date(artist.createdAt), 'PPP p', { locale: ko });
                              } catch (e) {
                                console.error("날짜 포맷 오류:", artist.createdAt, e);
                                return artist.createdAt;
                              }
                            })()
                          ) : '-'
                        }
                      </p>
                    </div>
                    
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">마지막 업데이트</p>
                      <p className="font-medium">
                        {artist.updatedAt ? 
                          (
                            (() => {
                              try {
                                return format(new Date(artist.updatedAt), 'PPP p', { locale: ko });
                              } catch (e) {
                                console.error("날짜 포맷 오류:", artist.updatedAt, e);
                                return artist.updatedAt;
                              }
                            })()
                          ) : '-'
                        }
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 참여 작품 목록 카드 - 표 형식으로 변경 */}
          <Card className="border border-gray-300 shadow-sm hover:shadow-md transition-all duration-300 rounded-xl overflow-hidden">
            <CardHeader className="p-4 pb-2 bg-white">
              <CardTitle className="text-lg font-medium text-[#333333] flex items-center">
                <Film className="h-5 w-5 mr-2 text-[#ff6246]" />
                참여 작품 목록
              </CardTitle>
              <CardDescription>접근성 미디어 제작 참여 작품 ({accessAssets?.length || 0}개)</CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              {isLoadingAssets ? (
                <div className="text-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin mx-auto text-gray-400" />
                  <p className="text-gray-500 mt-2">불러오는 중...</p>
                </div>
              ) : accessAssets && accessAssets.length > 0 ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-12 gap-2 text-sm font-medium text-gray-600 pb-2 border-b">
                    <div className="col-span-1">순번</div>
                    <div className="col-span-5">작품명</div>
                    <div className="col-span-2">유형</div>
                    <div className="col-span-2">연도</div>
                    <div className="col-span-2">역할</div>
                  </div>
                  {accessAssets.map((asset: VoiceArtistAccessAsset, index: number) => {
                    // movie 정보를 미리 추출
                    const movieId = asset.movie?.id;
                    const movieTitle = asset.movie?.title;
                    
                    return (
                      <div key={asset.id} className="grid grid-cols-12 gap-2 text-sm py-2 hover:bg-gray-50 rounded">
                        <div className="col-span-1 text-gray-500">{index + 1}</div>
                        <div className="col-span-5">
                          {movieId && movieTitle ? (
                            <button
                              onClick={() => router.push(`/movies/${movieId}`)}
                              className="font-medium text-left hover:text-[#ff6246] hover:underline transition-colors"
                            >
                              {movieTitle}
                            </button>
                          ) : (
                            <span className="text-gray-700">{asset.name}</span>
                          )}
                        </div>
                        <div className="col-span-2">
                          <button
                            onClick={() => router.push(`/accessmedia/${asset.id}`)}
                            className="font-medium text-left hover:text-[#ff6246] hover:underline transition-colors"
                          >
                            {MEDIA_TYPE_DISPLAY[asset.mediaType] || asset.mediaType}
                          </button>
                        </div>
                        <div className="col-span-2 text-gray-700">
                          {asset.productionYear || getYear(asset.movie?.releaseDate)}
                        </div>
                        <div className="col-span-2 text-gray-700">
                          {asset.credit?.isPrimary ? '주작업자' : '보조작업자'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <Film className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                  <p className="text-gray-500">참여한 접근성 미디어가 없습니다.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        {/* 오른쪽 열 - 음성 샘플 */}
        <div>
          {/* 음성 샘플 카드 */}
          <Card className="border border-gray-300 shadow-sm hover:shadow-md transition-all duration-300 rounded-xl overflow-hidden">
            <CardHeader className="p-4 pb-2 bg-white flex flex-row justify-between items-center">
              <div>
                <CardTitle className="text-lg font-medium text-[#333333] flex items-center">
                  <Volume2 className="h-5 w-5 mr-2 text-[#ff6246]" />
                  음성 샘플
                </CardTitle>
                <CardDescription>등록된 음성 샘플 목록</CardDescription>
              </div>
              
              <Button 
                size="sm"
                className="bg-[#4da34c] hover:bg-[#3d8c3c]"
                onClick={() => router.push(`/voiceartists/${artistId}/samples/add`)}
              >
                <Plus className="h-4 w-4 mr-1" />
                샘플 추가
              </Button>
            </CardHeader>
            <CardContent className="p-4">
              {artist.samples && artist.samples.length > 0 ? (
                <div className="space-y-4">
                  {artist.samples.map((sample: VoiceArtistSample) => {
                    return (
                      <div key={sample.id} className="border p-3 rounded-lg hover:bg-gray-50">
                        <div className="flex justify-between items-center mb-2">
                          <Badge className="bg-blue-100 text-blue-800">
                            #{sample.sequenceNumber}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 hover:bg-red-50 hover:text-red-500"
                            onClick={() => handleDeleteSample(sample.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        {/* 기존 오디오 플레이어 대신 분리된 컴포넌트 사용 */}
                        <AudioPlayer 
                          src={sample.filePath} 
                          title={sample.title} 
                        />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <Volume2 className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                  <p className="text-gray-500">등록된 음성 샘플이 없습니다.</p>
                  <Button 
                    className="mt-4 bg-[#4da34c] hover:bg-[#3d8c3c]"
                    onClick={() => router.push(`/voiceartists/${artistId}/samples/add`)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    샘플 추가하기
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

/**
 * 최종 Default Export: ProtectedRoute로 감싼 페이지
 */
export default function ProtectedVoiceArtistDetailPage({ params }: { params: { id: string } }) {
  return (
    <ProtectedRoute>
      <VoiceArtistDetailPage params={params} />
    </ProtectedRoute>
  );
}
