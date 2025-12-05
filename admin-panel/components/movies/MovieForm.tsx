// components/movies/MovieForm.tsx
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Movie, DistributorSimple } from "../../types/movie";
import { movieFormSchema, MovieFormValues } from "../../types/movieSchema";
import { ImageUpload } from "../../app/components/common/uploads/ImageUpload";
import { PrivateFileUpload } from "../../app/components/common/uploads/PrivateFileUpload";
import { GenreSelector } from "../../app/components/common/selectors/GenreSelector";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import {
  Loader2,
  Calendar,
  Film,
  Image,
  Settings,
  ArrowLeft,
  ArrowRight,
  FileText,
  Globe,
  Clock,
  Users,
  Building2
} from "lucide-react";
import { format } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Calendar as CalendarComponent } from "../ui/calendar";
import { toast } from "sonner";
import { api } from "@/lib/api";

interface MovieFormProps {
  initialData?: Movie;
  distributors?: DistributorSimple[];
  onSubmit?: (data: any) => void;
}

// 표시 유형 옵션
const VISIBILITY_TYPES = [
  { value: "always", label: "항상 표시" },
  { value: "period", label: "기간 지정" },
  { value: "hidden", label: "숨김" },
];

// 공개 여부 옵션
const PUBLIC_OPTIONS = [
  { value: "true", label: "공개" },
  { value: "false", label: "비공개" },
];

// 게시 상태 옵션
const PUBLISHING_STATUSES = [
  { value: "draft", label: "초안" },
  { value: "published", label: "게시됨" },
  { value: "archived", label: "보관됨" },
];

// 등급 옵션
const FILM_RATINGS = [
  { value: "전체관람가", label: "전체관람가" },
  { value: "12세이상관람가", label: "12세이상관람가" },
  { value: "15세이상관람가", label: "15세이상관람가" },
  { value: "청소년관람불가", label: "청소년관람불가" },
  { value: "제한상영가", label: "제한상영가" },
];

export function MovieForm({ initialData, distributors = [], onSubmit }: MovieFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [posterId, setPosterId] = useState<number | null>(initialData?.posterFileId || null);
  const [signatureFileId, setSignatureFileId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("basic");

  // 폼 설정
  const form = useForm<MovieFormValues>({
    resolver: zodResolver(movieFormSchema),
    defaultValues: initialData ? {
      ...initialData,
      releaseDate: initialData.releaseDate || "",
      startAt: initialData.startAt || "",
      endAt: initialData.endAt || "",
    } : {
      title: "",
      visibilityType: "always",
      isPublic: false,
      publishingStatus: "draft"
    },
  });

  // 표시 유형에 따른 기간 필드 표시 여부
  const visibilityType = form.watch("visibilityType");
  const showPeriodFields = visibilityType === "period";

  // 폼 제출 처리
  const handleSubmit = async (data: MovieFormValues) => {
    try {
      setIsSubmitting(true);

      // 빈 문자열을 null로 변환하는 헬퍼 함수
      const emptyToNull = (value: string | null | undefined): string | null => {
        return value === "" || value === undefined ? null : value;
      };

      // 백엔드 MovieUpdate 스키마에서 허용하는 필드만 추출
      // 빈 문자열을 null로 변환하여 Pydantic 검증 오류 방지
      const movieData = {
        title: data.title,
        director: emptyToNull(data.director),
        releaseDate: emptyToNull(data.releaseDate),
        filmGenre: emptyToNull(data.filmGenre),
        filmRating: emptyToNull(data.filmRating),
        runningTime: data.runningTime,
        country: emptyToNull(data.country),
        logline: emptyToNull(data.logline),
        visibilityType: data.visibilityType,
        startAt: emptyToNull(data.startAt),
        endAt: emptyToNull(data.endAt),
        featureCode: emptyToNull(data.featureCode),
        adminMemo: emptyToNull(data.adminMemo),
        distributorId: data.distributorId,
        isPublic: data.isPublic,
        publishingStatus: data.publishingStatus,
        posterFileId: posterId
      };

      // 신규 생성 또는 수정 API 호출
      const url = initialData
        ? `/admin/api/movies/${initialData.id}`
        : "/admin/api/movies";

      const response = initialData
        ? await api.put(url, movieData)
        : await api.post(url, movieData);

      const savedMovie = response.data;

      toast.success(
        `영화가 성공적으로 ${initialData ? '수정' : '생성'}되었습니다`,
        { description: `"${savedMovie.title}" ${initialData ? '수정' : '생성'} 완료` }
      );

      // onSubmit 콜백 호출
      if (onSubmit) {
        onSubmit(savedMovie);
      } else {
        // 목록 페이지로 이동
        router.push("/movies");
        router.refresh();
      }

    } catch (error) {
      console.error("Error saving movie:", error);
      toast.error(
        "오류",
        { description: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다." }
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // 포스터 업로드 완료 처리
  const handlePosterUploadComplete = (fileData: any) => {
    if (fileData && fileData.id) {
      setPosterId(fileData.id);
      toast.success("포스터 업로드 완료", {
        description: "포스터 이미지가 성공적으로 업로드되었습니다."
      });
    }
  };

  // 시그니처 파일 업로드 완료 처리
  const handleSignatureUploadComplete = (fileData: any) => {
    if (fileData && fileData.id) {
      setSignatureFileId(fileData.id);
      toast.success("시그니처 파일 업로드 완료", {
        description: "시그니처 파일이 성공적으로 업로드되었습니다."
      });
    }
  };

  return (
    <Card className="border border-gray-300 shadow-sm hover:shadow-md transition-all duration-300 rounded-xl overflow-hidden">
      <CardHeader className="p-4 pb-2 bg-white">
        <CardTitle className="text-2xl font-bold text-[#333333] flex items-center">
          <Film className="h-6 w-6 mr-2 text-[#ff6246]" />
          {initialData ? "영화 수정" : "영화 등록"}
        </CardTitle>
        <CardDescription>
          {initialData ? "영화 정보를 수정합니다." : "새로운 영화를 등록합니다."}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
            {/* 스텝 기반 탭 디자인 */}
            <div className="relative mb-12">
              <div className="absolute left-0 right-0 h-1 bg-gray-200 top-5"></div>
              <div className="flex justify-between relative">
                <button
                  type="button"
                  onClick={() => setActiveTab("basic")}
                  className={`flex flex-col items-center z-10 ${activeTab === "basic" ? "text-[#ff6246]" : "text-gray-500"}`}
                >
                  <div className={`rounded-full w-10 h-10 mb-2 flex items-center justify-center ${activeTab === "basic" ? "bg-[#ff6246] text-white" : activeTab === "media" || activeTab === "publishing" ? "bg-[#4da34c] text-white" : "bg-gray-200"}`}>
                    1
                  </div>
                  <span className="text-xs font-medium">기본 정보</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("media")}
                  className={`flex flex-col items-center z-10 ${activeTab === "media" ? "text-[#ff6246]" : activeTab === "publishing" ? "text-[#4da34c]" : "text-gray-500"}`}
                >
                  <div className={`rounded-full w-10 h-10 mb-2 flex items-center justify-center ${activeTab === "media" ? "bg-[#ff6246] text-white" : activeTab === "publishing" ? "bg-[#4da34c] text-white" : "bg-gray-200"}`}>
                    2
                  </div>
                  <span className="text-xs font-medium">미디어 파일</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("publishing")}
                  className={`flex flex-col items-center z-10 ${activeTab === "publishing" ? "text-[#ff6246]" : "text-gray-500"}`}
                >
                  <div className={`rounded-full w-10 h-10 mb-2 flex items-center justify-center ${activeTab === "publishing" ? "bg-[#ff6246] text-white" : "bg-gray-200"}`}>
                    3
                  </div>
                  <span className="text-xs font-medium">게시 설정</span>
                </button>
              </div>
            </div>

            {/* 기본 정보 탭 */}
            <div className={activeTab === "basic" ? "block" : "hidden"}>
              <div className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  {/* 제목 필드 */}
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium flex items-center">
                          <Film className="h-4 w-4 mr-1 text-[#4da34c]" />
                          영화 제목 <span className="text-red-500 ml-1">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="영화 제목"
                            {...field}
                            className="border-gray-300 focus:ring-[#4da34c] focus:border-[#4da34c]"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* 감독 필드 */}
                  <FormField
                    control={form.control}
                    name="director"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium flex items-center">
                          <Users className="h-4 w-4 mr-1 text-[#4da34c]" />
                          감독
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="감독"
                            {...field}
                            value={field.value || ""}
                            className="border-gray-300 focus:ring-[#4da34c] focus:border-[#4da34c]"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  {/* 개봉일 필드 */}
                  <FormField
                    control={form.control}
                    name="releaseDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel className="text-sm font-medium flex items-center">
                          <Calendar className="h-4 w-4 mr-1 text-[#4da34c]" />
                          개봉일
                        </FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={`w-full pl-3 text-left font-normal border-gray-300 ${!field.value ? "text-muted-foreground" : ""}`}
                              >
                                {field.value ? (
                                  format(new Date(field.value), "yyyy-MM-dd")
                                ) : (
                                  <span>날짜 선택</span>
                                )}
                                <Calendar className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <CalendarComponent
                              mode="single"
                              selected={field.value ? new Date(field.value) : undefined}
                              onSelect={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : "")}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* 장르 필드 */}
                  <GenreSelector
                    control={form.control}
                    name="filmGenre"
                  />
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  {/* 등급 카드 */}
                  <Card className="border border-gray-200 shadow-sm">
                    <CardHeader className="p-4 pb-2">
                      <CardTitle className="text-base font-medium flex items-center">
                        <FileText className="h-4 w-4 mr-2 text-[#ff6246]" />
                        영화 등급
                      </CardTitle>
                      <CardDescription>영화 관람 등급을 선택해주세요</CardDescription>
                    </CardHeader>
                    <CardContent className="p-4">
                      <div className="grid grid-cols-1 gap-2">
                        {FILM_RATINGS.map((rating) => (
                          <div
                            key={rating.value}
                            className={`flex items-center space-x-2 hover:bg-gray-50 p-2 rounded-md border ${form.watch("filmRating") === rating.value ? 'border-[#4da34c] bg-[#f5fbf5]' : 'border-transparent'}`}
                          >
                            <input
                              type="radio"
                              id={`rating-${rating.value}`}
                              name="filmRating"
                              value={rating.value}
                              className="form-radio h-4 w-4 text-[#4da34c]"
                              checked={rating.value === form.watch("filmRating")}
                              onChange={() => form.setValue("filmRating", rating.value)}
                            />
                            <Label
                              htmlFor={`rating-${rating.value}`}
                              className="text-sm cursor-pointer w-full"
                            >
                              {rating.label}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* 기타 정보 */}
                  <div className="space-y-4">
                    {/* 상영 시간 */}
                    <FormField
                      control={form.control}
                      name="runningTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium flex items-center">
                            <Clock className="h-4 w-4 mr-1 text-[#4da34c]" />
                            상영 시간 (분)
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="상영 시간"
                              {...field}
                              value={field.value || ""}
                              onChange={(e) => field.onChange(e.target.value === "" ? null : parseInt(e.target.value))}
                              className="border-gray-300 focus:ring-[#4da34c] focus:border-[#4da34c]"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* 국가 */}
                    <FormField
                      control={form.control}
                      name="country"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium flex items-center">
                            <Globe className="h-4 w-4 mr-1 text-[#4da34c]" />
                            국가
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="국가"
                              {...field}
                              value={field.value || ""}
                              className="border-gray-300 focus:ring-[#4da34c] focus:border-[#4da34c]"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* 배급사 */}
                    <FormField
                      control={form.control}
                      name="distributorId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium flex items-center">
                            <Building2 className="h-4 w-4 mr-1 text-[#4da34c]" />
                            배급사
                          </FormLabel>
                          <Select
                            onValueChange={(value) => field.onChange(value === "none" ? null : parseInt(value))}
                            defaultValue={field.value?.toString() || "none"}
                          >
                            <FormControl>
                              <SelectTrigger className="border-gray-300 focus:ring-[#4da34c] focus:border-[#4da34c]">
                                <SelectValue placeholder="배급사 선택" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">선택 안함</SelectItem>
                              {distributors.map((distributor) => (
                                <SelectItem
                                  key={distributor.id}
                                  value={distributor.id.toString()}
                                  disabled={!distributor.isActive}
                                >
                                  {distributor.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* 로그라인 */}
                <FormField
                  control={form.control}
                  name="logline"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium flex items-center">
                        <FileText className="h-4 w-4 mr-1 text-[#4da34c]" />
                        로그라인
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="영화 한 줄 요약"
                          {...field}
                          value={field.value || ""}
                          rows={3}
                          className="border-gray-300 focus:ring-[#4da34c] focus:border-[#4da34c]"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* 관리자 메모 */}
                <FormField
                  control={form.control}
                  name="adminMemo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium flex items-center">
                        <FileText className="h-4 w-4 mr-1 text-[#4da34c]" />
                        관리자 메모
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="관리자 메모"
                          {...field}
                          value={field.value || ""}
                          rows={3}
                          className="border-gray-300 focus:ring-[#4da34c] focus:border-[#4da34c]"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* 다음 버튼 */}
                <div className="pt-4 flex justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push("/movies")}
                    className="px-6"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    취소
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

            {/* 미디어 파일 탭 */}
            <div className={activeTab === "media" ? "block" : "hidden"}>
              <div className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  {/* 포스터 이미지 업로드 */}
                  <Card className="border border-gray-200 shadow-sm">
                    <CardHeader className="p-4 pb-2">
                      <CardTitle className="text-base font-medium flex items-center">
                        <Image className="h-4 w-4 mr-2 text-[#ff6246]" />
                        포스터 이미지
                      </CardTitle>
                      <CardDescription>영화 포스터 이미지를 업로드하세요</CardDescription>
                    </CardHeader>
                    <CardContent className="p-4">
                      <ImageUpload
                        directory="movies/posters"
                        isPublic={true}
                        entityType="movie"
                        entityId={initialData?.id || -1}
                        usageType="poster"
                        onUploadComplete={handlePosterUploadComplete}
                        initialImageUrl={initialData?.posterFileId ? `/api/files/by-id/${initialData.posterFileId}` : undefined}
                      />
                    </CardContent>
                  </Card>

                  {/* 시그니처 파일 업로드 */}
                  <Card className="border border-gray-200 shadow-sm">
                    <CardHeader className="p-4 pb-2">
                      <CardTitle className="text-base font-medium flex items-center">
                        <FileText className="h-4 w-4 mr-2 text-[#ff6246]" />
                        시그니처 파일
                      </CardTitle>
                      <CardDescription>사운드 동기화를 위한 시그니처 파일을 업로드하세요</CardDescription>
                    </CardHeader>
                    <CardContent className="p-4">
                      <FormField
                        control={form.control}
                        name="supportedOsType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium">OS 타입</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value || undefined}
                            >
                              <FormControl>
                                <SelectTrigger className="border-gray-300 focus:ring-[#4da34c] focus:border-[#4da34c]">
                                  <SelectValue placeholder="OS 타입 선택" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="ios">iOS</SelectItem>
                                <SelectItem value="android">Android</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {form.watch("supportedOsType") && (
                        <div className="mt-4">
                          <PrivateFileUpload
                            directory={`movies/signatures/${form.watch("supportedOsType")}`}
                            entityType="movie"
                            entityId={initialData?.id || -1}
                            usageType="signature"
                            onUploadComplete={handleSignatureUploadComplete}
                          />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

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
                    onClick={() => setActiveTab("publishing")}
                    className="px-6 bg-[#4da34c] hover:bg-[#3d8c3c]"
                  >
                    다음: 게시 설정
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            </div>

            {/* 게시 설정 탭 */}
            <div className={activeTab === "publishing" ? "block" : "hidden"}>
              <div className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  {/* 표시 유형 카드 */}
                  <Card className="border border-gray-200 shadow-sm">
                    <CardHeader className="p-4 pb-2">
                      <CardTitle className="text-base font-medium flex items-center">
                        <Settings className="h-4 w-4 mr-2 text-[#ff6246]" />
                        표시 유형 <span className="text-red-500 ml-1">*</span>
                      </CardTitle>
                      <CardDescription>영화의 표시 방식을 선택해주세요</CardDescription>
                    </CardHeader>
                    <CardContent className="p-4">
                      <div className="grid grid-cols-1 gap-2">
                        {VISIBILITY_TYPES.map((type) => (
                          <div
                            key={type.value}
                            className={`flex items-center space-x-2 hover:bg-gray-50 p-2 rounded-md border ${form.watch("visibilityType") === type.value ? 'border-[#4da34c] bg-[#f5fbf5]' : 'border-transparent'}`}
                          >
                            <input
                              type="radio"
                              id={`visibility-${type.value}`}
                              name="visibilityType"
                              value={type.value}
                              className="form-radio h-4 w-4 text-[#4da34c]"
                              checked={type.value === form.watch("visibilityType")}
                              onChange={() => form.setValue("visibilityType", type.value as "always" | "period" | "hidden")}
                            />
                            <Label
                              htmlFor={`visibility-${type.value}`}
                              className="text-sm cursor-pointer w-full"
                            >
                              {type.label}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* 공개 여부 카드 */}
                  <Card className="border border-gray-200 shadow-sm">
                    <CardHeader className="p-4 pb-2">
                      <CardTitle className="text-base font-medium flex items-center">
                        <Globe className="h-4 w-4 mr-2 text-[#ff6246]" />
                        공개 여부 <span className="text-red-500 ml-1">*</span>
                      </CardTitle>
                      <CardDescription>영화의 공개 상태를 선택해주세요</CardDescription>
                    </CardHeader>
                    <CardContent className="p-4">
                      <div className="grid grid-cols-1 gap-2">
                        {PUBLIC_OPTIONS.map((option) => (
                          <div
                            key={option.value}
                            className={`flex items-center space-x-2 hover:bg-gray-50 p-2 rounded-md border ${String(form.watch("isPublic")) === option.value ? 'border-[#4da34c] bg-[#f5fbf5]' : 'border-transparent'}`}
                          >
                            <input
                              type="radio"
                              id={`public-${option.value}`}
                              name="isPublic"
                              value={option.value}
                              className="form-radio h-4 w-4 text-[#4da34c]"
                              checked={String(form.watch("isPublic")) === option.value}
                              onChange={() => form.setValue("isPublic", option.value === "true")}
                            />
                            <Label
                              htmlFor={`public-${option.value}`}
                              className="text-sm cursor-pointer w-full"
                            >
                              {option.label}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* 기간 지정 필드 */}
                {showPeriodFields && (
                  <Card className="border border-gray-200 shadow-sm">
                    <CardHeader className="p-4 pb-2">
                      <CardTitle className="text-base font-medium flex items-center">
                        <Calendar className="h-4 w-4 mr-2 text-[#ff6246]" />
                        기간 설정
                      </CardTitle>
                      <CardDescription>표시 기간을 설정해주세요</CardDescription>
                    </CardHeader>
                    <CardContent className="p-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        {/* 시작일 */}
                        <FormField
                          control={form.control}
                          name="startAt"
                          render={({ field }) => {
                            const date = field.value ? new Date(field.value) : new Date();

                            return (
                              <FormItem className="flex flex-col">
                                <FormLabel className="text-sm font-medium">시작일시</FormLabel>
                                <div className="grid grid-cols-2 gap-2">
                                  <Input
                                    type="date"
                                    value={date.toISOString().split('T')[0]}
                                    onChange={(e) => {
                                      const newDate = new Date(date);
                                      const [year, month, day] = e.target.value.split('-').map(Number);
                                      newDate.setFullYear(year, month - 1, day);
                                      field.onChange(newDate.toISOString());
                                    }}
                                    className="border-gray-300 focus:ring-[#4da34c] focus:border-[#4da34c]"
                                  />
                                  <Input
                                    type="time"
                                    value={`${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`}
                                    onChange={(e) => {
                                      const [hours, minutes] = e.target.value.split(':').map(Number);
                                      const newDate = new Date(date);
                                      newDate.setHours(hours, minutes);
                                      field.onChange(newDate.toISOString());
                                    }}
                                    className="border-gray-300 focus:ring-[#4da34c] focus:border-[#4da34c]"
                                  />
                                </div>
                                <FormMessage />
                              </FormItem>
                            );
                          }}
                        />

                        {/* 종료일 */}
                        <FormField
                          control={form.control}
                          name="endAt"
                          render={({ field }) => {
                            const date = field.value ? new Date(field.value) : new Date();
                            if (!field.value) {
                              date.setHours(23, 59, 0, 0);
                            }

                            return (
                              <FormItem className="flex flex-col">
                                <FormLabel className="text-sm font-medium">종료일시</FormLabel>
                                <div className="grid grid-cols-2 gap-2">
                                  <Input
                                    type="date"
                                    value={date.toISOString().split('T')[0]}
                                    onChange={(e) => {
                                      const newDate = new Date(date);
                                      const [year, month, day] = e.target.value.split('-').map(Number);
                                      newDate.setFullYear(year, month - 1, day);
                                      field.onChange(newDate.toISOString());
                                    }}
                                    className="border-gray-300 focus:ring-[#4da34c] focus:border-[#4da34c]"
                                  />
                                  <Input
                                    type="time"
                                    value={`${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`}
                                    onChange={(e) => {
                                      const [hours, minutes] = e.target.value.split(':').map(Number);
                                      const newDate = new Date(date);
                                      newDate.setHours(hours, minutes);
                                      field.onChange(newDate.toISOString());
                                    }}
                                    className="border-gray-300 focus:ring-[#4da34c] focus:border-[#4da34c]"
                                  />
                                </div>
                                <FormMessage />
                              </FormItem>
                            );
                          }}
                        />
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* 게시 상태 */}
                <Card className="border border-gray-200 shadow-sm">
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-base font-medium flex items-center">
                      <Settings className="h-4 w-4 mr-2 text-[#ff6246]" />
                      게시 상태
                    </CardTitle>
                    <CardDescription>현재 게시 상태를 선택해주세요</CardDescription>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="grid grid-cols-3 gap-2">
                      {PUBLISHING_STATUSES.map((status) => (
                        <div
                          key={status.value}
                          className={`flex items-center space-x-2 hover:bg-gray-50 p-2 rounded-md border ${form.watch("publishingStatus") === status.value ? 'border-[#4da34c] bg-[#f5fbf5]' : 'border-transparent'}`}
                        >
                          <input
                            type="radio"
                            id={`status-${status.value}`}
                            name="publishingStatus"
                            value={status.value}
                            className="form-radio h-4 w-4 text-[#4da34c]"
                            checked={status.value === form.watch("publishingStatus")}
                            onChange={() => form.setValue("publishingStatus", status.value)}
                          />
                          <Label
                            htmlFor={`status-${status.value}`}
                            className="text-sm cursor-pointer w-full"
                          >
                            {status.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

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
                      onClick={() => router.push("/movies")}
                      className="border-gray-300 hover:bg-[#fff5f3] hover:text-[#ff6246] hover:border-[#ff6246]"
                    >
                      취소
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="bg-[#4da34c] hover:bg-[#3d8c3c]"
                    >
                      {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {initialData ? "영화 수정" : "영화 등록"}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
