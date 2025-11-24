// app/movies/[id]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Movie } from "@/types/movie";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { format } from "date-fns";
import { Pencil, Trash, ArrowLeft, Eye, EyeOff, FileText, Film, Info, AlertCircle, Image, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

// 접근성 자산 타입 정의
interface AccessAsset {
  id: number;
  name: string;
  mediaType: string;
  language: string;
  productionYear: string | number | null;
  guidelineId: number | null;
  description: string | null;
  publishingStatus: string;
}

// 가이드라인 타입 정의
interface Guideline {
  id: number;
  name: string;
  version: string;
  type: string;
}

function MovieDetailPage() {
  const params = useParams();
  const router = useRouter();
  const movieId = Number(params.id);
  
  const [movie, setMovie] = useState<Movie | null>(null);
  const [accessAssets, setAccessAssets] = useState<AccessAsset[]>([]);
  const [guidelines, setGuidelines] = useState<Record<number, Guideline>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingAssets, setIsLoadingAssets] = useState(true);
  const [isLoadingGuidelines, setIsLoadingGuidelines] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assetError, setAssetError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // 영화 데이터 가져오기
  useEffect(() => {
    const fetchMovie = async () => {
      if (!movieId) return;
      
      try {
        setIsLoading(true);
        const response = await fetch(`/admin/api/movies/${movieId}`);
        if (!response.ok) {
          throw new Error("영화 정보를 불러오는데 실패했습니다");
        }
        const data = await response.json();
        setMovie(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "알 수 없는 오류");
        console.error("영화 정보 로드 오류:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMovie();
  }, [movieId]);

  // 영화와 연결된 접근성 자산 가져오기
  useEffect(() => {
    const fetchAccessAssets = async () => {
      if (!movieId) return;
      
      try {
        setIsLoadingAssets(true);
        const response = await fetch(`/admin/api/access-assets/by-movie/${movieId}`);
        if (!response.ok) {
          throw new Error("접근성 자산 정보를 불러오는데 실패했습니다");
        }
        const data: AccessAsset[] = await response.json();
        setAccessAssets(data);
        
        // 가이드라인 ID 목록 추출
        const guidelineIds = data
          .map((asset: AccessAsset) => asset.guidelineId)
          .filter((id): id is number => id !== null && id !== undefined);
        
        // 중복 제거
        const uniqueGuidelineIds = [...new Set(guidelineIds)];
        
        // 가이드라인이 있으면 가이드라인 정보 로딩 시작
        if (uniqueGuidelineIds.length > 0) {
          fetchGuidelines(uniqueGuidelineIds);
        }
      } catch (err) {
        setAssetError(err instanceof Error ? err.message : "알 수 없는 오류");
        console.error("접근성 자산 로드 오류:", err);
      } finally {
        setIsLoadingAssets(false);
      }
    };

    if (!isLoading && movie) {
      fetchAccessAssets();
    }
  }, [movieId, isLoading, movie]);
  
  // 가이드라인 정보 가져오기
  const fetchGuidelines = async (guidelineIds: number[]) => {
    try {
      setIsLoadingGuidelines(true);
      const guidelinesMap: Record<number, Guideline> = {};
      
      // 각 가이드라인 정보 가져오기
      for (const id of guidelineIds) {
        try {
          const response = await fetch(`/admin/api/access-guidelines/${id}`);
          if (response.ok) {
            const guideline: Guideline = await response.json();
            guidelinesMap[id] = guideline;
          }
        } catch (err) {
          console.error(`가이드라인 ID ${id} 로드 오류:`, err);
        }
      }
      
      setGuidelines(guidelinesMap);
    } catch (err) {
      console.error("가이드라인 로드 오류:", err);
    } finally {
      setIsLoadingGuidelines(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  const handleDelete = async () => {
    if (!confirm("정말로 이 영화를 삭제하시겠습니까?")) return;
    
    try {
      setIsDeleting(true);
      const response = await fetch(`/admin/api/movies/${movieId}`, {
        method: "DELETE",
      });
      
      if (!response.ok) {
        throw new Error("영화 삭제에 실패했습니다");
      }
      
      toast.success("영화가 삭제되었습니다");
      
      router.push("/movies");
    } catch (err) {
      toast.error("오류", { 
        description: err instanceof Error ? err.message : "알 수 없는 오류" 
      });
      console.error("영화 삭제 오류:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  // 미디어 유형별 색상 설정
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

  // 언어 표시
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

  // 게시 상태별 배지 색상 및 텍스트
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
  
  // 가이드라인 버전 표시
  const getGuidelineVersion = (guidelineId: number | null) => {
    if (!guidelineId) return "-";
    
    if (isLoadingGuidelines) return "로딩 중...";
    
    const guideline = guidelines[guidelineId];
    return guideline ? guideline.version : "-";
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 flex justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (error || !movie) {
    return (
      <div className="container mx-auto py-6">
        <div className="bg-destructive/10 p-4 rounded-md text-destructive">
          {error || "영화 정보를 찾을 수 없습니다"}
        </div>
        <Button variant="outline" className="mt-4" onClick={() => router.push("/movies")}>
          <ArrowLeft className="h-4 w-4 mr-2" /> 목록으로 돌아가기
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight text-[#333333]">{movie.title}</h1>
        
        <div className="flex space-x-2">
          <Button
            variant="ghost"
            className="hover:bg-[#f5fbf5] hover:text-[#4da34c]"
            onClick={() => router.push("/movies")}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            목록으로
          </Button>
          
          <Button
            variant="outline"
            className="hover:bg-[#f5fbf5] hover:text-[#4da34c] hover:border-[#4da34c] transition-colors"
            onClick={() => router.push(`/movies/${movieId}/edit`)}
          >
            <Pencil className="h-4 w-4 mr-1" />
            편집
          </Button>
          
          <Button
            variant="outline"
            className="hover:bg-[#fff5f3] hover:text-[#ff6246] hover:border-[#ff6246] transition-colors"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            <Trash className="h-4 w-4 mr-1" />
            삭제
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        {movie.filmGenre && (
          <Badge variant="outline">
            {movie.filmGenre}
          </Badge>
        )}
        
        {movie.filmRating && (
          <Badge variant="outline">
            {movie.filmRating}
          </Badge>
        )}
        
        {movie.country && (
          <Badge variant="outline">
            {movie.country}
          </Badge>
        )}
        
        {movie.isPublic ? (
          <Badge variant="outline" className="bg-green-100">공개</Badge>
        ) : (
          <Badge variant="outline">비공개</Badge>
        )}
        
        <Badge variant="outline" className={
          movie.publishingStatus === "published" ? "bg-green-100" : 
          movie.publishingStatus === "draft" ? "bg-gray-100" :
          movie.publishingStatus === "archived" ? "bg-gray-200" : ""
        }>
          {movie.publishingStatus === "published" ? "게시됨" :
           movie.publishingStatus === "draft" ? "초안" :
           movie.publishingStatus === "archived" ? "보관됨" : movie.publishingStatus}
        </Badge>
      </div>

      <div className="grid md:grid-cols-3 gap-6 align-start">
        <div className="md:col-span-2 space-y-6">
          {/* 기본 정보 카드 */}
          <Card className="border border-gray-300 shadow-sm hover:shadow-md transition-all duration-300 rounded-xl overflow-hidden">
            <CardHeader className="p-4 pb-2 bg-white">
              <CardTitle className="text-lg font-medium text-[#333333] flex items-center">
                <Info className="h-5 w-5 mr-2 text-[#ff6246]" />
                기본 정보
              </CardTitle>
              <CardDescription>영화의 상세 정보</CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">제목</p>
                  <p className="font-medium">{movie.title}</p>
                </div>
                
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">감독</p>
                  <p className="font-medium">{movie.director || "-"}</p>
                </div>
                
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">개봉일</p>
                  <p className="font-medium">
                    {movie.releaseDate 
                      ? format(new Date(movie.releaseDate), "yyyy-MM-dd") 
                      : "-"}
                  </p>
                </div>
                
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">장르</p>
                  <p className="font-medium">{movie.filmGenre || "-"}</p>
                </div>
                
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">등급</p>
                  <p className="font-medium">{movie.filmRating || "-"}</p>
                </div>
                
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">상영 시간</p>
                  <p className="font-medium">{movie.runningTime ? `${movie.runningTime}분` : "-"}</p>
                </div>
                
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">국가</p>
                  <p className="font-medium">{movie.country || "-"}</p>
                </div>
                
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">배급사</p>
                  {movie.distributor ? (
                    <Link 
                      href={`/distributors/${movie.distributor.id}`} 
                      className="font-medium text-[#333333] hover:text-[#ff6246] hover:underline flex items-center"
                    >
                      {movie.distributor.name}
                      <ExternalLink className="ml-1 h-3 w-3" />
                    </Link>
                  ) : (
                    <p className="font-medium">-</p>
                  )}
                </div>
              </div>

              {movie.logline && (
                <div className="space-y-3 mt-4">
                  <p className="text-sm font-medium text-muted-foreground">로그라인</p>
                  <div className="p-4 bg-gray-50 rounded-md">
                    <p className="whitespace-pre-wrap">{movie.logline}</p>
                  </div>
                </div>
              )}
              
              {movie.adminMemo && (
                <div className="space-y-3 mt-4">
                  <p className="text-sm font-medium text-muted-foreground">관리자 메모</p>
                  <div className="p-4 bg-gray-50 rounded-md">
                    <p className="whitespace-pre-wrap">{movie.adminMemo}</p>
                  </div>
                </div>
              )}
              
              <Separator className="my-4" />
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">생성일</p>
                  <p className="font-medium">
                    {format(new Date(movie.createdAt), "yyyy-MM-dd HH:mm")}
                  </p>
                </div>
                
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">마지막 업데이트</p>
                  <p className="font-medium">
                    {format(new Date(movie.updatedAt), "yyyy-MM-dd HH:mm")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* 접근성 자산 목록 카드 - 왼쪽 영역에만 표시 */}
          <Card className="border border-gray-300 shadow-sm hover:shadow-md transition-all duration-300 rounded-xl overflow-hidden">
            <CardHeader className="p-4 pb-2 bg-white">
              <CardTitle className="text-lg font-medium text-[#333333] flex items-center">
                <Film className="h-5 w-5 mr-2 text-[#ff6246]" />
                접근성 자산 목록
              </CardTitle>
              <CardDescription>이 영화와 연결된 접근성 미디어 자산</CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              {isLoadingAssets ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
                </div>
              ) : assetError ? (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>오류</AlertTitle>
                  <AlertDescription>{assetError}</AlertDescription>
                </Alert>
              ) : accessAssets.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  이 영화에 연결된 접근성 자산이 없습니다.
                </div>
              ) : (
                <div className="relative overflow-x-auto">
                  <table className="w-full text-sm text-left text-gray-700">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                      <tr>
                        {/* 순번 컬럼 너비 증가 */}
                        <th scope="col" className="px-4 py-3 w-16">순번</th>
                        <th scope="col" className="px-4 py-3">구분</th>
                        <th scope="col" className="px-4 py-3">언어</th>
                        <th scope="col" className="px-4 py-3">제작연도</th>
                        <th scope="col" className="px-4 py-3">가이드라인 버전</th>
                      </tr>
                    </thead>
                    <tbody>
                      {accessAssets.map((asset, index) => (
                        <tr key={asset.id} className="bg-white border-b hover:bg-gray-50">
                          <td className="px-4 py-3">{index + 1}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center">
                              <Badge className={`${getMediaTypeColor(asset.mediaType)} text-white mr-2`}>
                                {asset.mediaType}
                              </Badge>
                              <Link 
                                href={`/accessmedia/${asset.id}`}
                                className="font-medium text-[#333333] hover:text-[#ff6246] hover:underline"
                              >
                                {asset.name}
                              </Link>
                            </div>
                          </td>
                          <td className="px-4 py-3">{getLanguageDisplay(asset.language)}</td>
                          <td className="px-4 py-3">{asset.productionYear || "-"}</td>
                          <td className="px-4 py-3">
                            {getGuidelineVersion(asset.guidelineId)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              
              <div className="mt-4 flex justify-end">
                <Button 
                  variant="outline"
                  onClick={() => router.push(`/accessmedia/create?movieId=${movieId}`)}
                >
                  새 접근성 자산 추가
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 오른쪽 사이드바 */}
        <div className="space-y-6">
          <Card className="border border-gray-300 shadow-sm hover:shadow-md transition-all duration-300 rounded-xl overflow-hidden">
            <CardHeader className="p-4 pb-2 bg-white">
              <CardTitle className="text-lg font-medium text-[#333333] flex items-center">
                <Eye className="h-5 w-5 mr-2 text-[#ff6246]" />
                게시 설정
              </CardTitle>
              <CardDescription>영화의 게시 및 표시 설정</CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">표시 유형</p>
                <p className="font-medium">
                  {movie.visibilityType === "always" && "항상 표시"}
                  {movie.visibilityType === "period" && "기간 지정"}
                  {movie.visibilityType === "hidden" && "숨김"}
                </p>
              </div>
              
              {movie.visibilityType === "period" && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">시작일</p>
                    <p className="font-medium">
                      {movie.startAt 
                        ? format(new Date(movie.startAt), "yyyy-MM-dd HH:mm") 
                        : "-"}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">종료일</p>
                    <p className="font-medium">
                      {movie.endAt 
                        ? format(new Date(movie.endAt), "yyyy-MM-dd HH:mm") 
                        : "-"}
                    </p>
                  </div>
                </div>
              )}
              
              <Separator className="my-3" />
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">공개 여부</p>
                  <div className="flex items-center">
                    {movie.isPublic 
                      ? <><Eye className="h-4 w-4 mr-1 text-green-500" /> 공개</>
                      : <><EyeOff className="h-4 w-4 mr-1 text-gray-500" /> 비공개</>}
                  </div>
                </div>
                
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">게시 상태</p>
                  <div className="flex items-center">
                    {getPublishingStatusBadge(movie.publishingStatus)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* 미디어 파일 카드 */}
          <Card className="border border-gray-300 shadow-sm hover:shadow-md transition-all duration-300 rounded-xl overflow-hidden">
            <CardHeader className="p-4 pb-2 bg-white">
              <CardTitle className="text-lg font-medium text-[#333333] flex items-center">
                <FileText className="h-5 w-5 mr-2 text-[#ff6246]" />
                미디어 파일
              </CardTitle>
              <CardDescription>영화 관련 미디어 파일</CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-6">
              {/* 포스터 이미지 섹션 */}
              {movie.posterFileId && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground flex items-center">
                    <Image className="h-4 w-4 mr-1" /> 포스터 이미지
                  </h3>
                  <div className="flex items-start">
                    <div className="h-40 w-28 overflow-hidden rounded-md border">
                      <img 
                        src={`/api/files/${movie.posterFileId}`} 
                        alt="포스터" 
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="ml-4">
                      <div className="px-2 py-1 text-xs border rounded-full inline-block mb-2">
                        파일 ID: {movie.posterFileId}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* 시그니처 파일 섹션 */}
              {movie.signatureS3Filename && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground flex items-center">
                    <FileText className="h-4 w-4 mr-1" /> 시그니처 파일
                  </h3>
                  <div className="flex items-start">
                    <div className="p-2 border rounded-md flex items-center justify-center w-12 h-12">
                      <FileText className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div className="ml-4">
                      <p className="font-medium">
                        {movie.originalSignatureFilename || movie.signatureS3Filename}
                      </p>
                      {movie.signatureFileSize && (
                        <div className="px-2 py-1 text-xs border rounded-full mt-1 inline-block">
                          {formatFileSize(movie.signatureFileSize)}
                        </div>
                      )}
                      {movie.supportedOsType && (
                        <div className="mt-1">
                          <span className="text-xs text-gray-500">지원 OS: </span>
                          <span className="text-xs font-medium">
                            {movie.supportedOsType === 'ios' ? 'iOS' : 
                             movie.supportedOsType === 'android' ? 'Android' : 
                             movie.supportedOsType}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              {!movie.posterFileId && !movie.signatureS3Filename && (
                <div className="text-center text-muted-foreground py-4">
                  업로드된 미디어 파일이 없습니다.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ProtectedRoute로 페이지 컴포넌트 감싸서 내보내기
export default function ProtectedMovieDetailPage() {
  return (
    <ProtectedRoute>
      <MovieDetailPage />
    </ProtectedRoute>
  );
}
