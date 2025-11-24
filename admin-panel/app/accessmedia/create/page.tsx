// app/accessmedia/create/page.tsx
"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  AlertCircle, 
  Upload, 
  Apple, 
  Smartphone,
  Film,
  FileText,
  Info,
  ChevronRight,
  ArrowLeft,
  ArrowRight,
  Globe,
  Calendar
} from "lucide-react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

import { useMovies } from "@/hooks/useMovies";
import { useGuidelines } from "@/hooks/useGuidelines";

// 단일 OS 선택 (iOS 또는 Android)
const OS_OPTIONS = [
  { value: "iOS", label: "iOS" },
  { value: "Android", label: "Android" },
];

// 언어 정의
const LANGUAGES = [
  { value: "ko", label: "한국어" },
  { value: "en", label: "영어" },
  { value: "zh", label: "중국어" },
  { value: "ja", label: "일본어" },
  { value: "vi", label: "베트남어" },
  { value: "tl", label: "타갈로그어" },
  { value: "ne", label: "네팔어" },
  { value: "id", label: "인도네시아어" },
  { value: "km", label: "크메르어" },
  { value: "my", label: "미얀마어" },
  { value: "si", label: "싱할라어" },
];

// 접근성 유형 정의 (아이콘 제거, 그룹 유지)
const ACCESS_TYPES = [
  // 해설 그룹
  { value: "AD", label: "음성해설", group: "해설" },
  { value: "CC", label: "자막해설", group: "해설" },
  { value: "SL", label: "수어해설", group: "해설" },
  // 소개 그룹
  { value: "AI", label: "음성소개", group: "소개" },
  { value: "CI", label: "자막소개", group: "소개" },
  { value: "SI", label: "수어소개", group: "소개" },
  // 리뷰 그룹
  { value: "AR", label: "음성리뷰", group: "리뷰" },
  { value: "CR", label: "자막리뷰", group: "리뷰" },
  { value: "SR", label: "수어리뷰", group: "리뷰" },
];

// 접근성 유형별 자산 타입 매핑
const MEDIA_TO_ASSET_TYPE = {
  "AD": "description", // 음성해설 -> 해설
  "CC": "description", // 자막해설 -> 해설
  "SL": "description", // 수어해설 -> 해설
  "AI": "introduction", // 음성소개 -> 소개
  "CI": "introduction", // 자막소개 -> 소개
  "SI": "introduction", // 수어소개 -> 소개
  "AR": "review", // 음성리뷰 -> 리뷰
  "CR": "review", // 자막리뷰 -> 리뷰
  "SR": "review"  // 수어리뷰 -> 리뷰
};

// 게시 상태 옵션
const PUBLISHING_STATUSES = [
  { value: "draft", label: "초안" },
  { value: "review", label: "검토 중" },
  { value: "published", label: "게시됨" },
  { value: "archived", label: "보관됨" },
];

// 접근 정책 옵션
const ACCESS_POLICIES = [
  { value: "private", label: "비공개" },
  { value: "public", label: "공개" },
  { value: "restricted", label: "제한됨" },
  { value: "educational", label: "교육용" },
  { value: "commercial", label: "상업용" },
];

// 제작 상태 옵션
const PRODUCTION_STATUSES = [
  { value: "planning", label: "계획 중" },
  { value: "in_progress", label: "진행 중" },
  { value: "completed", label: "완료" },
  { value: "delayed", label: "지연" },
  { value: "cancelled", label: "취소" },
];

/**
 * 파일 유형별 허용 확장자
 */
const ALLOWED_FILE_TYPES = {
  AD: [".m4a", "audio/x-m4a"],
  CC: [".json", "application/json"],
  SL: [".mp4", "video/mp4"],
  IA: [".m4a", "audio/x-m4a"],
  IC: [".json", "application/json"],
  IS: [".mp4", "video/mp4"],
  RA: [".m4a", "audio/x-m4a"],
  RC: [".json", "application/json"],
  RS: [".mp4", "video/mp4"],
};

/**
 * 폼 데이터 타입 (react-hook-form)
 * 서버로 전송 시, camelCase -> snake_case 매핑은 서버에서 처리(alias_generator).
 */
export interface AccessAssetFormData {
  movieId: number;
  name: string;
  mediaType: string;
  language: string;
  assetType: string;
  guidelineId?: number | null;
  productionYear?: number | null;
  // iOS or Android (단일)
  supportedOs?: string;
  isPublic: boolean;
  isLocked: boolean;
  publishingStatus: string;
  accessPolicy: string;
  productionStatus: string;
  description?: string;
  mediaFile?: File | null;
  fileFormat?: string | null;
}

function getFileExtensionFromMediaType(mediaType: string) {
  const allowedTypes = ALLOWED_FILE_TYPES[mediaType as keyof typeof ALLOWED_FILE_TYPES];
  if (!allowedTypes) return ".mp4, .m4a, .json";
  return allowedTypes[0];
}

function getFileTypeFromMediaType(mediaType: string) {
  const mediaTypeMap: Record<string, string> = {
    AD: "오디오 파일 (m4a)",
    CC: "자막 파일 (json)",
    SL: "비디오 파일 (mp4)",
    AI: "오디오 파일 (m4a)",
    CI: "자막 파일 (json)",
    SI: "비디오 파일 (mp4)",
    AR: "오디오 파일 (m4a)",
    CR: "자막 파일 (json)",
    SR: "비디오 파일 (mp4)",
  };
  return mediaTypeMap[mediaType] || "미디어 파일";
}

/**
 * 영화 제목과 미디어 타입으로 자산 이름 생성
 */
function generateAssetName(movieTitle: string, mediaType: string): string {
  const mediaTypeLabel = ACCESS_TYPES.find(type => type.value === mediaType)?.label || mediaType;
  return `${movieTitle} - ${mediaTypeLabel}`;
}

/**
 * 실제 페이지 컴포넌트
 * - ProtectedRoute와 분리해서, 마지막에 감싸서 export
 */
function CreateAccessAssetPage() {
  const router = useRouter();
  const { data: movies = [], isLoading: isLoadingMovies } = useMovies();
  const { data: guidelines = [], isLoading: isLoadingGuidelines } = useGuidelines();

  // 탭 전환
  const [activeTab, setActiveTab] = useState("basic");

  // 파일 & 에러 관리
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<AccessAssetFormData>({
    defaultValues: {
      mediaType: "AD",
      language: "ko",
      assetType: "description",
      name: "",
      guidelineId: null,
      productionYear: new Date().getFullYear(),
      supportedOs: "iOS",
      isPublic: false,
      isLocked: true,
      publishingStatus: "draft",
      accessPolicy: "private",
      productionStatus: "planning",
      description: "",
      fileFormat: null,
    },
  });

  const selectedMediaType = watch("mediaType");
  const selectedMovieId = watch("movieId");

  // 미디어 타입이 변경될 때 자산 타입(asset_type) 자동 설정
  useEffect(() => {
    if (selectedMediaType) {
      // MEDIA_TO_ASSET_TYPE 매핑을 통해 자산 타입 자동 설정
      const assetType = MEDIA_TO_ASSET_TYPE[selectedMediaType as keyof typeof MEDIA_TO_ASSET_TYPE];
      if (assetType) {
        setValue("assetType", assetType);
      }
    }
  }, [selectedMediaType, setValue]);

  /**
   * 영화 ID와 미디어 타입이 변경될 때 자동으로 name 업데이트
   */
  useEffect(() => {
    if (selectedMovieId) {
      const selectedMovie = movies.find((movie) => movie.id === selectedMovieId);
      if (selectedMovie) {
        const mediaTypeLabel = ACCESS_TYPES.find(
          (type) => type.value === selectedMediaType
        )?.label || "";
        setValue("name", `${selectedMovie.title} - ${mediaTypeLabel}`);
      }
    }
  }, [selectedMovieId, selectedMediaType, movies, setValue]);

  /**
   * 영화 선택 핸들러
   */
  const handleMovieChange = (movieId: number) => {
    setValue("movieId", movieId);
  };

  /**
   * 접근성 유형 (mediaType) 선택 시 처리 핸들러
   */
  const handleMediaTypeChange = (mediaType: string) => {
    setValue("mediaType", mediaType);
    
    // 자산 타입도 자동 설정
    const assetType = MEDIA_TO_ASSET_TYPE[mediaType as keyof typeof MEDIA_TO_ASSET_TYPE];
    if (assetType) {
      setValue("assetType", assetType);
    }
    
    // 파일 초기화
    setUploadedFile(null);
  };

  /**
   * 파일 업로드 핸들러
   */
  const handleFileUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const allowedTypes =
        ALLOWED_FILE_TYPES[selectedMediaType as keyof typeof ALLOWED_FILE_TYPES];
      if (!allowedTypes) {
        setErrorMessage("지원되지 않는 미디어 타입입니다.");
        return;
      }

      const isValidType = allowedTypes.some(
        (type) =>
          (type.startsWith(".") && file.name.endsWith(type)) ||
          (!type.startsWith(".") && file.type === type)
      );

      if (!isValidType) {
        setErrorMessage(
          `파일 형식이 유효하지 않습니다. ${getFileTypeFromMediaType(
            selectedMediaType
          )} 형식만 지원합니다.`
        );
        return;
      }

      const maxSize = 100 * 1024 * 1024; // 100MB
      if (file.size > maxSize) {
        setErrorMessage("파일 크기가 너무 큽니다. 최대 100MB까지 업로드 가능합니다.");
        return;
      }

      setUploadedFile(file);
      setValue("mediaFile", file);
      setValue("fileFormat", file.type);
      setErrorMessage(null);

      // 파일 업로드 후 "추가 정보" 탭으로 이동
      setActiveTab("additional");
    },
    [selectedMediaType, setValue]
  );

  /**
   * 폼 전송
   */
  const onSubmit = async (data: AccessAssetFormData) => {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const formData = new FormData();

      // JSON 부분 (camelCase 그대로)
      formData.append(
        "data",
        JSON.stringify({
          movieId: data.movieId,
          name: data.name,
          mediaType: data.mediaType,
          language: data.language,
          assetType: data.assetType,
          guidelineId: data.guidelineId,
          productionYear: data.productionYear,
          supportedOs: data.supportedOs, // "iOS" or "Android"
          isPublic: data.isPublic,
          isLocked: data.isLocked,
          publishingStatus: data.publishingStatus,
          accessPolicy: data.accessPolicy,
          productionStatus: data.productionStatus,
          description: data.description,
        })
      );

      // 파일
      if (uploadedFile) {
        formData.append("file", uploadedFile);
      } else {
        // 파일 없으면 placeholder
        const emptyBlob = new Blob(["placeholder"], { type: "text/plain" });
        formData.append("file", emptyBlob, "placeholder.txt");
      }

      console.log(
        "Metadata being sent (camelCase):",
        JSON.parse(formData.get("data") as string)
      );
      console.log("Has file:", !!uploadedFile);

      const response = await fetch("/admin/api/access-assets", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const clonedResponse = response.clone();
        let errorMessageText = `HTTP 오류: ${response.status}`;
        try {
          const errorData = await clonedResponse.json();
          console.error("API Error Response:", errorData);
          if (errorData.detail) {
            errorMessageText = Array.isArray(errorData.detail)
              ? errorData.detail
                  .map((err: any) =>
                    err.msg
                      ? `${err.loc.join(".")}: ${err.msg}`
                      : JSON.stringify(err)
                  )
                  .join(", ")
              : errorData.detail.toString();
          }
        } catch (parseError) {
          console.error("Failed to parse error response as JSON:", parseError);
        }
        throw new Error(errorMessageText);
      }

      const responseData = await response.json();
      toast.success("접근성 미디어가 성공적으로 등록되었습니다.");
      router.push(`/accessmedia/${responseData.id}`);
    } catch (error) {
      console.error("Error creating access asset:", error);
      const errorMsg =
        error instanceof Error
          ? error.message
          : "접근성 미디어 등록 중 오류가 발생했습니다.";
      setErrorMessage(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingMovies || isLoadingGuidelines) {
    return (
      <div className="max-w-[1200px] mx-auto py-10">
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto py-10">
      <Card className="shadow-md border border-gray-300 hover:shadow-lg transition-all duration-300 rounded-xl overflow-hidden">
        <CardHeader className="p-4 pb-2 bg-white">
          <CardTitle className="text-2xl font-bold text-[#333333] flex items-center">
            <FileText className="h-6 w-6 mr-2 text-[#ff6246]" />
            새 접근성 미디어 등록
          </CardTitle>
          <CardDescription>
            영화에 추가할 새로운 접근성 미디어 자산을 등록합니다. 음성해설, 자막해설, 수어해설 등 다양한 미디어 유형과 언어를 지정할 수 있습니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          {errorMessage && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            {/* 새로운 스텝 기반 탭 디자인 */}
            <div className="relative mb-12">
              <div className="absolute left-0 right-0 h-1 bg-gray-200 top-5"></div>
              <div className="flex justify-between relative">
                <button 
                  type="button" 
                  onClick={() => setActiveTab("basic")}
                  className={`flex flex-col items-center z-10 ${activeTab === "basic" ? "text-[#ff6246]" : "text-gray-500"}`}
                >
                  <div className={`rounded-full w-10 h-10 mb-2 flex items-center justify-center ${activeTab === "basic" ? "bg-[#ff6246] text-white" : activeTab === "media" || activeTab === "additional" ? "bg-[#4da34c] text-white" : "bg-gray-200"}`}>
                    1
                  </div>
                  <span className="text-xs font-medium">기본 정보</span>
                </button>
                
                <button 
                  type="button" 
                  onClick={() => setActiveTab("media")}
                  className={`flex flex-col items-center z-10 ${activeTab === "media" ? "text-[#ff6246]" : activeTab === "additional" ? "text-[#4da34c]" : "text-gray-500"}`}
                >
                  <div className={`rounded-full w-10 h-10 mb-2 flex items-center justify-center ${activeTab === "media" ? "bg-[#ff6246] text-white" : activeTab === "additional" ? "bg-[#4da34c] text-white" : "bg-gray-200"}`}>
                    2
                  </div>
                  <span className="text-xs font-medium">미디어 파일</span>
                </button>
                
                <button 
                  type="button" 
                  onClick={() => setActiveTab("additional")}
                  className={`flex flex-col items-center z-10 ${activeTab === "additional" ? "text-[#ff6246]" : "text-gray-500"}`}
                >
                  <div className={`rounded-full w-10 h-10 mb-2 flex items-center justify-center ${activeTab === "additional" ? "bg-[#ff6246] text-white" : "bg-gray-200"}`}>
                    3
                  </div>
                  <span className="text-xs font-medium">부가 정보</span>
                </button>
              </div>
            </div>

            {/* --- 기본 정보 탭 --- */}
            <div className={activeTab === "basic" ? "block" : "hidden"}>
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label
                    htmlFor="movieId"
                    className="text-sm font-medium flex items-center"
                  >
                    <Film className="h-4 w-4 mr-1 text-[#4da34c]" />
                    영화 선택 <span className="text-red-500 ml-1">*</span>
                  </Label>
                  <Select
                    onValueChange={(value) => handleMovieChange(Number(value))}
                    defaultValue={selectedMovieId?.toString()}
                  >
                    <SelectTrigger className="w-full border-gray-300 focus:ring-[#4da34c] focus:border-[#4da34c]">
                      <SelectValue placeholder="영화를 선택하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      {movies.map((movie) => (
                        <SelectItem key={movie.id} value={movie.id.toString()}>
                          {movie.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.movieId && (
                    <p className="text-sm text-red-500">
                      영화를 선택해주세요
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                  {/* 접근성 유형 카드 - 아이콘 제거하고 코드 뱃지 추가 */}
                  <Card className="border border-gray-200 shadow-sm">
                    <CardHeader className="p-4 pb-2">
                      <CardTitle className="text-base font-medium flex items-center">
                        <Info className="h-4 w-4 mr-2 text-[#ff6246]" />
                        접근성 유형 <span className="text-red-500 ml-1">*</span>
                      </CardTitle>
                      <CardDescription>접근성 미디어의 유형을 선택해주세요</CardDescription>
                    </CardHeader>
                    <CardContent className="p-4">
                      <div className="grid grid-cols-1 gap-3">
                        {/* 해설 그룹 */}
                        <div className="space-y-2">
                          <div className="font-medium text-sm text-[#333333] pb-1 border-b">해설</div>
                          <div className="grid grid-cols-1 gap-2">
                            {ACCESS_TYPES.filter(type => type.group === '해설').map((type) => (
                              <div
                                key={type.value}
                                className={`flex items-center space-x-2 hover:bg-gray-50 p-2 rounded-md border ${selectedMediaType === type.value ? 'border-[#4da34c] bg-[#f5fbf5]' : 'border-transparent'}`}
                              >
                                <input
                                  type="radio"
                                  id={`mediaType-${type.value}`}
                                  name="mediaType"
                                  value={type.value}
                                  className="form-radio h-4 w-4 text-[#4da34c]"
                                  defaultChecked={type.value === watch("mediaType")}
                                  onChange={() => handleMediaTypeChange(type.value)}
                                />
                                <Label
                                  htmlFor={`mediaType-${type.value}`}
                                  className="text-sm cursor-pointer flex items-center w-full"
                                >
                                  <span className="inline-flex items-center justify-center px-2 py-1 mr-2 text-xs font-medium rounded bg-gray-100 text-gray-800 border border-gray-200">
                                    {type.value}
                                  </span>
                                  {type.label}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        {/* 소개 그룹 */}
                        <div className="space-y-2">
                          <div className="font-medium text-sm text-[#333333] pb-1 border-b">소개</div>
                          <div className="grid grid-cols-1 gap-2">
                            {ACCESS_TYPES.filter(type => type.group === '소개').map((type) => (
                              <div
                                key={type.value}
                                className={`flex items-center space-x-2 hover:bg-gray-50 p-2 rounded-md border ${selectedMediaType === type.value ? 'border-[#4da34c] bg-[#f5fbf5]' : 'border-transparent'}`}
                              >
                                <input
                                  type="radio"
                                  id={`mediaType-${type.value}`}
                                  name="mediaType"
                                  value={type.value}
                                  className="form-radio h-4 w-4 text-[#4da34c]"
                                  defaultChecked={type.value === watch("mediaType")}
                                  onChange={() => handleMediaTypeChange(type.value)}
                                />
                                <Label
                                  htmlFor={`mediaType-${type.value}`}
                                  className="text-sm cursor-pointer flex items-center w-full"
                                >
                                  <span className="inline-flex items-center justify-center px-2 py-1 mr-2 text-xs font-medium rounded bg-gray-100 text-gray-800 border border-gray-200">
                                    {type.value}
                                  </span>
                                  {type.label}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        {/* 리뷰 그룹 */}
                        <div className="space-y-2">
                          <div className="font-medium text-sm text-[#333333] pb-1 border-b">리뷰</div>
                          <div className="grid grid-cols-1 gap-2">
                            {ACCESS_TYPES.filter(type => type.group === '리뷰').map((type) => (
                              <div
                                key={type.value}
                                className={`flex items-center space-x-2 hover:bg-gray-50 p-2 rounded-md border ${selectedMediaType === type.value ? 'border-[#4da34c] bg-[#f5fbf5]' : 'border-transparent'}`}
                              >
                                <input
                                  type="radio"
                                  id={`mediaType-${type.value}`}
                                  name="mediaType"
                                  value={type.value}
                                  className="form-radio h-4 w-4 text-[#4da34c]"
                                  defaultChecked={type.value === watch("mediaType")}
                                  onChange={() => handleMediaTypeChange(type.value)}
                                />
                                <Label
                                  htmlFor={`mediaType-${type.value}`}
                                  className="text-sm cursor-pointer flex items-center w-full"
                                >
                                  <span className="inline-flex items-center justify-center px-2 py-1 mr-2 text-xs font-medium rounded bg-gray-100 text-gray-800 border border-gray-200">
                                    {type.value}
                                  </span>
                                  {type.label}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                      {errors.mediaType && (
                        <p className="text-sm text-red-500 mt-2">
                          접근성 유형을 선택해주세요.
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  {/* 언어 카드 */}
                  <Card className="border border-gray-200 shadow-sm">
                    <CardHeader className="p-4 pb-2">
                      <CardTitle className="text-base font-medium flex items-center">
                        <Globe className="h-4 w-4 mr-2 text-[#ff6246]" />
                        언어 <span className="text-red-500 ml-1">*</span>
                      </CardTitle>
                      <CardDescription>미디어에 사용된 언어를 선택해주세요</CardDescription>
                    </CardHeader>
                    <CardContent className="p-4">
                      <div className="grid grid-cols-2 gap-3">
                        {LANGUAGES.map((lang) => (
                          <div
                            key={lang.value}
                            className={`flex items-center space-x-2 hover:bg-gray-50 p-2 rounded-md border ${watch("language") === lang.value ? 'border-[#4da34c] bg-[#f5fbf5]' : 'border-transparent'}`}
                          >
                            <input
                              type="radio"
                              id={`language-${lang.value}`}
                              name="language"
                              value={lang.value}
                              className="form-radio h-4 w-4 text-[#4da34c]"
                              defaultChecked={lang.value === watch("language")}
                              onChange={(e) => setValue("language", e.target.value)}
                            />
                            <Label
                              htmlFor={`language-${lang.value}`}
                              className="text-sm cursor-pointer w-full flex items-center"
                            >
                              <span className="inline-flex items-center justify-center px-2 py-1 mr-2 text-xs font-medium rounded bg-gray-100 text-gray-800 border border-gray-200">
                                {lang.value}
                              </span>
                              {lang.label}
                            </Label>
                          </div>
                        ))}
                      </div>
                      {errors.language && (
                        <p className="text-sm text-red-500 mt-2">
                          언어를 선택해주세요.
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* 자산 타입은 미디어 타입에 따라 자동 선택되므로 UI에서 제거 */}
                <input type="hidden" {...register("assetType")} />

                {/* 다음 버튼 */}
                <div className="pt-4 flex justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.back()}
                    className="px-6"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    뒤로
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setActiveTab("media")}
                    className="px-6 bg-[#4da34c] hover:bg-[#3d8c3c]"
                  >
                    다음: 미디어 파일
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            </div>

            {/* --- 미디어 파일 탭 --- */}
            <div className={activeTab === "media" ? "block" : "hidden"}>
              <div className="space-y-6">
                <Card className="border border-gray-200 border-dashed shadow-sm bg-gray-50">
                  <CardContent className="p-6">
                    <div className="space-y-6">
                      <div className="flex justify-center">
                        <Upload className="h-12 w-12 text-gray-400" />
                      </div>
                      <div className="text-center">
                        <h3 className="text-lg font-medium text-[#333333]">미디어 파일 업로드</h3>
                        <p className="text-sm text-gray-500 mt-1">
                          선택한 접근성 유형에 적합한 파일을 업로드하세요.
                          <br />
                          {selectedMediaType && (
                            <span className="font-medium text-[#4da34c]">
                              {getFileTypeFromMediaType(selectedMediaType)}
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="flex justify-center">
                        <label htmlFor="file-upload" className="cursor-pointer">
                          <span className="mt-2 inline-flex items-center px-4 py-2 bg-[#4da34c] text-white text-sm font-medium rounded-md hover:bg-[#3d8c3c]">
                            <Upload className="h-4 w-4 mr-2" />
                            파일 선택
                          </span>
                          <input
                            id="file-upload"
                            type="file"
                            className="sr-only"
                            onChange={handleFileUpload}
                            accept={getFileExtensionFromMediaType(
                              selectedMediaType
                            )}
                          />
                        </label>
                      </div>
                    </div>
                    {uploadedFile && (
                      <div className="mt-6 p-4 bg-white rounded-md border border-gray-200">
                        <h4 className="font-medium text-[#333333]">업로드된 파일:</h4>
                        <div className="flex justify-between items-center mt-2">
                          <span className="text-sm">{uploadedFile.name}</span>
                          <span className="text-xs text-gray-500">
                            {(uploadedFile.size / (1024 * 1024)).toFixed(2)} MB
                          </span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <div className="pt-4 flex justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setActiveTab("basic")}
                    className="px-6"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    이전: 기본 정보
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setActiveTab("additional")}
                    className="px-6 bg-[#4da34c] hover:bg-[#3d8c3c]"
                  >
                    다음: 부가 정보
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            </div>

            {/* --- 부가 정보 탭 --- */}
            <div className={activeTab === "additional" ? "block" : "hidden"}>
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-sm font-medium flex items-center">
                    <FileText className="h-4 w-4 mr-1 text-[#4da34c]" />
                    설명
                  </Label>
                  <Textarea
                    id="description"
                    placeholder="미디어에 대한 설명을 입력하세요"
                    className="min-h-[120px] border-gray-300 focus:ring-[#4da34c] focus:border-[#4da34c]"
                    {...register("description")}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label
                        htmlFor="guidelineId"
                        className="text-sm font-medium flex items-center"
                      >
                        <FileText className="h-4 w-4 mr-1 text-[#4da34c]" />
                        가이드라인
                      </Label>
                      <Select
                        value={watch("guidelineId")?.toString() || "none"}
                        onValueChange={(value) =>
                          setValue(
                            "guidelineId",
                            value === "none" ? null : Number(value)
                          )
                        }
                      >
                        <SelectTrigger className="w-full border-gray-300 focus:ring-[#4da34c] focus:border-[#4da34c]">
                          <SelectValue placeholder="가이드라인 선택 (선택사항)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">없음</SelectItem>
                          {guidelines.map((guideline) => (
                            <SelectItem
                              key={guideline.id}
                              value={guideline.id.toString()}
                            >
                              {guideline.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="productionYear"
                        className="text-sm font-medium flex items-center"
                      >
                        <Calendar className="h-4 w-4 mr-1 text-[#4da34c]" />
                        제작 연도
                      </Label>
                      <Input
                        id="productionYear"
                        type="number"
                        className="border-gray-300 focus:ring-[#4da34c] focus:border-[#4da34c]"
                        {...register("productionYear", {
                          valueAsNumber: true,
                          validate: (value) =>
                            !value ||
                            (value >= 1900 &&
                              value <= new Date().getFullYear() + 5),
                        })}
                      />
                      {errors.productionYear && (
                        <p className="text-sm text-red-500">
                          유효한 제작 연도를 입력해주세요.
                        </p>
                      )}
                    </div>

                    {/* 단일 OS 선택 - 기본정보의 라디오 버튼과 동일한 스타일로 */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium flex items-center">
                        <Smartphone className="h-4 w-4 mr-1 text-[#4da34c]" />
                        지원 OS
                      </Label>
                      <div className="grid grid-cols-2 gap-3">
                        {OS_OPTIONS.map((os) => (
                          <div
                            key={os.value}
                            className={`flex items-center space-x-2 hover:bg-gray-50 p-2 rounded-md border ${watch("supportedOs") === os.value ? 'border-[#4da34c] bg-[#f5fbf5]' : 'border-transparent'}`}
                          >
                            <input
                              type="radio"
                              id={`os-${os.value}`}
                              name="supportedOs"
                              value={os.value}
                              className="form-radio h-4 w-4 text-[#4da34c]"
                              checked={os.value === watch("supportedOs")}
                              onChange={(e) => setValue("supportedOs", e.target.value)}
                            />
                            <Label 
                              htmlFor={`os-${os.value}`} 
                              className="text-sm cursor-pointer flex items-center"
                            >
                              {os.value === "iOS" ? (
                                <Apple className="h-4 w-4 mr-1 text-gray-600" />
                              ) : (
                                <Smartphone className="h-4 w-4 mr-1 text-green-600" />
                              )}
                              {os.label}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded-md border border-transparent">
                      <Checkbox 
                        id="isPublic" 
                        checked={watch("isPublic")}
                        onCheckedChange={(checked) => 
                          setValue("isPublic", checked === true)
                        }
                        className="text-[#4da34c] border-gray-300 focus:ring-[#4da34c]"
                      />
                      <div>
                        <Label
                          htmlFor="isPublic"
                          className="text-sm font-medium cursor-pointer"
                        >
                          공개
                        </Label>
                        <p className="text-xs text-gray-500">
                          이 자산을 공개적으로 접근 가능하게 설정합니다
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded-md border border-transparent">
                      <Checkbox
                        id="isLocked"
                        checked={watch("isLocked")}
                        onCheckedChange={(checked) => 
                          setValue("isLocked", checked === true)
                        }
                        className="text-[#4da34c] border-gray-300 focus:ring-[#4da34c]"
                      />
                      <div>
                        <Label
                          htmlFor="isLocked"
                          className="text-sm font-medium cursor-pointer"
                        >
                          잠금
                        </Label>
                        <p className="text-xs text-gray-500">
                          이 자산의 접근을 요청 기반으로 제한합니다
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="publishingStatus"
                        className="text-sm font-medium"
                      >
                        게시 상태
                      </Label>
                      <Select
                        defaultValue={watch("publishingStatus")}
                        onValueChange={(value) =>
                          setValue("publishingStatus", value)
                        }
                      >
                        <SelectTrigger className="w-full border-gray-300 focus:ring-[#4da34c] focus:border-[#4da34c]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PUBLISHING_STATUSES.map((status) => (
                            <SelectItem key={status.value} value={status.value}>
                              {status.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="accessPolicy"
                        className="text-sm font-medium"
                      >
                        접근 정책
                      </Label>
                      <Select
                        defaultValue={watch("accessPolicy")}
                        onValueChange={(value) =>
                          setValue("accessPolicy", value)
                        }
                      >
                        <SelectTrigger className="w-full border-gray-300 focus:ring-[#4da34c] focus:border-[#4da34c]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ACCESS_POLICIES.map((policy) => (
                            <SelectItem key={policy.value} value={policy.value}>
                              {policy.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="productionStatus"
                        className="text-sm font-medium"
                      >
                        제작 상태
                      </Label>
                      <Select
                        defaultValue={watch("productionStatus")}
                        onValueChange={(value) =>
                          setValue("productionStatus", value)
                        }
                      >
                        <SelectTrigger className="w-full border-gray-300 focus:ring-[#4da34c] focus:border-[#4da34c]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PRODUCTION_STATUSES.map((status) => (
                            <SelectItem key={status.value} value={status.value}>
                              {status.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* 최종 제출 버튼 */}
                <div className="pt-6 flex justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setActiveTab("media")}
                    className="px-6"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    이전: 미디어 파일
                  </Button>
                  <div className="space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => router.back()}
                      className="border-gray-300 hover:bg-[#fff5f3] hover:text-[#ff6246] hover:border-[#ff6246]"
                    >
                      취소
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="bg-[#4da34c] hover:bg-[#3d8c3c]"
                    >
                      {isSubmitting ? "처리 중..." : "등록"}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * 최종 Default Export: ProtectedRoute로 감싼 페이지
 */
export default function ProtectedCreateAccessAssetPage() {
  return (
    <ProtectedRoute>
      <CreateAccessAssetPage />
    </ProtectedRoute>
  );
}
