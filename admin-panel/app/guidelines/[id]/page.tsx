// app/guidelines/[id]/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { 
  ArrowLeft, 
  Edit, 
  Trash2, 
  AlertCircle, 
  FileText, 
  Copy, 
  Check, 
  Calendar,
  BookOpen,
  Info
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { format, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';

// 인터페이스 정의 - camelCase 사용
interface GuidelineContent {
  id: number;
  category: string;
  content: string;
  sequenceNumber: number;
  createdAt?: string;
  guidelineId: number;
}

interface GuidelineFeedback {
  id: number;
  feedbackType: string;
  content: string;
  sequenceNumber: number;
  createdAt?: string;
  guidelineId: number;
}

interface GuidelineMemo {
  id: number;
  content: string;
  createdAt?: string;
  guidelineId: number;
}

interface Guideline {
  id: number;
  name: string;
  type: string;
  field: string;
  fieldOther?: string;
  version: string;
  attachment?: string;
  createdAt: string;
  updatedAt: string;
  contents: GuidelineContent[];
  feedbacks: GuidelineFeedback[];
  memos: GuidelineMemo[];
}

export default function GuidelineDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [guideline, setGuideline] = useState<Guideline | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchGuideline();
  }, [params.id]);

  const fetchGuideline = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/admin/api/access-guidelines/${params.id}`);
      if (!response.ok) {
        if (response.status === 404) {
          setErrorMessage("가이드라인을 찾을 수 없습니다");
          toast.error("가이드라인을 찾을 수 없습니다");
          return;
        }
        throw new Error("Failed to fetch guideline");
      }

      const data = await response.json();
      console.log("API 응답 데이터:", JSON.stringify(data, null, 2));
      setGuideline(data);
    } catch (error) {
      console.error("Error fetching guideline:", error);
      const errorMsg = error instanceof Error ? error.message : '가이드라인 정보를 불러오는데 실패했습니다';
      setErrorMessage(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/admin/api/access-guidelines/${params.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("가이드라인 삭제에 실패했습니다");
      }

      toast.success("가이드라인이 성공적으로 삭제되었습니다");
      router.push("/guidelines");
    } catch (error) {
      console.error("Error deleting guideline:", error);
      const errorMsg = error instanceof Error ? error.message : '가이드라인 삭제 중 오류가 발생했습니다';
      setErrorMessage(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsDeleting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        setCopySuccess(true);
        toast.success("링크가 클립보드에 복사되었습니다");
        setTimeout(() => setCopySuccess(false), 2000);
      })
      .catch(err => {
        console.error('클립보드 복사 실패:', err);
        toast.error("링크 복사에 실패했습니다");
      });
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "AD": return "음성해설";
      case "CC": return "자막해설";
      case "SL": return "수어해설";
      default: return type;
    }
  };

  const getFieldLabel = (field: string, fieldOther?: string) => {
    if (field === "other" && fieldOther) return fieldOther;

    switch (field) {
      case "movie": return "영화영상";
      case "exhibition": return "전시회";
      case "theater": return "연극";
      case "musical": return "뮤지컬";
      case "concert": return "콘서트";
      default: return field;
    }
  };

  const getFeedbackTypeLabel = (type: string) => {
    switch (type) {
      case "non_disabled": return "비장애인";
      case "visually_impaired": return "시각장애인";
      case "hearing_impaired": return "청각장애인";
      default: return type || "미지정";
    }
  };

  // 날짜 포맷 함수
  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    try {
      return format(parseISO(dateString), 'PPP p', { locale: ko });
    } catch (e) {
      console.error("날짜 포맷 오류:", e);
      return "날짜 정보 없음";
    }
  };

  const getFileName = (url: string) => {
    if (!url) return "파일";
    const parts = url.split('/');
    return parts[parts.length - 1] || "파일";
  };

  // S3 전체 URL 생성 함수
  const getFullS3Url = (filePath: string) => {
    if (!filePath) return "";
    
    // 이미 전체 URL을 포함하고 있는 경우
    if (filePath.startsWith('http')) {
      return filePath;
    }
    
    // 상대 경로만 있는 경우
    return `https://tomato-app-storage.s3.ap-northeast-2.amazonaws.com/${filePath}`;
  };

  if (isLoading) {
    return (
      <div className="max-w-[1200px] mx-auto py-6 space-y-6">
        <div className="w-full py-24 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!guideline && errorMessage) {
    return (
      <div className="max-w-[1200px] mx-auto py-6 space-y-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
        <Button onClick={() => router.push("/guidelines")} className="mt-4">
          목록으로 돌아가기
        </Button>
      </div>
    );
  }

  if (!guideline) {
    return (
      <div className="max-w-[1200px] mx-auto py-6 space-y-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            가이드라인을 찾을 수 없습니다.
          </AlertDescription>
        </Alert>
        <Button onClick={() => router.push("/guidelines")} className="mt-4">
          목록으로 돌아가기
        </Button>
      </div>
    );
  }

  // 첨부파일 전체 URL
  const attachmentFullUrl = guideline.attachment ? getFullS3Url(guideline.attachment) : "";

  return (
    <ProtectedRoute>
      <div className="max-w-[1200px] mx-auto py-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#333333]">{guideline.name}</h1>
            <div className="flex flex-wrap gap-2 items-center mt-1">
              <Badge className="bg-blue-100 text-blue-800 border">
                {getTypeLabel(guideline.type)}
              </Badge>
              <Badge variant="outline">
                {getFieldLabel(guideline.field, guideline.fieldOther)}
              </Badge>
              <Badge variant="outline">
                버전 {guideline.version}
              </Badge>
            </div>
          </div>
          
          <div className="flex space-x-2">
            <Button
              variant="ghost"
              className="hover:bg-[#f5fbf5] hover:text-[#4da34c]"
              onClick={() => router.push('/guidelines')}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              목록으로
            </Button>
            
            <Button 
              variant="outline"
              className="hover:bg-[#f5fbf5] hover:text-[#4da34c] hover:border-[#4da34c] transition-colors"
              onClick={() => router.push(`/guidelines/${params.id}/edit`)}
            >
              <Edit className="h-4 w-4 mr-1" />
              편집
            </Button>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="outline"
                  className="hover:bg-[#fff5f3] hover:text-[#ff6246] hover:border-[#ff6246] transition-colors"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  삭제
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>가이드라인 삭제</AlertDialogTitle>
                  <AlertDialogDescription>
                    정말로 이 가이드라인을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>취소</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
                    {isDeleting ? "삭제 중..." : "삭제"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* 그리드 레이아웃 구성 */}
        <div className="grid grid-cols-3 gap-6">
          {/* 기본 정보 카드 - 2칸 너비 */}
          <Card className="border border-gray-300 shadow-sm hover:shadow-md transition-all duration-300 rounded-xl overflow-hidden col-span-2">
            <CardHeader className="p-4 pb-2 bg-white">
              <CardTitle className="text-lg font-medium text-[#333333] flex items-center">
                <Info className="h-5 w-5 mr-2 text-[#ff6246]" />
                기본 정보
              </CardTitle>
              <CardDescription>
                가이드라인 기본 정보
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">유형</p>
                  <p className="font-medium">{getTypeLabel(guideline.type)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">버전</p>
                  <p className="font-medium">{guideline.version}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">분야</p>
                  <p className="font-medium">{getFieldLabel(guideline.field, guideline.fieldOther)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">생성일</p>
                  <p className="font-medium">{formatDate(guideline.createdAt)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">수정일</p>
                  <p className="font-medium">{formatDate(guideline.updatedAt)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">첨부파일</p>
                  {guideline.attachment ? (
                    <div className="flex items-center gap-2">
                      <a 
                        href={attachmentFullUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center text-blue-600 hover:underline"
                      >
                        <FileText className="h-4 w-4 mr-1" />
                        {getFileName(guideline.attachment)}
                      </a>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-7 px-2"
                        onClick={() => attachmentFullUrl && copyToClipboard(attachmentFullUrl)}
                      >
                        {copySuccess ? (
                          <Check className="h-3.5 w-3.5 text-green-500" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                        <span className="ml-1 text-xs">{copySuccess ? "복사됨" : "링크 복사"}</span>
                      </Button>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">첨부파일 없음</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 오른쪽 열 - 요약 정보 */}
          <Card className="border border-gray-300 shadow-sm hover:shadow-md transition-all duration-300 rounded-xl overflow-hidden">
            <CardHeader className="p-4 pb-2 bg-white">
              <CardTitle className="text-lg font-medium text-[#333333] flex items-center">
                <BookOpen className="h-5 w-5 mr-2 text-[#ff6246]" />
                가이드라인 요약
              </CardTitle>
              <CardDescription>
                주요 내용 요약
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">변경 내역</h3>
                  <p className="text-sm">
                    {guideline.contents && guideline.contents.length > 0 
                      ? `총 ${guideline.contents.length}개의 변경 내역이 있습니다.`
                      : '등록된 변경 내역이 없습니다.'}
                  </p>
                </div>
                
                <Separator />
                
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">개선 사항</h3>
                  <p className="text-sm">
                    {guideline.feedbacks && guideline.feedbacks.length > 0 
                      ? `총 ${guideline.feedbacks.length}개의 개선 사항이 있습니다.`
                      : '등록된 개선 사항이 없습니다.'}
                  </p>
                </div>
                
                <Separator />
                
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">메모</h3>
                  <p className="text-sm">
                    {guideline.memos && guideline.memos.length > 0 
                      ? `총 ${guideline.memos.length}개의 메모가 있습니다.`
                      : '등록된 메모가 없습니다.'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 주요 변경 사항 */}
        <Card className="border border-gray-300 shadow-sm hover:shadow-md transition-all duration-300 rounded-xl overflow-hidden">
          <CardHeader className="p-4 pb-2 bg-white">
            <CardTitle className="text-lg font-medium text-[#333333] flex items-center">
              <Calendar className="h-5 w-5 mr-2 text-[#ff6246]" />
              주요 변경 사항
            </CardTitle>
            <CardDescription>
              가이드라인의 주요 변경 내역
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4">
            {guideline.contents && guideline.contents.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-muted border-b">
                      <th className="px-4 py-2 text-left w-40">작성일시</th>
                      <th className="px-4 py-2 text-left w-32">구분</th>
                      <th className="px-4 py-2 text-left">내용</th>
                    </tr>
                  </thead>
                  <tbody>
                    {guideline.contents.map((content) => (
                      <tr key={content.id} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm">
                          {formatDate(content.createdAt || guideline.createdAt)}
                        </td>
                        <td className="px-4 py-2">
                          <Badge variant="outline" className="font-medium">
                            {content.category || "-"}
                          </Badge>
                        </td>
                        <td className="px-4 py-2 whitespace-pre-wrap">{content.content}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex items-center justify-center py-8 text-muted-foreground bg-gray-50 rounded-lg">
                <AlertCircle className="h-4 w-4 mr-2" />
                등록된 변경 사항이 없습니다.
              </div>
            )}
          </CardContent>
        </Card>

        {/* 향후 개선 사항 */}
        <Card className="border border-gray-300 shadow-sm hover:shadow-md transition-all duration-300 rounded-xl overflow-hidden">
          <CardHeader className="p-4 pb-2 bg-white">
            <CardTitle className="text-lg font-medium text-[#333333] flex items-center">
              <AlertCircle className="h-5 w-5 mr-2 text-[#ff6246]" />
              향후 개선 사항
            </CardTitle>
            <CardDescription>
              가이드라인 개선을 위한 피드백
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4">
            {guideline.feedbacks && guideline.feedbacks.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-muted border-b">
                      <th className="px-4 py-2 text-left w-40">작성일시</th>
                      <th className="px-4 py-2 text-left w-32">대상자 유형</th>
                      <th className="px-4 py-2 text-left">내용</th>
                    </tr>
                  </thead>
                  <tbody>
                    {guideline.feedbacks.map((feedback) => (
                      <tr key={feedback.id} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm">
                          {formatDate(feedback.createdAt || guideline.createdAt)}
                        </td>
                        <td className="px-4 py-2">
                          <Badge className="bg-blue-100 text-blue-800 border">
                            {getFeedbackTypeLabel(feedback.feedbackType)}
                          </Badge>
                        </td>
                        <td className="px-4 py-2 whitespace-pre-wrap">{feedback.content}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex items-center justify-center py-8 text-muted-foreground bg-gray-50 rounded-lg">
                <AlertCircle className="h-4 w-4 mr-2" />
                등록된 개선 사항이 없습니다.
              </div>
            )}
          </CardContent>
        </Card>

{/* 메모 */}
        <Card className="border border-gray-300 shadow-sm hover:shadow-md transition-all duration-300 rounded-xl overflow-hidden">
          <CardHeader className="p-4 pb-2 bg-white">
            <CardTitle className="text-lg font-medium text-[#333333] flex items-center">
              <FileText className="h-5 w-5 mr-2 text-[#ff6246]" />
              메모
            </CardTitle>
            <CardDescription>
              기타 메모 사항
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4">
            {guideline.memos && guideline.memos.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-muted border-b">
                      <th className="px-4 py-2 text-left w-40">작성일시</th>
                      <th className="px-4 py-2 text-left">내용</th>
                    </tr>
                  </thead>
                  <tbody>
                    {guideline.memos.map((memo) => (
                      <tr key={memo.id} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm">
                          {formatDate(memo.createdAt || guideline.createdAt)}
                        </td>
                        <td className="px-4 py-2 whitespace-pre-wrap">{memo.content}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex items-center justify-center py-8 text-muted-foreground bg-gray-50 rounded-lg">
                <AlertCircle className="h-4 w-4 mr-2" />
                등록된 메모가 없습니다.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  );
}
