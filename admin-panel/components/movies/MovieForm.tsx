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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../ui/form";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Loader2, Calendar } from "lucide-react";
import { format } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Calendar as CalendarComponent } from "../ui/calendar";
import { toast } from "sonner";

interface MovieFormProps {
  initialData?: Movie;
  distributors?: DistributorSimple[];
  onSubmit?: (data: any) => void;
}

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
      
      // API 요청 데이터 준비
      const movieData = {
        ...data,
        posterFileId: posterId
      };
      
      // 신규 생성 또는 수정 API 호출
      const url = initialData 
        ? `/admin/api/movies/${initialData.id}` 
        : "/admin/api/movies";
      
      const method = initialData ? "PUT" : "POST";
      
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(movieData),
      });
      
      if (!response.ok) {
        throw new Error(`영화 ${initialData ? '수정' : '생성'} 중 오류가 발생했습니다.`);
      }
      
      const savedMovie = await response.json();
      
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
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <Tabs defaultValue="basic" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">기본 정보</TabsTrigger>
            <TabsTrigger value="media">미디어 파일</TabsTrigger>
            <TabsTrigger value="publishing">게시 설정</TabsTrigger>
          </TabsList>
          
          {/* 기본 정보 탭 */}
          <TabsContent value="basic" className="space-y-4 mt-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* 제목 필드 */}
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>영화 제목 *</FormLabel>
                    <FormControl>
                      <Input placeholder="영화 제목" {...field} />
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
                    <FormLabel>감독</FormLabel>
                    <FormControl>
                      <Input placeholder="감독" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {/* 개봉일 필드 */}
              <FormField
                control={form.control}
                name="releaseDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>개봉일</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={`w-full pl-3 text-left font-normal ${!field.value ? "text-muted-foreground" : ""}`}
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
              
              {/* 장르 필드 - GenreSelector 컴포넌트 사용 */}
              <GenreSelector 
                control={form.control} 
                name="filmGenre" 
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {/* 등급 필드 */}
              <FormField
                control={form.control}
                name="filmRating"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>등급</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value || undefined}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="영화 등급 선택" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="전체관람가">전체관람가</SelectItem>
                        <SelectItem value="12세이상관람가">12세이상관람가</SelectItem>
                        <SelectItem value="15세이상관람가">15세이상관람가</SelectItem>
                        <SelectItem value="청소년관람불가">청소년관람불가</SelectItem>
                        <SelectItem value="제한상영가">제한상영가</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* 상영 시간 필드 */}
              <FormField
                control={form.control}
                name="runningTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>상영 시간 (분)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="상영 시간" 
                        {...field} 
                        value={field.value || ""} 
                        onChange={(e) => field.onChange(e.target.value === "" ? null : parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {/* 국가 필드 */}
              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>국가</FormLabel>
                    <FormControl>
                      <Input placeholder="국가" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* 배급사 선택 필드 */}
              <FormField
                control={form.control}
                name="distributorId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>배급사</FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(value === "none" ? null : parseInt(value))} 
                      defaultValue={field.value?.toString() || "none"}
                    >
                      <FormControl>
                        <SelectTrigger>
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

            {/* 로그라인 필드 */}
            <FormField
              control={form.control}
              name="logline"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>로그라인</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="영화 한 줄 요약" 
                      {...field} 
                      value={field.value || ""} 
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 관리자 메모 필드 */}
            <FormField
              control={form.control}
              name="adminMemo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>관리자 메모</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="관리자 메모" 
                      {...field} 
                      value={field.value || ""} 
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </TabsContent>
          
          {/* 미디어 파일 탭 */}
          <TabsContent value="media" className="space-y-4 mt-4">
            <div className="grid gap-6 md:grid-cols-2">
              {/* 포스터 이미지 업로드 */}
              <Card>
                <CardHeader>
                  <CardTitle>포스터 이미지</CardTitle>
                  <CardDescription>영화 포스터 이미지를 업로드하세요</CardDescription>
                </CardHeader>
                <CardContent>
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
              <Card>
                <CardHeader>
                  <CardTitle>시그니처 파일</CardTitle>
                  <CardDescription>사운드 동기화를 위한 시그니처 파일을 업로드하세요</CardDescription>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="supportedOsType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>OS 타입</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value || undefined}
                        >
                          <FormControl>
                            <SelectTrigger>
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
          </TabsContent>
          
          {/* 게시 설정 탭 */}
          <TabsContent value="publishing" className="space-y-4 mt-4">
            {/* 표시 유형 필드 */}
            <FormField
              control={form.control}
              name="visibilityType"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>표시 유형</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex flex-col space-y-1"
                    >
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="always" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          항상 표시
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="period" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          기간 지정
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="hidden" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          숨김
                        </FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 기간 지정 필드 (표시 유형이 'period'일 때만 표시) */}
            {showPeriodFields && (
              <div className="grid gap-4 md:grid-cols-2">
                {/* 시작일 필드 */}
                <FormField
                  control={form.control}
                  name="startAt"
                  render={({ field }) => {
                    const date = field.value ? new Date(field.value) : new Date();
                    
                    return (
                      <FormItem className="flex flex-col">
                        <FormLabel>시작일시</FormLabel>
                        <div className="space-y-2">
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
                            />
                          </div>
                        </div>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
                
                {/* 종료일 필드 - 동일한 방식 */}
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
                        <FormLabel>종료일시</FormLabel>
                        <div className="space-y-2">
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
                            />
                          </div>
                        </div>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
              </div>
            )}

            {/* 공개 여부 필드 */}
            <FormField
              control={form.control}
              name="isPublic"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>공개 여부</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={(value) => field.onChange(value === "true")}
                      defaultValue={field.value ? "true" : "false"}
                      className="flex flex-col space-y-1"
                    >
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="true" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          공개
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="false" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          비공개
                        </FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 게시 상태 필드 */}
            <FormField
              control={form.control}
              name="publishingStatus"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>게시 상태</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value || "draft"}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="게시 상태 선택" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="draft">초안</SelectItem>
                      <SelectItem value="published">게시됨</SelectItem>
                      <SelectItem value="archived">보관됨</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </TabsContent>
        </Tabs>

        {/* 제출 버튼 */}
        <div className="flex justify-end">
          <Button 
            type="button" 
            variant="outline" 
            className="mr-2"
            onClick={() => router.push("/movies")}
          >
            취소
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {initialData ? "영화 수정" : "영화 등록"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
