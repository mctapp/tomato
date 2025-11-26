'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardFooter 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { 
  ArrowLeft, 
  Pencil, 
  Trash2, 
  PenTool,
  Image,
  Info,
  AlertCircle,
  Plus,
  Copy,
  ExternalLink,
  Calendar,
  User,
  Mail,
  Phone,
  MapPin,
  Star,
  Languages,
  FileText,
  Clock,
  Share2,
  ChevronDown,
  ChevronUp,
  Film
} from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { 
  useScriptwriter, 
  useDeleteScriptwriter, 
  useDeleteScriptwriterSample,
  useCreateScriptwriterWorkLog,
  useDeleteScriptwriterWorkLog
} from '@/hooks/useScriptwriters';
import { Skeleton } from '@/components/ui/skeleton';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Progress } from '@/components/ui/progress';
import { 
  Scriptwriter, 
  ScriptwriterSample, 
  ScriptwriterWorkLog,
  ScriptwriterWorkLogFormData,
  ScriptwriterCredit,
  ScriptwriterCreditsResponse
} from '@/types/scriptwriters';
import { 
  GENDER_DISPLAY, 
  LANGUAGE_DISPLAY, 
  SPECIALTY_DISPLAY,
  SPECIALTY_FULL_DISPLAY,
  SPECIALTY_COLORS
} from '@/lib/constants/scriptwriter';
import { getSkillLevelBadgeColor, safeArray } from '@/lib/utils/personnel';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

// ✅ 날짜 포맷 유틸리티 함수
function formatDate(dateString: string | undefined | null, formatStr: string = 'PPP p'): string {
  if (!dateString) return '-';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      console.error("Invalid date string:", dateString);
      return dateString;
    }
    return format(date, formatStr, { locale: ko });
  } catch (error) {
    console.error("Date formatting error:", error, "Input:", dateString);
    return dateString;
  }
}

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

// 대표해설 카드 컴포넌트
interface SampleCardProps {
  sample: ScriptwriterSample;
  onDelete: (sampleId: number) => void;
}

function SampleCard({ sample, onDelete }: SampleCardProps) {
  const [isLoadingReferenceUrl, setIsLoadingReferenceUrl] = useState(false);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('클립보드에 복사되었습니다.');
    } catch (err) {
      toast.error('복사에 실패했습니다.');
    }
  };

  const openReferenceImage = async () => {
    if (!sample.referenceImage || !sample.scriptwriterId || !sample.id) {
      return;
    }

    setIsLoadingReferenceUrl(true);
    try {
      const response = await fetch(
        `/admin/api/scriptwriters/${sample.scriptwriterId}/samples/${sample.id}/reference-image-url?expires_in=3600`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to get image URL');
      }

      const data = await response.json();
      window.open(data.url, '_blank');
    } catch (error) {
      console.error('Error getting reference image URL:', error);
      toast.error('참고 이미지를 열 수 없습니다.');
    } finally {
      setIsLoadingReferenceUrl(false);
    }
  };

  const openReferenceUrl = () => {
    if (sample.referenceUrl) {
      window.open(sample.referenceUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <Card className="border border-gray-200 hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex justify-between items-center mb-4">
          <Badge className="bg-blue-100 text-blue-800">
            #{sample.sequenceNumber}
          </Badge>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 hover:bg-red-50 hover:text-red-500"
            onClick={() => onDelete(sample.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex gap-4">
          <div className="flex-shrink-0">
            {sample.posterImage ? (
              <img 
                src={sample.posterImage} 
                alt={sample.workTitle}
                className="w-20 h-28 object-cover rounded-lg border"
              />
            ) : (
              <div className="w-20 h-28 bg-gray-100 rounded-lg border flex items-center justify-center">
                <Image className="h-6 w-6 text-gray-400" />
              </div>
            )}
          </div>

          <div className="flex-1 space-y-2">
            <div>
              <h4 className="font-medium text-lg">{sample.workTitle}</h4>
              {sample.directorName && (
                <p className="text-sm text-gray-600">감독: {sample.directorName}</p>
              )}
              
              <div className="flex items-center space-x-3 text-sm mt-1">
                {sample.workYear && (
                  <span className="flex items-center">
                    <Calendar className="h-3 w-3 mr-1" />
                    {sample.workYear}년
                  </span>
                )}
                
                <div className="flex space-x-1">
                  {sample.hasAd && (
                    <Badge className={`${SPECIALTY_COLORS.AD.bg} ${SPECIALTY_COLORS.AD.text}`}>AD</Badge>
                  )}
                  {sample.hasCc && (
                    <Badge className={`${SPECIALTY_COLORS.CC.bg} ${SPECIALTY_COLORS.CC.text}`}>CC</Badge>
                  )}
                </div>
              </div>
              
              {(sample.timecodeIn || sample.timecodeOut) && (
                <div className="text-sm mt-1">
                  <span className="text-gray-500">TC:</span>
                  <span className="font-mono ml-1">
                    {sample.timecodeIn || '00:00:00'} - {sample.timecodeOut || '00:00:00'}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <div className="flex items-center space-x-2">
            {sample.referenceUrl && (
              <Button
                variant="outline"
                size="sm"
                onClick={openReferenceUrl}
                className="h-7 px-2"
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                링크 열기
              </Button>
            )}
            
            {sample.referenceImage && (
              <Button
                variant="outline"
                size="sm"
                onClick={openReferenceImage}
                disabled={isLoadingReferenceUrl}
                className="h-7 px-2"
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                {isLoadingReferenceUrl ? '로딩중...' : '참고 이미지'}
              </Button>
            )}
          </div>

          {sample.narrationContent && (
            <div className="text-sm">
              <p className="text-gray-500 mb-1">해설 내용:</p>
              <p className="text-gray-700 whitespace-pre-wrap">{sample.narrationContent}</p>
            </div>
          )}

          {sample.narrationMemo && (
            <div className="text-sm">
              <p className="text-gray-500 mb-1">해설 메모:</p>
              <p className="text-gray-700 whitespace-pre-wrap">{sample.narrationMemo}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// 작업 로그 카드 컴포넌트
interface WorkLogCardProps {
  workLog: ScriptwriterWorkLog;
  onDelete: (workLogId: number) => void;
}

function WorkLogCard({ workLog, onDelete }: WorkLogCardProps) {
  return (
    <Card className="border border-gray-200">
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h4 className="font-medium">{workLog.workTitle}</h4>
            <div className="flex items-center text-sm text-gray-500 mt-1">
              <Calendar className="h-3 w-3 mr-1" />
              {workLog.workYearMonth}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 hover:bg-red-50 hover:text-red-500"
            onClick={() => onDelete(workLog.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
        
        <p className="text-sm text-gray-700 whitespace-pre-wrap">{workLog.content}</p>
        
        <div className="text-xs text-gray-400 mt-3">
          {formatDate(workLog.createdAt)}
        </div>
      </CardContent>
    </Card>
  );
}

// 작업 로그 추가 폼 컴포넌트
interface WorkLogFormProps {
  scriptwriterId: number;
  onSuccess: () => void;
}

function WorkLogForm({ scriptwriterId, onSuccess }: WorkLogFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const createWorkLogMutation = useCreateScriptwriterWorkLog();

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
    watch
  } = useForm<ScriptwriterWorkLogFormData>({
    mode: 'onChange',
    defaultValues: {
      workTitle: '',
      workYearMonth: '',
      content: ''
    }
  });

  const formValues = watch();

  const onSubmit = async (data: ScriptwriterWorkLogFormData) => {
    try {
      console.log('Submitting work log data:', data);
      
      await createWorkLogMutation.mutateAsync({
        scriptwriterId,
        workLogData: data
      });
      
      toast.success('작업 로그가 추가되었습니다.');
      reset();
      setIsOpen(false);
      onSuccess();
    } catch (error) {
      console.error('Work log creation error:', error);
      toast.error('작업 로그 추가 중 오류가 발생했습니다.');
    }
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="w-full bg-[#4da34c] hover:bg-[#3d8c3c]"
      >
        <Plus className="h-4 w-4 mr-2" />
        작업 로그 추가
      </Button>
    );
  }

  return (
    <Card className="border-2 border-[#4da34c]">
      <CardContent className="p-4">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="workTitle">작품명 *</Label>
            <Controller
              name="workTitle"
              control={control}
              rules={{ 
                required: "작품명은 필수입니다",
                validate: (value) => value?.trim() !== '' || "작품명을 입력해주세요"
              }}
              render={({ field }) => (
                <Input
                  {...field}
                  id="workTitle"
                  type="text"
                  placeholder="작품명을 입력하세요"
                  className="border-gray-300"
                />
              )}
            />
            {errors.workTitle && (
              <p className="text-sm text-red-500">{errors.workTitle.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="workYearMonth">작업연월 *</Label>
            <Controller
              name="workYearMonth"
              control={control}
              rules={{ required: "작업연월은 필수입니다" }}
              render={({ field }) => (
                <Input
                  {...field}
                  id="workYearMonth"
                  type="month"
                  className="border-gray-300"
                />
              )}
            />
            {errors.workYearMonth && (
              <p className="text-sm text-red-500">{errors.workYearMonth.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">작업 내용 *</Label>
            <Controller
              name="content"
              control={control}
              rules={{ 
                required: "작업 내용은 필수입니다",
                validate: (value) => value?.trim() !== '' || "작업 내용을 입력해주세요"
              }}
              render={({ field }) => (
                <Textarea
                  {...field}
                  id="content"
                  placeholder="작업 내용을 입력하세요"
                  className="border-gray-300"
                  rows={4}
                />
              )}
            />
            {errors.content && (
              <p className="text-sm text-red-500">{errors.content.message}</p>
            )}
          </div>

          {process.env.NODE_ENV === 'development' && (
            <div className="text-xs text-gray-500 p-2 bg-gray-50 rounded">
              <p>Current values:</p>
              <pre>{JSON.stringify(formValues, null, 2)}</pre>
            </div>
          )}

          <div className="flex space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsOpen(false);
                reset();
              }}
              className="flex-1"
            >
              취소
            </Button>
            <Button
              onClick={handleSubmit(onSubmit)}
              disabled={isSubmitting}
              className="flex-1 bg-[#4da34c] hover:bg-[#3d8c3c]"
            >
              {isSubmitting ? "추가 중..." : "추가"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// 참여 작품 카드 컴포넌트
interface ParticipatedWorksCardProps {
  scriptwriterId: number;
}

function ParticipatedWorksCard({ scriptwriterId }: ParticipatedWorksCardProps) {
  const router = useRouter();
  
  const { data: creditsResponse, isLoading } = useQuery<ScriptwriterCreditsResponse>({
    queryKey: ['scriptwriterCredits', scriptwriterId],
    queryFn: async () => {
      const response = await api.get(`/admin/api/scriptwriters/${scriptwriterId}/credits`);
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
            {participatedWorks.map((credit: ScriptwriterCredit, index: number) => (
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

interface ScriptwriterDetailPageProps {
  params: { id: string };
}

function ScriptwriterDetailPage({ params }: ScriptwriterDetailPageProps) {
  const router = useRouter();
  const scriptwriterId = parseInt(params.id, 10);
  const [isBasicInfoExpanded, setIsBasicInfoExpanded] = useState(false);
  
  const { 
    data: scriptwriter, 
    isLoading, 
    isError, 
    error,
    refetch
  } = useScriptwriter(scriptwriterId);
  
  const deleteScriptwriterMutation = useDeleteScriptwriter();
  const deleteSampleMutation = useDeleteScriptwriterSample();
  const deleteWorkLogMutation = useDeleteScriptwriterWorkLog();
  
  const handleDeleteScriptwriter = async () => {
    if (confirm('이 해설작가를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      try {
        await deleteScriptwriterMutation.mutateAsync(scriptwriterId);
        router.push('/scriptwriters');
      } catch (error) {
        console.error('Delete error:', error);
        alert('삭제 중 오류가 발생했습니다.');
      }
    }
  };
  
  const handleDeleteSample = async (sampleId: number) => {
    if (confirm('이 대표해설을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      try {
        await deleteSampleMutation.mutateAsync({ 
          scriptwriterId, 
          sampleId 
        });
        refetch();
      } catch (error) {
        console.error('Delete sample error:', error);
        alert('대표해설 삭제 중 오류가 발생했습니다.');
      }
    }
  };

  const handleDeleteWorkLog = async (workLogId: number) => {
    if (confirm('이 작업 로그를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      try {
        await deleteWorkLogMutation.mutateAsync({ 
          scriptwriterId, 
          workLogId 
        });
        refetch();
      } catch (error) {
        console.error('Delete work log error:', error);
        alert('작업 로그 삭제 중 오류가 발생했습니다.');
      }
    }
  };

  useEffect(() => {
    if (scriptwriter) {
      console.log("해설작가 데이터:", scriptwriter);
      const samples = safeArray(scriptwriter.samples);
      const workLogs = safeArray(scriptwriter.workLogs);
      if (samples.length > 0) {
        console.log("대표해설 데이터:", samples);
      }
      if (workLogs.length > 0) {
        console.log("작업로그 데이터:", workLogs);
      }
    }
  }, [scriptwriter]);
  
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
          </div>
        </div>
      </div>
    );
  }
  
  if (isError) {
    return (
      <div className="max-w-[1200px] mx-auto py-6 space-y-6">
        <div className="flex justify-end space-x-2">
          <Button variant="ghost" size="sm" onClick={() => router.push('/scriptwriters')}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            목록으로
          </Button>
        </div>
        
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>해설작가 정보를 불러오는데 실패했습니다</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'}
          </AlertDescription>
        </Alert>
        
        <Button onClick={() => refetch()}>다시 시도</Button>
      </div>
    );
  }
  
  if (!scriptwriter) {
    return (
      <div className="max-w-[1200px] mx-auto py-6 space-y-6">
        <div className="flex justify-end space-x-2">
          <Button variant="ghost" size="sm" onClick={() => router.push('/scriptwriters')}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            목록으로
          </Button>
        </div>
        
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>해설작가가 존재하지 않습니다</AlertTitle>
          <AlertDescription>
            요청한 ID {scriptwriterId}에 해당하는 해설작가를 찾을 수 없습니다.
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  const languages = safeArray(scriptwriter.languages);
  const specialties = safeArray(scriptwriter.specialties);
  const samples = safeArray(scriptwriter.samples);
  const workLogs = safeArray(scriptwriter.workLogs);
  
  return (
    <div className="max-w-[1200px] mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight text-[#333333]">{scriptwriter.name}</h1>
        
        <div className="flex space-x-2">
          <Button
            variant="ghost"
            className="hover:bg-[#f5fbf5] hover:text-[#4da34c]"
            onClick={() => router.push('/scriptwriters')}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            목록으로
          </Button>
          
          <Button
            variant="outline"
            className="hover:bg-[#f5fbf5] hover:text-[#4da34c] hover:border-[#4da34c] transition-colors"
            onClick={() => router.push(`/scriptwriters/${scriptwriterId}/edit`)}
          >
            <Pencil className="h-4 w-4 mr-1" />
            편집
          </Button>
          
          <Button
            variant="outline"
            className="hover:bg-[#fff5f3] hover:text-[#ff6246] hover:border-[#ff6246] transition-colors"
            onClick={handleDeleteScriptwriter}
            disabled={deleteScriptwriterMutation.isPending}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            삭제
          </Button>
        </div>
      </div>
      
      <div className="flex flex-wrap gap-2 items-center">
        {(scriptwriter.skillLevel !== undefined && scriptwriter.skillLevel !== null) && (
          <Badge className={`${getSkillLevelBadgeColor(scriptwriter.skillLevel)} border`}>
            Lv.{scriptwriter.skillLevel}
          </Badge>
        )}
        
        {scriptwriter.gender && (
          <Badge variant="outline">
            {GENDER_DISPLAY[scriptwriter.gender] || scriptwriter.gender}
          </Badge>
        )}
        
        {scriptwriter.location && (
          <Badge variant="outline" className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {scriptwriter.location}
          </Badge>
        )}
        
        {languages.map((lang) => (
          <Badge key={lang.languageCode} variant="outline" className="bg-blue-50 text-blue-700">
            {LANGUAGE_DISPLAY[lang.languageCode] || lang.languageCode} (Lv.{lang.proficiencyLevel})
          </Badge>
        ))}

        {specialties.map((spec) => (
          <Badge key={spec.specialtyType} className={`${SPECIALTY_COLORS[spec.specialtyType]} border`}>
            {SPECIALTY_FULL_DISPLAY[spec.specialtyType] || spec.specialtyType} (Lv.{spec.skillGrade})
          </Badge>
        ))}
      </div>
      
      {/* 레이아웃 수정: 왼쪽 2칸, 오른쪽 1칸 */}
      <div className="grid grid-cols-3 gap-6 items-start">
        {/* 왼쪽 열 - 기본 정보와 참여 작품 */}
        <div className="col-span-2 space-y-6">
          {/* 기본 정보 카드 */}
          <Card className="border border-gray-300 shadow-sm hover:shadow-md transition-all duration-300 rounded-xl overflow-hidden">
            <CardHeader className="p-4 pb-2 bg-white">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg font-medium text-[#333333] flex items-center">
                  <Info className="h-5 w-5 mr-2 text-[#ff6246]" />
                  기본 정보
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsBasicInfoExpanded(!isBasicInfoExpanded)}
                  className="h-7 w-7 p-0"
                >
                  {isBasicInfoExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </div>
              <CardDescription>해설작가 기본 정보</CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-6">
              <div className="flex items-center space-x-4">
                {scriptwriter.profileImage ? (
                  <img 
                    src={scriptwriter.profileImage} 
                    alt={scriptwriter.name} 
                    className="h-24 w-24 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-24 w-24 rounded-full bg-gray-100 text-gray-800 flex items-center justify-center text-2xl font-medium">
                    {scriptwriter.name.slice(0, 2)}
                  </div>
                )}
                
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold">{scriptwriter.name}</h2>
                  <div className="flex flex-wrap gap-2 text-sm text-gray-500">
                    {scriptwriter.phone && (
                      <div className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        <span>{scriptwriter.phone}</span>
                        <button
                          onClick={() => copyToClipboard(scriptwriter.phone!, "전화번호")}
                          className="p-1 hover:bg-gray-100 rounded transition-colors"
                          title="전화번호 복사"
                        >
                          <Copy className="h-3 w-3 text-gray-500 hover:text-[#ff6246]" />
                        </button>
                      </div>
                    )}
                    
                    {scriptwriter.email && (
                      <div className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        <span>{scriptwriter.email}</span>
                        <button
                          onClick={() => copyToClipboard(scriptwriter.email!, "이메일")}
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
              
              {isBasicInfoExpanded && (
                <>
                  <Separator />
                  
                  {(scriptwriter.memo && scriptwriter.memo.trim() !== '') ? (
                    <>
                      <div className="space-y-3">
                        <p className="text-sm font-medium text-muted-foreground">메모</p>
                        <div className="p-4 bg-gray-50 rounded-md">
                          <p className="whitespace-pre-wrap">{scriptwriter.memo}</p>
                        </div>
                      </div>
                      <Separator />
                    </>
                  ) : null}
                  
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-muted-foreground">해설 분야</p>
                    
                    {specialties.length > 0 ? (
                      <div className="space-y-4">
                        {specialties.map((spec, index: number) => (
                          <div key={index} className="p-4 bg-gray-50 rounded-md">
                            <div className="flex justify-between items-center mb-2">
                              <Badge className={`${SPECIALTY_COLORS[spec.specialtyType]?.bg} ${SPECIALTY_COLORS[spec.specialtyType]?.text}`}>
                                {SPECIALTY_FULL_DISPLAY[spec.specialtyType] || spec.specialtyType}
                              </Badge>
                            </div>
                            <GradeDisplay skillGrade={spec.skillGrade} />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 bg-gray-50 rounded-md text-center text-gray-500">
                        등록된 해설분야가 없습니다.
                      </div>
                    )}
                  </div>
                  
                  <Separator />

                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <p className="text-sm font-medium text-muted-foreground flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        작업 로그
                      </p>
                    </div>
                    
                    <div className="space-y-4">
                      <WorkLogForm 
                        scriptwriterId={scriptwriterId} 
                        onSuccess={() => refetch()} 
                      />
                      
                      {workLogs.length > 0 ? (
                        <div className="space-y-3">
                          {workLogs
                            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                            .slice(0, 5)
                            .map((workLog: ScriptwriterWorkLog) => (
                              <WorkLogCard
                                key={workLog.id}
                                workLog={workLog}
                                onDelete={handleDeleteWorkLog}
                              />
                            ))}
                          
                          {workLogs.length > 5 && (
                            <div className="text-center py-2">
                              <p className="text-sm text-gray-500">
                                총 {workLogs.length}개의 작업 로그 중 최근 5개 표시
                              </p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-8 bg-gray-50 rounded-lg">
                          <FileText className="h-8 w-8 mx-auto text-gray-300 mb-2" />
                          <p className="text-gray-500 text-sm">작업 로그가 없습니다.</p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">생성일</p>
                      <p className="font-medium">
                        {formatDate(scriptwriter.createdAt)}
                      </p>
                    </div>
                    
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">마지막 업데이트</p>
                      <p className="font-medium">
                        {formatDate(scriptwriter.updatedAt)}
                      </p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
          
          {/* 참여 작품 목록 카드 */}
          <ParticipatedWorksCard scriptwriterId={scriptwriterId} />
        </div>
        
        {/* 오른쪽 열 - 대표해설 */}
        <div className="space-y-6">
          <Card className="border border-gray-300 shadow-sm hover:shadow-md transition-all duration-300 rounded-xl overflow-hidden">
            <CardHeader className="p-4 pb-2 bg-white flex flex-row justify-between items-center">
              <div>
                <CardTitle className="text-lg font-medium text-[#333333] flex items-center">
                  <PenTool className="h-5 w-5 mr-2 text-[#ff6246]" />
                  대표 해설
                </CardTitle>
                <CardDescription>등록된 대표해설 목록</CardDescription>
              </div>
              
              <Button 
                size="sm"
                className="bg-[#4da34c] hover:bg-[#3d8c3c]"
                onClick={() => router.push(`/scriptwriters/${scriptwriterId}/samples/add`)}
              >
                <Plus className="h-4 w-4 mr-1" />
                해설 추가
              </Button>
            </CardHeader>
            <CardContent className="p-4">
              {samples.length > 0 ? (
                <div className="space-y-4">
                  {samples.map((sample: ScriptwriterSample) => (
                    <SampleCard
                      key={sample.id}
                      sample={sample}
                      onDelete={handleDeleteSample}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <PenTool className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                  <p className="text-gray-500">등록된 대표해설이 없습니다.</p>
                  <Button 
                    className="mt-4 bg-[#4da34c] hover:bg-[#3d8c3c]"
                    onClick={() => router.push(`/scriptwriters/${scriptwriterId}/samples/add`)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    해설 추가하기
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

export default function ProtectedScriptwriterDetailPage({ params }: { params: { id: string } }) {
  return (
    <ProtectedRoute>
      <ScriptwriterDetailPage params={params} />
    </ProtectedRoute>
  );
}
