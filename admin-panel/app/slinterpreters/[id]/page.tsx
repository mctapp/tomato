// app/slinterpreters/[id]/page.tsx
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
  Hand,
  Video,
  Image,
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
  Plus,
  Share2,
  Copy,
  Film,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useSLInterpreter, useDeleteSLInterpreter, useDeleteSLInterpreterSample } from '@/hooks/useSLInterpreters';
import { Skeleton } from '@/components/ui/skeleton';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Progress } from '@/components/ui/progress';
import { SLInterpreter, SLInterpreterSample, SLInterpreterCredit, SLInterpreterCreditsResponse } from '@/types/slinterpreters';
import { Expertise } from '@/types/personnel';
import { GENDER_DISPLAY, SIGN_LANGUAGE_DISPLAY, EXPERTISE_FIELD_DISPLAY } from '@/lib/constants/personnel';
import { getSkillLevelBadgeColor, safeArray } from '@/lib/utils/personnel';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

// 미디어 타입 한글 변환 함수
const getMediaTypeKorean = (mediaType: string) => {
  const types: Record<string, string> = {
    'AD': '음성해설',
    'CC': '자막해설',
    'SL': '수어해설',
    'AI': '음성소개',
    'CI': '자막소개',
    'SI': '수어소개',
    'AR': '음성리뷰',
    'CR': '자막리뷰',
    'SR': '수어리뷰',
  };
  return types[mediaType] || mediaType;
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
  skillGrade: number;
}

function GradeDisplay({ skillGrade }: GradeDisplayProps) {
  const grade = skillGrade ?? 0;
  
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

// 미디어 플레이어 컴포넌트
interface MediaPlayerProps {
  sample: SLInterpreterSample;
}

function MediaPlayer({ sample }: MediaPlayerProps) {
  const copyToClipboard = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('링크가 클립보드에 복사되었습니다.');
    } catch (err) {
      toast.error('링크 복사에 실패했습니다.');
    }
  };

  if (sample.sampleType === 'video' && sample.filePath) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Video className="h-4 w-4 text-gray-400 mr-2" />
            <span className="text-sm font-medium">{sample.title}</span>
          </div>
          <div className="flex items-center space-x-2">
            <Badge className="bg-purple-100 text-purple-800">
              #{sample.sequenceNumber}
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 hover:bg-blue-50 hover:text-blue-600"
              onClick={() => copyToClipboard(sample.filePath!)}
            >
              <Share2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
        <video 
          controls 
          className="w-full bg-black rounded-lg"
          style={{ aspectRatio: '16/9', maxHeight: '240px' }}
          src={sample.filePath}
        >
          <source src={sample.filePath} type="video/mp4" />
          브라우저가 비디오를 지원하지 않습니다.
        </video>
      </div>
    );
  } else if (sample.filePath) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Image className="h-4 w-4 text-gray-400 mr-2" />
            <span className="text-sm font-medium">{sample.title}</span>
          </div>
          <div className="flex items-center space-x-2">
            <Badge className="bg-green-100 text-green-800">
              #{sample.sequenceNumber}
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 hover:bg-blue-50 hover:text-blue-600"
              onClick={() => copyToClipboard(sample.filePath!)}
            >
              <Share2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
        <div className="w-full bg-gray-100 rounded-lg overflow-hidden">
          <img 
            src={sample.filePath} 
            alt={sample.title}
            className="w-full h-auto object-contain max-h-60"
            style={{ display: 'block' }}
          />
        </div>
      </div>
    );
  } else {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            {sample.sampleType === 'video' ? (
              <Video className="h-4 w-4 text-gray-400 mr-2" />
            ) : (
              <Image className="h-4 w-4 text-gray-400 mr-2" />
            )}
            <span className="text-sm font-medium">{sample.title}</span>
          </div>
          <Badge className="bg-gray-100 text-gray-600">
            #{sample.sequenceNumber}
          </Badge>
        </div>
        <div className="w-full h-48 bg-gray-100 rounded-lg flex items-center justify-center">
          <span className="text-gray-500">파일이 없습니다</span>
        </div>
      </div>
    );
  }
}

// 참여 작품 카드 컴포넌트
interface ParticipatedWorksCardProps {
  slInterpreterId: number;
}

function ParticipatedWorksCard({ slInterpreterId }: ParticipatedWorksCardProps) {
  const router = useRouter();
  
  const { data: creditsResponse, isLoading } = useQuery<SLInterpreterCreditsResponse>({
    queryKey: ['slInterpreterCredits', slInterpreterId],
    queryFn: async () => {
      const response = await api.get(`/admin/api/slinterpreters/${slInterpreterId}/credits`);
      return response.data;
    }
  });

  if (isLoading) {
    return (
      <Card className="border border-gray-300 shadow-sm rounded-xl overflow-hidden">
        <CardHeader className="p-4 pb-2 bg-white">
          <CardTitle className="text-lg font-medium text-[#333333] flex items-center">
            <Film className="h-5 w-5 mr-2 text-[#ff6246]" />
            참여 작품 목록
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <Skeleton className="h-20" />
        </CardContent>
      </Card>
    );
  }

  const participatedWorks = creditsResponse?.data || [];

  return (
    <Card className="border border-gray-300 shadow-sm hover:shadow-md transition-all duration-300 rounded-xl overflow-hidden">
      <CardHeader className="p-4 pb-2 bg-white">
        <CardTitle className="text-lg font-medium text-[#333333] flex items-center">
          <Film className="h-5 w-5 mr-2 text-[#ff6246]" />
          참여 작품 목록
        </CardTitle>
        <CardDescription>접근성 미디어 제작 참여 작품 ({participatedWorks.length}개)</CardDescription>
      </CardHeader>
      <CardContent className="p-4">
        {participatedWorks.length > 0 ? (
          <div className="space-y-2">
            <div className="grid grid-cols-12 gap-2 text-sm font-medium text-gray-600 pb-2 border-b">
              <div className="col-span-1">순번</div>
              <div className="col-span-5">작품명</div>
              <div className="col-span-2">유형</div>
              <div className="col-span-2">연도</div>
              <div className="col-span-2">역할</div>
            </div>
            {participatedWorks.map((credit: SLInterpreterCredit, index: number) => (
              <div key={`${credit.movieId}-${credit.accessAssetId}`} className="grid grid-cols-12 gap-2 text-sm py-2 hover:bg-gray-50 rounded">
                <div className="col-span-1 text-gray-500">{index + 1}</div>
                <div className="col-span-5">
                  <button
                    onClick={() => router.push(`/movies/${credit.movieId}`)}
                    className="font-medium text-left hover:text-[#ff6246] hover:underline transition-colors"
                  >
                    {credit.movieTitle}
                  </button>
                </div>
                <div className="col-span-2">
                  <button
                    onClick={() => router.push(`/accessmedia/${credit.accessAssetId}`)}
                    className="font-medium text-left hover:text-[#ff6246] hover:underline transition-colors"
                  >
                    {getMediaTypeKorean(credit.accessType)}
                  </button>
                </div>
                <div className="col-span-2 text-gray-700">
                  {credit.releaseYear || '-'}
                </div>
                <div className="col-span-2 text-gray-700">
                  {credit.isPrimary ? '주작업자' : '보조작업자'}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <Film className="h-8 w-8 mx-auto text-gray-300 mb-2" />
            <p className="text-gray-500 text-sm">참여한 작품이 없습니다.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface SLInterpreterDetailPageProps {
  params: { id: string };
}

function SLInterpreterDetailPage({ params }: SLInterpreterDetailPageProps) {
  const router = useRouter();
  const interpreterId = parseInt(params.id, 10);
  const [isBasicInfoExpanded, setIsBasicInfoExpanded] = useState(false);
  
  // 수어통역사 데이터 조회
  const { 
    data: interpreter, 
    isLoading, 
    isError, 
    error,
    refetch
  } = useSLInterpreter(interpreterId);
  
  // 수어통역사 삭제 뮤테이션
  const deleteInterpreterMutation = useDeleteSLInterpreter();
  
  // 샘플 삭제 뮤테이션
  const deleteSampleMutation = useDeleteSLInterpreterSample();
  
  // 수어통역사 삭제 핸들러
  const handleDeleteInterpreter = async () => {
    if (confirm('이 수어통역사를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      try {
        await deleteInterpreterMutation.mutateAsync(interpreterId);
        router.push('/slinterpreters');
      } catch (error) {
        console.error('Delete error:', error);
        alert('삭제 중 오류가 발생했습니다.');
      }
    }
  };
  
  // 샘플 삭제 핸들러
  const handleDeleteSample = async (sampleId: number) => {
    if (confirm('이 샘플을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      try {
        await deleteSampleMutation.mutateAsync({ 
          slInterpreterId: interpreterId, 
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
    if (interpreter) {
      console.log("수어통역사 데이터:", interpreter);
      const samples = safeArray(interpreter.samples);
      if (samples.length > 0) {
        console.log("샘플 데이터:", samples);
      }
    }
  }, [interpreter]);
  
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
          <Skeleton className="h-[600px] col-span-2" />
          <div className="space-y-6">
            <Skeleton className="h-[290px]" />
            <Skeleton className="h-[290px]" />
          </div>
        </div>
      </div>
    );
  }
  
  // 오류가 발생한 경우
  if (isError) {
    return (
      <div className="max-w-[1200px] mx-auto py-6 space-y-6">
        <div className="flex justify-end space-x-2">
          <Button variant="ghost" size="sm" onClick={() => router.push('/slinterpreters')}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            목록으로
          </Button>
        </div>
        
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>수어통역사 정보를 불러오는데 실패했습니다</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'}
          </AlertDescription>
        </Alert>
        
        <Button onClick={() => refetch()}>다시 시도</Button>
      </div>
    );
  }
  
  if (!interpreter) {
    return (
      <div className="max-w-[1200px] mx-auto py-6 space-y-6">
        <div className="flex justify-end space-x-2">
          <Button variant="ghost" size="sm" onClick={() => router.push('/slinterpreters')}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            목록으로
          </Button>
        </div>
        
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>수어통역사가 존재하지 않습니다</AlertTitle>
          <AlertDescription>
            요청한 ID {interpreterId}에 해당하는 수어통역사를 찾을 수 없습니다.
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  const signLanguages = safeArray(interpreter.signLanguages);
  const expertise = safeArray(interpreter.expertise);
  const samples = safeArray(interpreter.samples);
  
  return (
    <div className="max-w-[1200px] mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight text-[#333333]">{interpreter.name}</h1>
        
        <div className="flex space-x-2">
          <Button
            variant="ghost"
            className="hover:bg-[#f5fbf5] hover:text-[#4da34c]"
            onClick={() => router.push('/slinterpreters')}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            목록으로
          </Button>
          
          <Button
            variant="outline"
            className="hover:bg-[#f5fbf5] hover:text-[#4da34c] hover:border-[#4da34c] transition-colors"
            onClick={() => router.push(`/slinterpreters/${interpreterId}/edit`)}
          >
            <Pencil className="h-4 w-4 mr-1" />
            편집
          </Button>
          
          <Button
            variant="outline"
            className="hover:bg-[#fff5f3] hover:text-[#ff6246] hover:border-[#ff6246] transition-colors"
            onClick={handleDeleteInterpreter}
            disabled={deleteInterpreterMutation.isPending}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            삭제
          </Button>
        </div>
      </div>
      
      <div className="flex flex-wrap gap-2 items-center">
        {/* 스킬 레벨 Badge */}
        {(interpreter.skillLevel !== undefined && interpreter.skillLevel !== null) && (
          <Badge className={`${getSkillLevelBadgeColor(interpreter.skillLevel)} border`}>
            Lv.{interpreter.skillLevel}
          </Badge>
        )}
        
        {interpreter.gender && (
          <Badge variant="outline">
            {GENDER_DISPLAY[interpreter.gender] || interpreter.gender}
          </Badge>
        )}
        
        {interpreter.location && (
          <Badge variant="outline" className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {interpreter.location}
          </Badge>
        )}
        
        {/* 사용수어 Badge */}
        {signLanguages.map((signLang) => (
          <Badge key={signLang.signLanguageCode} variant="outline" className="bg-blue-50 text-blue-700">
            {SIGN_LANGUAGE_DISPLAY[signLang.signLanguageCode] || signLang.signLanguageCode} (Lv.{signLang.proficiencyLevel})
          </Badge>
        ))}
      </div>
      
      {/* 대시보드 스타일의 그리드 레이아웃 */}
      <div className="grid grid-cols-3 gap-6 items-start">
        {/* 기본 정보 섹션 - 2칸 너비 */}
        <div className="col-span-2 space-y-6">
          <Card className="border border-gray-300 shadow-sm hover:shadow-md transition-all duration-300 rounded-xl overflow-hidden">
            <CardHeader 
              className="p-4 pb-2 bg-white cursor-pointer"
              onClick={() => setIsBasicInfoExpanded(!isBasicInfoExpanded)}
            >
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-lg font-medium text-[#333333] flex items-center">
                    <Info className="h-5 w-5 mr-2 text-[#ff6246]" />
                    기본 정보
                  </CardTitle>
                  <CardDescription>수어통역사 기본 정보</CardDescription>
                </div>
                {isBasicInfoExpanded ? (
                  <ChevronUp className="h-5 w-5 text-gray-500" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-500" />
                )}
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-6">
              <div className="flex items-center space-x-4">
                {interpreter.profileImage ? (
                  <img 
                    src={interpreter.profileImage} 
                    alt={interpreter.name} 
                    className="h-24 w-24 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-24 w-24 rounded-full bg-gray-100 text-gray-800 flex items-center justify-center text-2xl font-medium">
                    {interpreter.name.slice(0, 2)}
                  </div>
                )}
                
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold">{interpreter.name}</h2>
                  <div className="flex flex-wrap gap-2 text-sm text-gray-500">
                    {interpreter.phone && (
                      <div className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        <span>{interpreter.phone}</span>
                        <button
                          onClick={() => copyToClipboard(interpreter.phone!, "전화번호")}
                          className="p-1 hover:bg-gray-100 rounded transition-colors"
                          title="전화번호 복사"
                        >
                          <Copy className="h-3 w-3 text-gray-500 hover:text-[#ff6246]" />
                        </button>
                      </div>
                    )}
                    
                    {interpreter.email && (
                      <div className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        <span>{interpreter.email}</span>
                        <button
                          onClick={() => copyToClipboard(interpreter.email!, "이메일")}
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
              {isBasicInfoExpanded && (
                <>
                  <Separator />
                  
                  {/* 메모 영역 */}
                  {(interpreter.memo && interpreter.memo.trim() !== '') ? (
                    <>
                      <div className="space-y-3">
                        <p className="text-sm font-medium text-muted-foreground">메모</p>
                        <div className="p-4 bg-gray-50 rounded-md">
                          <p className="whitespace-pre-wrap">{interpreter.memo}</p>
                        </div>
                      </div>
                      <Separator />
                    </>
                  ) : null}
                  
                  {/* 전문 영역 */}
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-muted-foreground">전문 영역</p>
                    
                    {expertise.length > 0 ? (
                      <div className="space-y-4">
                        {expertise.map((exp: Expertise, index: number) => (
                          <div key={index} className="p-4 bg-gray-50 rounded-md">
                            <div className="flex justify-between items-center mb-2">
                              <Badge className="bg-blue-100 text-blue-800">
                                {EXPERTISE_FIELD_DISPLAY[exp.expertiseField] || exp.expertiseField}
                                {exp.expertiseField === 'other' && exp.expertiseFieldOther && ` (${exp.expertiseFieldOther})`}
                              </Badge>
                            </div>
                            <GradeDisplay skillGrade={exp.skillGrade} />
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
                        {interpreter.createdAt ? 
                          (
                            (() => {
                              try {
                                return format(new Date(interpreter.createdAt), 'PPP p', { locale: ko });
                              } catch (e) {
                                console.error("날짜 포맷 오류:", interpreter.createdAt, e);
                                return interpreter.createdAt;
                              }
                            })()
                          ) : '-'
                        }
                      </p>
                    </div>
                    
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">마지막 업데이트</p>
                      <p className="font-medium">
                        {interpreter.updatedAt ? 
                          (
                            (() => {
                              try {
                                return format(new Date(interpreter.updatedAt), 'PPP p', { locale: ko });
                              } catch (e) {
                                console.error("날짜 포맷 오류:", interpreter.updatedAt, e);
                                return interpreter.updatedAt;
                              }
                            })()
                          ) : '-'
                        }
                      </p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* 참여 작품 목록 카드 추가 */}
          <ParticipatedWorksCard slInterpreterId={interpreterId} />
        </div>
        
        {/* 오른쪽 열 - 샘플 */}
        <div className="space-y-6">
          <Card className="border border-gray-300 shadow-sm hover:shadow-md transition-all duration-300 rounded-xl overflow-hidden">
            <CardHeader className="p-4 pb-2 bg-white flex flex-row justify-between items-center">
              <div>
                <CardTitle className="text-lg font-medium text-[#333333] flex items-center">
                  <Hand className="h-5 w-5 mr-2 text-[#ff6246]" />
                  샘플
                </CardTitle>
                <CardDescription>등록된 영상/사진 샘플 목록</CardDescription>
              </div>
              
              <Button 
                size="sm"
                className="bg-[#4da34c] hover:bg-[#3d8c3c]"
                onClick={() => router.push(`/slinterpreters/${interpreterId}/samples/add`)}
              >
                <Plus className="h-4 w-4 mr-1" />
                샘플 추가
              </Button>
            </CardHeader>
            <CardContent className="p-4">
              {samples.length > 0 ? (
                <div className="space-y-4">
                  {samples.map((sample: SLInterpreterSample) => {
                    return (
                      <div key={sample.id} className="border p-3 rounded-lg hover:bg-gray-50">
                        <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center space-x-2">
                            {sample.sampleType === 'video' ? (
                              <Badge className="bg-purple-100 text-purple-800">
                                <Video className="h-3 w-3 mr-1" />
                                영상 #{sample.sequenceNumber}
                              </Badge>
                            ) : (
                              <Badge className="bg-green-100 text-green-800">
                                <Image className="h-3 w-3 mr-1" />
                                사진 #{sample.sequenceNumber}
                              </Badge>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 hover:bg-red-50 hover:text-red-500"
                            onClick={() => handleDeleteSample(sample.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <MediaPlayer sample={sample} />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <Hand className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                  <p className="text-gray-500">등록된 샘플이 없습니다.</p>
                  <Button 
                    className="mt-4 bg-[#4da34c] hover:bg-[#3d8c3c]"
                    onClick={() => router.push(`/slinterpreters/${interpreterId}/samples/add`)}
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

export default function ProtectedSLInterpreterDetailPage({ params }: { params: { id: string } }) {
  return (
    <ProtectedRoute>
      <SLInterpreterDetailPage params={params} />
    </ProtectedRoute>
  );
}
