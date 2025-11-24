"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { format } from "date-fns";
import { Pencil, Trash, ArrowLeft, Eye, EyeOff, ExternalLink, Info, AlertCircle, Film, Wallet, Users, ChevronDown, ChevronUp, Copy } from "lucide-react";
import { toast } from "sonner";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { useDistributor, useDeleteDistributor } from "@/hooks/data/useDistributor";

// 배급사 타입 정의
interface Distributor {
  id: number;
  name: string;
  isActive: boolean;
  businessRegistrationNumber?: string | null;
  address?: string | null;
  website?: string | null;
  ceoName?: string | null;
  notes?: string | null;
  taxInvoiceEmail?: string | null;
  bankName?: string | null;
  bankAccountNumber?: string | null;
  accountHolderName?: string | null;
  settlementCycle?: string | null;
  defaultRevenueShare?: number | null;
  paymentMethod?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  contacts?: DistributorContact[] | null;
}

// 배급사 담당자 타입 정의
interface DistributorContact {
  id: number;
  distributorId: number;
  name: string;
  position?: string | null;
  department?: string | null;
  email?: string | null;
  officePhone?: string | null;
  mobilePhone?: string | null;
  isPrimary: boolean;
  notes?: string | null;
}

// 영화 타입 정의
interface Movie {
  id: number;
  title: string;
  director?: string | null;
  filmRating?: string | null;
  releaseDate: string | null;
  isPublic: boolean;
  publishingStatus: string;
}

// 접근성 자산 타입 정의
interface AccessAsset {
  id: number;
  name: string;
  mediaType: string;
  language: string;
}

// 실제 DistributorResponse 타입 확장 (API 응답 구조에 맞게)
interface DistributorResponse {
  id: number;
  name: string;
  isActive: boolean;
  businessRegistrationNumber?: string | null;
  address?: string | null;
  website?: string | null;
  ceoName?: string | null;
  notes?: string | null;
  taxInvoiceEmail?: string | null;
  bankName?: string | null;
  bankAccountNumber?: string | null;
  accountHolderName?: string | null;
  settlementCycle?: string | null;
  defaultRevenueShare?: number | null;
  paymentMethod?: string | null;
  contacts?: DistributorContact[] | null;
  // 타임스탬프 필드 추가
  createdAt?: string | null;
  updatedAt?: string | null;
}

function DistributorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const distributorId = Number(params.id);
  
  const { data: distributor, isLoading, error } = useDistributor(distributorId);
  const deleteMutation = useDeleteDistributor();
  
  const [movies, setMovies] = useState<Movie[]>([]);
  const [isLoadingMovies, setIsLoadingMovies] = useState(true);
  const [moviesError, setMoviesError] = useState<string | null>(null);
  const [accessAssets, setAccessAssets] = useState<Record<number, AccessAsset[]>>({});
  const [isBasicInfoExpanded, setIsBasicInfoExpanded] = useState(false);
  
  // 접근성 자산 타입 매핑
  const mediaTypes = ["AD", "CC", "SL", "AI", "CI", "SI", "AR", "CR", "SR"];

  // 배급사와 연결된 영화 데이터 가져오기
  useEffect(() => {
    const fetchMovies = async () => {
      if (!distributorId) return;
      
      try {
        setIsLoadingMovies(true);
        
        // 새로 추가된 엔드포인트 사용
        const response = await fetch(`/admin/api/movies/by-distributor/${distributorId}`);
        if (!response.ok) {
          throw new Error(`영화 정보를 불러오는데 실패했습니다: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log("배급사 영화 목록 데이터:", data); // 데이터 구조 확인용
        setMovies(data);
        
        // 각 영화에 대한 접근성 자산 정보 가져오기
        const assetsMap: Record<number, AccessAsset[]> = {};
        for (const movie of data) {
          try {
            const assetsResponse = await fetch(`/admin/api/access-assets/by-movie/${movie.id}`);
            if (assetsResponse.ok) {
              const assetsData = await assetsResponse.json();
              assetsMap[movie.id] = assetsData;
            }
          } catch (err) {
            console.error(`Movie ${movie.id} assets error:`, err);
          }
        }
        setAccessAssets(assetsMap);
        
      } catch (err) {
        console.error("영화 정보 로드 오류:", err);
        setMoviesError(err instanceof Error ? err.message : "알 수 없는 오류");
      } finally {
        setIsLoadingMovies(false);
      }
    };

    if (!isLoading && distributor) {
      fetchMovies();
    }
  }, [distributorId, isLoading, distributor]);

  // 영화와 연결된 접근성 자산 목록 가져오기
  const getMovieAccessAssets = (movieId: number) => {
    return accessAssets[movieId] || [];
  };

  // 미디어 유형별 색상 설정
  const getMediaTypeColor = (mediaType: string): string => {
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

  const handleDelete = async () => {
    if (!confirm("정말로 이 배급사를 삭제하시겠습니까?")) return;
    
    try {
      await deleteMutation.mutateAsync(distributorId);
      toast.success("배급사가 삭제되었습니다");
      router.push("/distributors");
    } catch (err) {
      toast.error("오류", { 
        description: err instanceof Error ? err.message : "알 수 없는 오류" 
      });
      console.error("배급사 삭제 오류:", err);
    }
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

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 flex justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (error || !distributor) {
    const errorMessage = error instanceof Error ? error.message : (typeof error === 'string' ? error : "배급사 정보를 찾을 수 없습니다");
    
    return (
      <div className="container mx-auto py-6">
        <div className="bg-destructive/10 p-4 rounded-md text-destructive">
          {errorMessage}
        </div>
        <Button variant="outline" className="mt-4" onClick={() => router.push("/distributors")}>
          <ArrowLeft className="h-4 w-4 mr-2" /> 목록으로 돌아가기
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight text-[#333333]">{distributor.name}</h1>
        
        <div className="flex space-x-2">
          <Button
            variant="ghost"
            className="hover:bg-[#f5fbf5] hover:text-[#4da34c]"
            onClick={() => router.push("/distributors")}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            목록으로
          </Button>
          
          <Button
            variant="outline"
            className="hover:bg-[#f5fbf5] hover:text-[#4da34c] hover:border-[#4da34c] transition-colors"
            onClick={() => router.push(`/distributors/${distributorId}/edit`)}
          >
            <Pencil className="h-4 w-4 mr-1" />
            편집
          </Button>
          
          <Button
            variant="outline"
            className="hover:bg-[#fff5f3] hover:text-[#ff6246] hover:border-[#ff6246] transition-colors"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
          >
            <Trash className="h-4 w-4 mr-1" />
            삭제
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <Badge variant="outline" className={distributor.isActive ? "bg-green-100" : ""}>
          {distributor.isActive ? "활성" : "비활성"}
        </Badge>
      </div>

      <div className="grid md:grid-cols-3 gap-6 align-start">
        <div className="md:col-span-2 space-y-6">
          {/* 기본 정보 카드 - 펼침/접힘 기능 추가 */}
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
                  {!isBasicInfoExpanded && (
                    <CardDescription>배급사의 상세 정보</CardDescription>
                  )}
                </div>
                {isBasicInfoExpanded ? (
                  <ChevronUp className="h-5 w-5 text-gray-500" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-500" />
                )}
              </div>
            </CardHeader>
            {isBasicInfoExpanded && (
              <CardContent className="p-4 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">배급사명</p>
                    <p className="font-medium">{distributor.name}</p>
                  </div>
                  
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">상태</p>
                    <p className="font-medium">{distributor.isActive ? '활성' : '비활성'}</p>
                  </div>
                  
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">사업자 등록 번호</p>
                    <p className="font-medium">{distributor.businessRegistrationNumber || "-"}</p>
                  </div>
                  
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">대표자명</p>
                    <p className="font-medium">{distributor.ceoName || "-"}</p>
                  </div>
                  
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">세금계산서 이메일</p>
                    <p className="font-medium">{distributor.taxInvoiceEmail || "-"}</p>
                  </div>
                  
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">정산 주기</p>
                    <p className="font-medium">{distributor.settlementCycle || "-"}</p>
                  </div>
                </div>

                {distributor.notes && (
                  <div className="space-y-3 mt-4">
                    <p className="text-sm font-medium text-muted-foreground">메모</p>
                    <div className="p-4 bg-gray-50 rounded-md">
                      <p className="whitespace-pre-wrap">{distributor.notes}</p>
                    </div>
                  </div>
                )}
                
                {distributor.address && (
                  <div className="space-y-3 mt-4">
                    <p className="text-sm font-medium text-muted-foreground">주소</p>
                    <div className="p-4 bg-gray-50 rounded-md">
                      <p className="whitespace-pre-wrap">{distributor.address}</p>
                    </div>
                  </div>
                )}
                
                <Separator className="my-4" />
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">생성일</p>
                    <p className="font-medium">
                      {(distributor as any).createdAt ? 
                        format(new Date((distributor as any).createdAt), "yyyy-MM-dd HH:mm") : 
                        "-"}
                    </p>
                  </div>
                  
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">마지막 업데이트</p>
                    <p className="font-medium">
                      {(distributor as any).updatedAt ? 
                        format(new Date((distributor as any).updatedAt), "yyyy-MM-dd HH:mm") : 
                        "-"}
                    </p>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
          
          {/* 배급사 영화 목록 카드 */}
          <Card className="border border-gray-300 shadow-sm hover:shadow-md transition-all duration-300 rounded-xl overflow-hidden">
            <CardHeader className="p-4 pb-2 bg-white">
              <CardTitle className="text-lg font-medium text-[#333333] flex items-center">
                <Film className="h-5 w-5 mr-2 text-[#ff6246]" />
                관련 영화 목록
              </CardTitle>
              <CardDescription>이 배급사와 연결된 영화 작품</CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              {isLoadingMovies ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
                </div>
              ) : moviesError ? (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>오류</AlertTitle>
                  <AlertDescription>
                    {typeof moviesError === 'string' ? moviesError : "영화 정보를 불러오는데 실패했습니다"}
                  </AlertDescription>
                </Alert>
              ) : movies.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  이 배급사와 연결된 영화가 없습니다.
                </div>
              ) : (
                <div className="relative overflow-x-auto">
                  <table className="w-full text-sm text-left text-gray-700">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                      <tr>
                        <th scope="col" className="px-4 py-3 w-16">순번</th>
                        <th scope="col" className="px-4 py-3">제목</th>
                        <th scope="col" className="px-4 py-3">감독</th>
                        <th scope="col" className="px-4 py-3">관람등급</th>
                        <th scope="col" className="px-4 py-3">개봉일</th>
                        <th scope="col" className="px-4 py-3">접근성</th>
                        <th scope="col" className="px-4 py-3">게시상태</th>
                      </tr>
                    </thead>
                    <tbody>
                      {movies.map((movie, index) => {
                        const assets = getMovieAccessAssets(movie.id);
                        return (
                          <tr key={movie.id} className="bg-white border-b hover:bg-gray-50">
                            <td className="px-4 py-3">{index + 1}</td>
                            <td className="px-4 py-3">
                              <Link 
                                href={`/movies/${movie.id}`}
                                className="font-medium text-[#333333] hover:text-[#ff6246] hover:underline"
                              >
                                {movie.title}
                              </Link>
                            </td>
                            <td className="px-4 py-3">{movie.director || "-"}</td>
                            <td className="px-4 py-3">{movie.filmRating || "-"}</td>
                            <td className="px-4 py-3">
                              {movie.releaseDate ? format(new Date(movie.releaseDate), "yyyy-MM-dd") : "-"}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap gap-1">
                                {mediaTypes.map(type => {
                                  const hasAsset = assets.some(asset => asset.mediaType === type);
                                  return hasAsset ? (
                                    <Badge 
                                      key={type} 
                                      className={`${getMediaTypeColor(type)} text-white`}
                                    >
                                      {type}
                                    </Badge>
                                  ) : null;
                                })}
                                {assets.length === 0 && <span className="text-gray-500 text-xs">-</span>}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant="outline" className={
                                movie.publishingStatus === "published" ? "bg-green-100" : 
                                movie.publishingStatus === "draft" ? "bg-gray-100" :
                                movie.publishingStatus === "archived" ? "bg-gray-200" : ""
                              }>
                                {movie.publishingStatus === "published" ? "게시됨" :
                                movie.publishingStatus === "draft" ? "초안" :
                                movie.publishingStatus === "archived" ? "보관됨" : movie.publishingStatus}
                              </Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* 담당자 목록 카드 */}
          <Card className="border border-gray-300 shadow-sm hover:shadow-md transition-all duration-300 rounded-xl overflow-hidden">
            <CardHeader className="p-4 pb-2 bg-white">
              <CardTitle className="text-lg font-medium text-[#333333] flex items-center">
                <Users className="h-5 w-5 mr-2 text-[#ff6246]" />
                담당자 목록
              </CardTitle>
              <CardDescription>배급사 담당자 정보</CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              {distributor.contacts && distributor.contacts.length > 0 ? (
                <div className="relative overflow-x-auto">
                  <table className="w-full text-sm text-left text-gray-700">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                      <tr>
                        <th scope="col" className="px-4 py-3">이름</th>
                        <th scope="col" className="px-4 py-3">직책</th>
                        <th scope="col" className="px-4 py-3">부서</th>
                        <th scope="col" className="px-4 py-3">이메일</th>
                        <th scope="col" className="px-4 py-3">연락처</th>
                        <th scope="col" className="px-4 py-3">구분</th>
                      </tr>
                    </thead>
                    <tbody>
                      {distributor.contacts.map((contact) => (
                        <tr key={contact.id} className="bg-white border-b hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium">{contact.name}</td>
                          <td className="px-4 py-3">{contact.position || "-"}</td>
                          <td className="px-4 py-3">{contact.department || "-"}</td>
                          <td className="px-4 py-3">
                            {contact.email ? (
                              <div className="flex items-center gap-1">
                                <span>{contact.email}</span>
                                <button
                                  onClick={() => copyToClipboard(contact.email!, "이메일")}
                                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                                  title="이메일 복사"
                                >
                                  <Copy className="h-3 w-3 text-gray-500 hover:text-[#ff6246]" />
                                </button>
                              </div>
                            ) : "-"}
                          </td>
                          <td className="px-4 py-3">
                            {contact.mobilePhone || contact.officePhone ? (
                              <div className="flex items-center gap-1">
                                <span>{contact.mobilePhone || contact.officePhone}</span>
                                <button
                                  onClick={() => copyToClipboard((contact.mobilePhone || contact.officePhone)!, "전화번호")}
                                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                                  title="전화번호 복사"
                                >
                                  <Copy className="h-3 w-3 text-gray-500 hover:text-[#ff6246]" />
                                </button>
                              </div>
                            ) : "-"}
                          </td>
                          <td className="px-4 py-3">
                            {contact.isPrimary && (
                              <Badge variant="outline" className="bg-blue-100">주 담당자</Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  등록된 담당자가 없습니다.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 오른쪽 사이드바 */}
        <div className="space-y-6">
          <Card className="border border-gray-300 shadow-sm hover:shadow-md transition-all duration-300 rounded-xl overflow-hidden">
            <CardHeader className="p-4 pb-2 bg-white">
              <CardTitle className="text-lg font-medium text-[#333333] flex items-center">
                <Eye className="h-5 w-5 mr-2 text-[#ff6246]" />
                배급사 상태
              </CardTitle>
              <CardDescription>배급사의 활성화 상태</CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">활성화 상태</p>
                <div className="flex items-center">
                  {distributor.isActive 
                    ? <><Eye className="h-4 w-4 mr-1 text-green-500" /> 활성</>
                    : <><EyeOff className="h-4 w-4 mr-1 text-gray-500" /> 비활성</>}
                </div>
              </div>
              
              <Separator className="my-3" />
              
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">영화 수</p>
                <p className="font-medium">{movies.length}개</p>
              </div>
            </CardContent>
          </Card>
          
          {/* 계좌 정보 카드 추가 */}
          {(distributor.bankName || distributor.bankAccountNumber || distributor.accountHolderName) && (
            <Card className="border border-gray-300 shadow-sm hover:shadow-md transition-all duration-300 rounded-xl overflow-hidden">
              <CardHeader className="p-4 pb-2 bg-white">
                <CardTitle className="text-lg font-medium text-[#333333] flex items-center">
                  <Wallet className="h-5 w-5 mr-2 text-[#ff6246]" />
                  계좌 정보
                </CardTitle>
                <CardDescription>배급사 계좌 정보</CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                {distributor.bankName && (
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">은행명</p>
                    <p className="font-medium">{distributor.bankName}</p>
                  </div>
                )}
                
                {distributor.bankAccountNumber && (
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">계좌번호</p>
                    <p className="font-medium">{distributor.bankAccountNumber}</p>
                  </div>
                )}
                
                {distributor.accountHolderName && (
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">예금주</p>
                    <p className="font-medium">{distributor.accountHolderName}</p>
                  </div>
                )}
                
                {distributor.defaultRevenueShare !== null && distributor.defaultRevenueShare !== undefined && (
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">기본 수익 분배</p>
                    <p className="font-medium">{distributor.defaultRevenueShare}%</p>
                  </div>
                )}
                
                {distributor.paymentMethod && (
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">지불 방법</p>
                    <p className="font-medium">{distributor.paymentMethod}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
          
          {distributor.website && (
            <Card className="border border-gray-300 shadow-sm hover:shadow-md transition-all duration-300 rounded-xl overflow-hidden">
              <CardHeader className="p-4 pb-2 bg-white">
                <CardTitle className="text-lg font-medium text-[#333333] flex items-center">
                  <ExternalLink className="h-5 w-5 mr-2 text-[#ff6246]" />
                  외부 링크
                </CardTitle>
                <CardDescription>배급사 관련 외부 사이트</CardDescription>
              </CardHeader>
              <CardContent className="p-4">
                <a 
                  href={distributor.website} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-[#333333] hover:text-[#ff6246] hover:underline font-medium transition-colors flex items-center"
                >
                  <ExternalLink className="h-4 w-4 mr-1" />
                  공식 웹사이트
                </a>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

// ProtectedRoute로 페이지 컴포넌트 감싸서 내보내기
export default function ProtectedDistributorDetailPage() {
  return (
    <ProtectedRoute>
      <DistributorDetailPage />
    </ProtectedRoute>
  );
}

// 정적 생성 비활성화 - 항상 동적 렌더링
export const dynamic = 'force-dynamic';
