// app/staffs/[id]/page.tsx
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
  Briefcase,
  Image as ImageIcon,
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
  FileText,
  Clock,
  Share2,
  Film,
  RefreshCw,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { 
  useStaff, 
  useDeleteStaff, 
  useDeleteStaffPortfolio,
  useCreateStaffWorkLog,
  useDeleteStaffWorkLog,
  useStaffAccessAssets
} from '@/hooks/useStaffs';
import { Skeleton } from '@/components/ui/skeleton';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Progress } from '@/components/ui/progress';
import { 
  Staff, 
  StaffPortfolio, 
  StaffWorkLog,
  StaffWorkLogFormData,
  StaffAccessAsset
} from '@/types/staffs';
import { 
  GENDER_DISPLAY, 
  EXPERTISE_FIELD_DISPLAY
} from '@/lib/constants/personnel';
import {
  ROLE_DISPLAY,
  ROLE_COLORS
} from '@/lib/constants/staff';
import { getSkillLevelBadgeColor, safeArray } from '@/lib/utils/personnel';
import { toast } from 'sonner';

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

// 날짜 포맷 유틸리티 함수
function formatDate(dateString: string | undefined | null, formatStr: string = 'PPP p'): string {
  if (!dateString) return '-';
  
  try {
    const date = new Date(dateString);
    // 유효한 날짜인지 확인
    if (isNaN(date.getTime())) {
      console.error("Invalid date string:", dateString);
      return dateString; // 원본 문자열 반환
    }
    return format(date, formatStr, { locale: ko });
  } catch (error) {
    console.error("Date formatting error:", error, "Input:", dateString);
    return dateString; // 오류 시 원본 문자열 반환
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

// 대표작 카드 컴포넌트
interface PortfolioCardProps {
  portfolio: StaffPortfolio;
  onDelete: (portfolioId: number) => void;
}

function PortfolioCard({ portfolio, onDelete }: PortfolioCardProps) {
  const [isLoadingCreditUrl, setIsLoadingCreditUrl] = useState(false);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('클립보드에 복사되었습니다.');
    } catch (err) {
      toast.error('복사에 실패했습니다.');
    }
  };

  // 크레디트 이미지를 presigned URL로 열기
  const openCreditImage = async () => {
    if (!portfolio.creditImage || !portfolio.staffId || !portfolio.id) {
      return;
    }

    setIsLoadingCreditUrl(true);
    try {
      // Presigned URL 요청
      const response = await fetch(
        `/admin/api/staffs/${portfolio.staffId}/portfolios/${portfolio.id}/credit-image-url?expires_in=3600`,
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
      console.error('Error getting credit image URL:', error);
      toast.error('크레디트 이미지를 열 수 없습니다.');
    } finally {
      setIsLoadingCreditUrl(false);
    }
  };

  // 링크 열기
  const openReferenceUrl = () => {
    if (portfolio.referenceUrl) {
      window.open(portfolio.referenceUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <Card className="border border-gray-200 hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex justify-between items-center mb-4">
          <Badge className="bg-blue-100 text-blue-800">
            #{portfolio.sequenceNumber}
          </Badge>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 hover:bg-red-50 hover:text-red-500"
            onClick={() => onDelete(portfolio.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex gap-4">
          {/* 포스터 이미지 */}
          <div className="flex-shrink-0">
            {portfolio.posterImage ? (
              <img 
                src={portfolio.posterImage} 
                alt={portfolio.workTitle}
                className="w-20 h-28 object-cover rounded-lg border"
              />
            ) : (
              <div className="w-20 h-28 bg-gray-100 rounded-lg border flex items-center justify-center">
                <ImageIcon className="h-6 w-6 text-gray-400" />
              </div>
            )}
          </div>

          {/* 작품 정보 */}
          <div className="flex-1 space-y-2">
            <div>
              <h4 className="font-medium text-lg">{portfolio.workTitle}</h4>
              {portfolio.directorName && (
                <p className="text-sm text-gray-600">감독: {portfolio.directorName}</p>
              )}
              
              {/* 작업연도와 AD/CC 정보 */}
              <div className="flex items-center space-x-3 text-sm mt-1">
                {portfolio.workYear && (
                  <span className="flex items-center">
                    <Calendar className="h-3 w-3 mr-1" />
                    {portfolio.workYear}년
                  </span>
                )}
                
                <div className="flex space-x-1">
                  {portfolio.hasAd && (
                    <Badge className="bg-blue-100 text-blue-800">AD</Badge>
                  )}
                  {portfolio.hasCc && (
                    <Badge className="bg-green-100 text-green-800">CC</Badge>
                  )}
                  {portfolio.hasSl === true && (
                    <Badge className="bg-purple-100 text-purple-800">SL</Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 하단 콘텐츠 */}
        <div className="mt-4 space-y-3">
          <div className="flex items-center space-x-2">
            {portfolio.referenceUrl && (
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
            
            {portfolio.creditImage && (
              <Button
                variant="outline"
                size="sm"
                onClick={openCreditImage}
                disabled={isLoadingCreditUrl}
                className="h-7 px-2"
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                {isLoadingCreditUrl ? '로딩중...' : '크레디트 이미지'}
              </Button>
            )}
          </div>

          {/* 참여 내용 */}
          {portfolio.participationContent && (
            <div className="text-sm">
              <p className="text-gray-500 mb-1">참여 내용:</p>
              <p className="text-gray-700 whitespace-pre-wrap">{portfolio.participationContent}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// 작업 로그 카드 컴포넌트
interface WorkLogCardProps {
  workLog: StaffWorkLog;
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
  staffId: number;
  onSuccess: () => void;
}

function WorkLogForm({ staffId, onSuccess }: WorkLogFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const createWorkLogMutation = useCreateStaffWorkLog();

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
    watch
  } = useForm<StaffWorkLogFormData>({
    mode: 'onChange',
    defaultValues: {
      workTitle: '',
      workYearMonth: '',
      content: ''
    }
  });

  const formValues = watch();

  const onSubmit = async (data: StaffWorkLogFormData) => {
    try {
      console.log('Submitting work log data:', data);
      
      await createWorkLogMutation.mutateAsync({
        staffId,
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
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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

          {/* 디버깅용 현재 값 표시 (개발 중일 때만) */}
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
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-[#4da34c] hover:bg-[#3d8c3c]"
            >
              {isSubmitting ? "추가 중..." : "추가"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

interface StaffDetailPageProps {
  params: { id: string };
}

function StaffDetailPage({ params }: StaffDetailPageProps) {
  const router = useRouter();
  const staffId = parseInt(params.id, 10);
  const [isBasicInfoExpanded, setIsBasicInfoExpanded] = useState(false);
  
  // 스태프 데이터 조회
  const { 
    data: staff, 
    isLoading, 
    isError, 
    error,
    refetch
  } = useStaff(staffId);
  
  // 스태프가 참여한 접근성 미디어 자산 조회
  const { 
    data: accessAssets, 
    isLoading: isLoadingAssets 
  } = useStaffAccessAssets(staffId);
  
  // 스태프 삭제 뮤테이션
  const deleteStaffMutation = useDeleteStaff();
  
  // 대표작 삭제 뮤테이션
  const deletePortfolioMutation = useDeleteStaffPortfolio();
  
  // 작업로그 삭제 뮤테이션
  const deleteWorkLogMutation = useDeleteStaffWorkLog();
  
  // 스태프 삭제 핸들러
  const handleDeleteStaff = async () => {
    if (confirm('이 스태프를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      try {
        await deleteStaffMutation.mutateAsync(staffId);
        router.push('/staffs');
      } catch (error) {
        console.error('Delete error:', error);
        alert('삭제 중 오류가 발생했습니다.');
      }
    }
  };
  
  // 대표작 삭제 핸들러
  const handleDeletePortfolio = async (portfolioId: number) => {
    if (confirm('이 대표작을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      try {
        await deletePortfolioMutation.mutateAsync({ 
          staffId, 
          portfolioId 
        });
        refetch();
      } catch (error) {
        console.error('Delete portfolio error:', error);
        alert('대표작 삭제 중 오류가 발생했습니다.');
      }
    }
  };

  // 작업로그 삭제 핸들러
  const handleDeleteWorkLog = async (workLogId: number) => {
    if (confirm('이 작업 로그를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      try {
        await deleteWorkLogMutation.mutateAsync({ 
          staffId, 
          workLogId 
        });
        refetch();
      } catch (error) {
        console.error('Delete work log error:', error);
        alert('작업 로그 삭제 중 오류가 발생했습니다.');
      }
    }
  };

  // API 응답 데이터 로깅 (디버깅용)
  useEffect(() => {
    if (staff) {
      console.log("스태프 데이터:", staff);
      const portfolios = safeArray(staff.portfolios);
      const workLogs = safeArray(staff.workLogs);
      if (portfolios.length > 0) {
        console.log("대표작 데이터:", portfolios);
      }
      if (workLogs.length > 0) {
        console.log("작업로그 데이터:", workLogs);
      }
    }
  }, [staff]);
  
  // 연도 추출 함수
  const getYear = (dateString: string | undefined) => {
    if (!dateString) return '-';
    try {
      return new Date(dateString).getFullYear().toString();
    } catch {
      return '-';
    }
  };
  
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
          <Button variant="ghost" size="sm" onClick={() => router.push('/staffs')}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            목록으로
          </Button>
        </div>
        
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>스태프 정보를 불러오는데 실패했습니다</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'}
          </AlertDescription>
        </Alert>
        
        <Button onClick={() => refetch()}>다시 시도</Button>
      </div>
    );
  }
  
  if (!staff) {
    return (
      <div className="max-w-[1200px] mx-auto py-6 space-y-6">
        <div className="flex justify-end space-x-2">
          <Button variant="ghost" size="sm" onClick={() => router.push('/staffs')}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            목록으로
          </Button>
        </div>
        
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>스태프가 존재하지 않습니다</AlertTitle>
          <AlertDescription>
            요청한 ID {staffId}에 해당하는 스태프를 찾을 수 없습니다.
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  const roles = safeArray(staff.roles);
  const expertise = safeArray(staff.expertise);
  const portfolios = safeArray(staff.portfolios);
  const workLogs = safeArray(staff.workLogs);
  
  return (
    <div className="max-w-[1200px] mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight text-[#333333]">{staff.name}</h1>
        
        <div className="flex space-x-2">
          <Button
            variant="ghost"
            className="hover:bg-[#f5fbf5] hover:text-[#4da34c]"
            onClick={() => router.push('/staffs')}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            목록으로
          </Button>
          
          <Button
            variant="outline"
            className="hover:bg-[#f5fbf5] hover:text-[#4da34c] hover:border-[#4da34c] transition-colors"
            onClick={() => router.push(`/staffs/${staffId}/edit`)}
          >
            <Pencil className="h-4 w-4 mr-1" />
            편집
          </Button>
          
          <Button
            variant="outline"
            className="hover:bg-[#fff5f3] hover:text-[#ff6246] hover:border-[#ff6246] transition-colors"
            onClick={handleDeleteStaff}
            disabled={deleteStaffMutation.isPending}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            삭제
          </Button>
        </div>
      </div>
      
      <div className="flex flex-wrap gap-2 items-center">
        {/* 스킬 레벨 Badge */}
        {(staff.skillLevel !== undefined && staff.skillLevel !== null) && (
          <Badge className={`${getSkillLevelBadgeColor(staff.skillLevel)} border`}>
            Lv.{staff.skillLevel}
          </Badge>
        )}
        
        {staff.gender && (
          <Badge variant="outline">
            {GENDER_DISPLAY[staff.gender] || staff.gender}
          </Badge>
        )}
        
        {staff.location && (
          <Badge variant="outline" className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {staff.location}
          </Badge>
        )}
        
        {/* 역할 Badge */}
        {roles.map((role: any, index: number) => (
          <Badge key={index} className={`${ROLE_COLORS[role.roleType] || 'bg-gray-100 text-gray-800'} border`}>
            {role.roleType === 'other' && role.roleOther 
              ? role.roleOther 
              : ROLE_DISPLAY[role.roleType] || role.roleType}
          </Badge>
        ))}
      </div>
      
      {/* 대시보드 스타일의 그리드 레이아웃 */}
      <div className="grid grid-cols-3 gap-6">
        {/* 왼쪽 열 - 기본 정보와 참여 작품 목록 */}
        <div className="col-span-2 space-y-6">
          {/* 기본 정보 섹션 - 펼침/접힘 기능 추가 */}
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
                  <CardDescription>스태프 기본 정보</CardDescription>
                </div>
                {isBasicInfoExpanded ? (
                  <ChevronUp className="h-5 w-5 text-gray-500" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-500" />
                )}
              </div>
            </CardHeader>
            <CardContent className="p-4">
              {/* 항상 표시되는 기본 정보 */}
              <div className="flex items-center space-x-4">
                {staff.profileImage ? (
                  <img 
                    src={staff.profileImage} 
                    alt={staff.name} 
                    className="h-24 w-24 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-24 w-24 rounded-full bg-gray-100 text-gray-800 flex items-center justify-center text-2xl font-medium">
                    {staff.name.slice(0, 2)}
                  </div>
                )}
                
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold">{staff.name}</h2>
                  <div className="flex flex-wrap gap-2 text-sm text-gray-500">
                    {staff.phone && (
                      <div className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        <span>{staff.phone}</span>
                        <button
                          onClick={() => copyToClipboard(staff.phone!, "전화번호")}
                          className="p-1 hover:bg-gray-100 rounded transition-colors"
                          title="전화번호 복사"
                        >
                          <Copy className="h-3 w-3 text-gray-500 hover:text-[#ff6246]" />
                        </button>
                      </div>
                    )}
                    
                    {staff.email && (
                      <div className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        <span>{staff.email}</span>
                        <button
                          onClick={() => copyToClipboard(staff.email!, "이메일")}
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
                <div className="space-y-6 mt-6">
                  <Separator />
                  
                  {/* 메모 영역 */}
                  {(staff.memo && staff.memo.trim() !== '') ? (
                    <>
                      <div className="space-y-3">
                        <p className="text-sm font-medium text-muted-foreground">메모</p>
                        <div className="p-4 bg-gray-50 rounded-md">
                          <p className="whitespace-pre-wrap">{staff.memo}</p>
                        </div>
                      </div>
                      <Separator />
                    </>
                  ) : null}
                  
                  {/* 전문영역 */}
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-muted-foreground">전문 영역</p>
                    
                    {expertise.length > 0 ? (
                      <div className="space-y-4">
                        {expertise.map((exp: any, index: number) => (
                          <div key={index} className="p-4 bg-gray-50 rounded-md">
                            <div className="flex justify-between items-center mb-2">
                              <Badge className="bg-purple-100 text-purple-800">
                                {exp.expertiseField === 'other' && exp.expertiseFieldOther
                                  ? exp.expertiseFieldOther
                                  : EXPERTISE_FIELD_DISPLAY[exp.expertiseField] || exp.expertiseField}
                              </Badge>
                            </div>
                            <GradeDisplay skillGrade={exp.skillGrade} />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 bg-gray-50 rounded-md text-center text-gray-500">
                        등록된 전문영역이 없습니다.
                      </div>
                    )}
                  </div>
                  
                  <Separator />

                  {/* 작업 로그 */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <p className="text-sm font-medium text-muted-foreground flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        작업 로그
                      </p>
                    </div>
                    
                    <div className="space-y-4">
                      <WorkLogForm 
                        staffId={staffId} 
                        onSuccess={() => refetch()} 
                      />
                      
                      {workLogs.length > 0 ? (
                        <div className="space-y-3">
                          {workLogs
                            .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                            .slice(0, 5)
                            .map((workLog: StaffWorkLog) => (
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
                        {formatDate(staff.createdAt)}
                      </p>
                    </div>
                    
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">마지막 업데이트</p>
                      <p className="font-medium">
                        {formatDate(staff.updatedAt)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* 참여 작품 목록 카드 추가 */}
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
                  {accessAssets.map((asset: StaffAccessAsset, index: number) => {
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
        
        {/* 오른쪽 열 - 대표작만 */}
        <div className="space-y-6">
          {/* 대표작 */}
          <Card className="border border-gray-300 shadow-sm hover:shadow-md transition-all duration-300 rounded-xl overflow-hidden">
            <CardHeader className="p-4 pb-2 bg-white flex flex-row justify-between items-center">
              <div>
                <CardTitle className="text-lg font-medium text-[#333333] flex items-center">
                  <Briefcase className="h-5 w-5 mr-2 text-[#ff6246]" />
                  대표작
                </CardTitle>
                <CardDescription>등록된 대표작 목록</CardDescription>
              </div>
              
              <Button 
                size="sm"
                className="bg-[#4da34c] hover:bg-[#3d8c3c]"
                onClick={() => router.push(`/staffs/${staffId}/portfolios/add`)}
              >
                <Plus className="h-4 w-4 mr-1" />
                대표작 추가
              </Button>
            </CardHeader>
            <CardContent className="p-4">
              {portfolios.length > 0 ? (
                <div className="space-y-4">
                  {portfolios.map((portfolio: StaffPortfolio) => (
                    <PortfolioCard
                      key={portfolio.id}
                      portfolio={portfolio}
                      onDelete={handleDeletePortfolio}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <Briefcase className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                  <p className="text-gray-500">등록된 대표작이 없습니다.</p>
                  <Button 
                    className="mt-4 bg-[#4da34c] hover:bg-[#3d8c3c]"
                    onClick={() => router.push(`/staffs/${staffId}/portfolios/add`)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    대표작 추가하기
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

export default function ProtectedStaffDetailPage({ params }: { params: { id: string } }) {
  return (
    <ProtectedRoute>
      <StaffDetailPage params={params} />
    </ProtectedRoute>
  );
}
