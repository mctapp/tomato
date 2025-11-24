
// app/voiceartists/[id]/edit/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { toast } from "sonner";

import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  AlertCircle,
  ArrowLeft,
  Save,
  UserCog,
  Star
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { 
  useVoiceArtist, 
  useUpdateVoiceArtist
} from "@/hooks/useVoiceArtists";
import { VoiceArtist, VoiceArtistExpertise } from "@/types/voiceartists";

// 성별 옵션
const GENDER_OPTIONS = [
  { value: "male", label: "남성" },
  { value: "female", label: "여성" },
  { value: "other", label: "기타" },
  { value: "prefer_not_to_say", label: "미표시" }
];

// 레벨 옵션 (1~9)
const LEVEL_OPTIONS = Array.from({ length: 9 }, (_, i) => ({
  value: i + 1,
  label: `Lv.${i + 1}`
}));

function EditVoiceArtistPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const artistId = parseInt(params.id, 10);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // 성우 데이터 조회
  const { data: artist, isLoading, isError, error } = useVoiceArtist(artistId);
  
  // 뮤테이션 훅
  const updateArtistMutation = useUpdateVoiceArtist(artistId);
  
  // 폼 설정
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
    setValue,
    watch
  } = useForm({
    defaultValues: {
      voiceartistName: "",
      voiceartistGender: "prefer_not_to_say",
      voiceartistLocation: "",
      voiceartistLevel: 1,
      voiceartistPhone: "",
      voiceartistEmail: "",
      voiceartistMemo: ""
    }
  });
  
  // 디버깅을 위한 현재 폼 값 감시
  const currentValues = watch();
  
  // 성우 데이터로 폼 초기화
  useEffect(() => {
    if (artist) {
      console.log("Artist data received:", artist);
      
      // 데이터가 null이거나 undefined인 경우 기본값으로 처리
      reset({
        voiceartistName: artist.voiceartistName || "",
        voiceartistGender: artist.voiceartistGender || "prefer_not_to_say",
        voiceartistLocation: artist.voiceartistLocation || "",
        voiceartistLevel: artist.voiceartistLevel || 1,
        voiceartistPhone: artist.voiceartistPhone || "",
        voiceartistEmail: artist.voiceartistEmail || "",
        voiceartistMemo: artist.voiceartistMemo || ""
      });
      
      // 명시적으로 각 필드 설정
      setValue("voiceartistName", artist.voiceartistName || "");
      setValue("voiceartistGender", artist.voiceartistGender || "prefer_not_to_say");
      setValue("voiceartistLocation", artist.voiceartistLocation || "");
      setValue("voiceartistLevel", artist.voiceartistLevel || 1);
      setValue("voiceartistPhone", artist.voiceartistPhone || "");
      setValue("voiceartistEmail", artist.voiceartistEmail || "");
      setValue("voiceartistMemo", artist.voiceartistMemo || "");
      
      console.log("Form reset with data");
    }
  }, [artist, reset, setValue]);
  
  // 디버깅: 폼 값 변경 시 로그
  useEffect(() => {
    console.log("Current form values:", currentValues);
  }, [currentValues]);
  
  // 폼 제출 핸들러
  const onSubmit = async (data: any) => {
    setIsSubmitting(true);
    setErrorMessage(null);
    
    try {
      // 준비된 데이터
      const updateData = {
        voiceartistName: data.voiceartistName,
        voiceartistGender: data.voiceartistGender,
        voiceartistLocation: data.voiceartistLocation,
        voiceartistLevel: data.voiceartistLevel ? parseInt(data.voiceartistLevel.toString()) : 1,
        voiceartistPhone: data.voiceartistPhone,
        voiceartistEmail: data.voiceartistEmail,
        voiceartistMemo: data.voiceartistMemo
      };
      
      console.log("Update data:", updateData);
      
      // 성우 정보 업데이트
      await updateArtistMutation.mutateAsync(updateData);
      
      toast.success("성우 정보가 성공적으로 업데이트되었습니다.");
      router.push(`/voiceartists/${artistId}`);
      
    } catch (error) {
      console.error("Error updating voice artist:", error);
      const errorMsg = error instanceof Error 
        ? error.message 
        : "성우 정보 업데이트 중 오류가 발생했습니다.";
      setErrorMessage(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // 로딩 중 상태
  if (isLoading) {
    return (
      <div className="max-w-[1200px] mx-auto py-10">
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }
  
  // 오류 상태
  if (isError || !artist) {
    console.error("Error fetching artist:", error);
    return (
      <div className="max-w-[1200px] mx-auto py-10">
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            성우 정보를 불러오는 중 오류가 발생했습니다.
            {error instanceof Error ? ` (${error.message})` : ''}
          </AlertDescription>
        </Alert>
        <Button 
          onClick={() => router.push('/voiceartists')}
          variant="outline"
        >
          목록으로 돌아가기
        </Button>
      </div>
    );
  }
  
  return (
    <div className="max-w-[1200px] mx-auto py-10">
      <Card className="border border-gray-300 shadow-lg rounded-xl">
        <CardHeader className="p-6 bg-white">
          <CardTitle className="text-xl font-bold text-[#333333] flex items-center">
            <UserCog className="h-5 w-5 mr-2 text-[#4da34c]" />
            성우 정보 수정
          </CardTitle>
          <CardDescription>
            {artist.voiceartistName}님의 정보를 수정합니다.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="p-6">
          {errorMessage && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}
          
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 이름 */}
              <div className="space-y-2">
                <Label htmlFor="voiceartistName" className="text-sm font-medium">
                  성우 이름 <span className="text-red-500 ml-1">*</span>
                </Label>
                <Input
                  id="voiceartistName"
                  {...register("voiceartistName", { 
                    required: "성우 이름은 필수입니다",
                    maxLength: {
                      value: 100,
                      message: "성우 이름은 100자를 초과할 수 없습니다"
                    }
                  })}
                  className="border-gray-300"
                  defaultValue={artist.voiceartistName || ""}
                />
                {errors.voiceartistName && (
                  <p className="text-sm text-red-500">
                    {String(errors.voiceartistName.message)}
                  </p>
                )}
              </div>
              
              {/* 성별 */}
              <div className="space-y-2">
                <Label htmlFor="voiceartistGender" className="text-sm font-medium">
                  성별
                </Label>
                <Controller
                  name="voiceartistGender"
                  control={control}
                  defaultValue={artist.voiceartistGender || "prefer_not_to_say"}
                  render={({ field }) => (
                    <Select
                      value={field.value || "prefer_not_to_say"}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger className="border-gray-300">
                        <SelectValue placeholder="성별 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        {GENDER_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              
              {/* 레벨 */}
              <div className="space-y-2">
                <Label htmlFor="voiceartistLevel" className="text-sm font-medium">
                  레벨
                </Label>
                <Controller
                  name="voiceartistLevel"
                  control={control}
                  defaultValue={artist.voiceartistLevel || 1}
                  render={({ field }) => (
                    <Select
                      value={(field.value || 1).toString()}
                      onValueChange={(value) => field.onChange(parseInt(value))}
                    >
                      <SelectTrigger className="border-gray-300">
                        <SelectValue placeholder="레벨 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        {LEVEL_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value.toString()}>
                            <div className="flex items-center">
                              <span>{option.label}</span>
                              {option.value >= 7 && (
                                <Star className="ml-1 h-3.5 w-3.5 text-purple-500 fill-purple-500" />
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              
              {/* 지역 */}
              <div className="space-y-2">
                <Label htmlFor="voiceartistLocation" className="text-sm font-medium">
                  거주 지역
                </Label>
                <Input
                  id="voiceartistLocation"
                  {...register("voiceartistLocation", {
                    maxLength: {
                      value: 100,
                      message: "거주 지역은 100자를 초과할 수 없습니다"
                    }
                  })}
                  className="border-gray-300"
                  defaultValue={artist.voiceartistLocation || ""}
                />
                {errors.voiceartistLocation && (
                  <p className="text-sm text-red-500">
                    {String(errors.voiceartistLocation.message)}
                  </p>
                )}
              </div>
              
              {/* 연락처 */}
              <div className="space-y-2">
                <Label htmlFor="voiceartistPhone" className="text-sm font-medium">
                  연락처
                </Label>
                <Input
                  id="voiceartistPhone"
                  type="tel"
                  {...register("voiceartistPhone", {
                    maxLength: {
                      value: 50,
                      message: "연락처는 50자를 초과할 수 없습니다"
                    }
                  })}
                  className="border-gray-300"
                  defaultValue={artist.voiceartistPhone || ""}
                />
                {errors.voiceartistPhone && (
                  <p className="text-sm text-red-500">
                    {String(errors.voiceartistPhone.message)}
                  </p>
                )}
              </div>
              
              {/* 이메일 */}
              <div className="space-y-2">
                <Label htmlFor="voiceartistEmail" className="text-sm font-medium">
                  이메일
                </Label>
                <Input
                  id="voiceartistEmail"
                  type="email"
                  {...register("voiceartistEmail", {
                    maxLength: {
                      value: 255,
                      message: "이메일은 255자를 초과할 수 없습니다"
                    },
                    pattern: {
                      value: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
                      message: "유효한 이메일 주소를 입력하세요"
                    }
                  })}
                  className="border-gray-300"
                  defaultValue={artist.voiceartistEmail || ""}
                />
                {errors.voiceartistEmail && (
                  <p className="text-sm text-red-500">
                    {String(errors.voiceartistEmail.message)}
                  </p>
                )}
              </div>
            </div>
            
            {/* 메모 */}
            <div className="space-y-2">
              <Label htmlFor="voiceartistMemo" className="text-sm font-medium">
                메모
              </Label>
              <Textarea
                id="voiceartistMemo"
                {...register("voiceartistMemo")}
                className="border-gray-300"
                rows={4}
                defaultValue={artist.voiceartistMemo || ""}
              />
            </div>
            
            {/* 버튼 영역 */}
            <div className="pt-6 flex justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push(`/voiceartists/${artistId}`)}
                className="px-6"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                뒤로
              </Button>
              
              <div className="space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push(`/voiceartists/${artistId}`)}
                  className="border-gray-300 hover:bg-[#fff5f3] hover:text-[#ff6246] hover:border-[#ff6246]"
                >
                  취소
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-[#4da34c] hover:bg-[#3d8c3c]"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      처리 중...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      저장
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
      
      {/* 디버깅 정보 (개발 시에만 표시) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-8 p-4 bg-gray-100 rounded-lg">
          <h3 className="text-sm font-bold mb-2">디버깅 정보:</h3>
          <pre className="text-xs overflow-auto max-h-[300px]">
            {JSON.stringify({artist, currentFormValues: currentValues}, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

export default function ProtectedEditVoiceArtistPage({ params }: { params: { id: string } }) {
  return (
    <ProtectedRoute>
      <EditVoiceArtistPage params={params} />
    </ProtectedRoute>
  );
}
