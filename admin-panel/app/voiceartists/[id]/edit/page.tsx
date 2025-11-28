
// app/voiceartists/[id]/edit/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  AlertCircle,
  ArrowLeft,
  Save,
  UserCog,
  Star,
  Upload,
  Camera,
  X
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import {
  useVoiceArtist,
  useUpdateVoiceArtist,
  useUploadVoiceArtistProfileImage
} from "@/hooks/useVoiceArtists";
import { VoiceArtist, VoiceArtistExpertise } from "@/types/voiceartists";

// 성별 옵션 (남/여만)
const GENDER_OPTIONS = [
  { value: "male", label: "남성" },
  { value: "female", label: "여성" }
];

// 레벨 옵션 (1~9)
const LEVEL_OPTIONS = Array.from({ length: 9 }, (_, i) => ({
  value: i + 1,
  label: `Lv.${i + 1}`
}));

function EditVoiceArtistPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const artistId = parseInt(params.id, 10);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isFormReady, setIsFormReady] = useState(false);

  // 프로필 이미지 관련 상태
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageChanged, setImageChanged] = useState(false);

  // 성우 데이터 조회
  const { data: artist, isLoading, isError, error, refetch } = useVoiceArtist(artistId);

  // 뮤테이션 훅
  const updateArtistMutation = useUpdateVoiceArtist(artistId);
  const uploadImageMutation = useUploadVoiceArtistProfileImage(artistId);

  // 이미지 업로드 핸들러
  const handleImageUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      // 유효성 검사: 이미지 파일 타입
      const validImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/jpg'];
      if (!validImageTypes.includes(file.type)) {
        setErrorMessage("이미지 파일만 업로드 가능합니다. (JPEG, PNG, GIF)");
        return;
      }

      // 유효성 검사: 파일 크기 (5MB 제한)
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        setErrorMessage("파일 크기가 너무 큽니다. 최대 5MB까지 업로드 가능합니다.");
        return;
      }

      // 미리보기 URL 생성
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
      setUploadedImage(file);
      setImageChanged(true);
      setErrorMessage(null);
    },
    []
  );

  // 이미지 제거 핸들러
  const handleRemoveImage = useCallback(() => {
    if (previewUrl && uploadedImage) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setUploadedImage(null);
    setImageChanged(true);
  }, [previewUrl, uploadedImage]);

  // 이미지 복원 핸들러 (원래 이미지로 복원)
  const handleRestoreImage = useCallback(() => {
    if (previewUrl && uploadedImage) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setUploadedImage(null);
    setImageChanged(false);
  }, [previewUrl, uploadedImage]);
  
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
    if (artist && !isFormReady) {
      console.log("Artist data received:", artist);

      // 성별 기본값: 남/여 중 하나가 아니면 male로 설정
      const gender = (artist.voiceartistGender === "male" || artist.voiceartistGender === "female")
        ? artist.voiceartistGender
        : "male";

      // 데이터가 null이거나 undefined인 경우 기본값으로 처리
      const formData = {
        voiceartistName: artist.voiceartistName || "",
        voiceartistGender: gender,
        voiceartistLocation: artist.voiceartistLocation || "",
        voiceartistLevel: artist.voiceartistLevel || 1,
        voiceartistPhone: artist.voiceartistPhone || "",
        voiceartistEmail: artist.voiceartistEmail || "",
        voiceartistMemo: artist.voiceartistMemo || ""
      };

      reset(formData);
      setIsFormReady(true);
      console.log("Form initialized with data:", formData);
    }
  }, [artist, reset, isFormReady]);
  
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

      // 이미지가 변경된 경우에만 업로드
      console.log("Image state check:", { imageChanged, hasUploadedImage: !!uploadedImage });

      if (imageChanged && uploadedImage) {
        console.log("Starting image upload...", uploadedImage.name);
        try {
          const uploadResult = await uploadImageMutation.mutateAsync(uploadedImage);
          console.log("Profile image uploaded successfully:", uploadResult);
        } catch (uploadError) {
          console.error("Profile image upload error:", uploadError);
          toast.error("성우 정보는 업데이트되었으나, 프로필 이미지 업로드에 실패했습니다.");
        }
      }

      // 캐시 무효화 후 새 데이터 가져오기
      console.log("Invalidating cache...");
      await queryClient.invalidateQueries({ queryKey: ['voiceArtist', artistId] });
      await queryClient.invalidateQueries({ queryKey: ['voiceArtists'] });

      // 새 데이터 강제로 다시 가져오기
      await refetch();
      console.log("Cache invalidated and refetched");

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
            {/* 프로필 이미지 섹션 */}
            <div className="flex flex-col items-center sm:flex-row sm:items-start gap-6 p-6 bg-gradient-to-r from-gray-50 to-white rounded-xl border border-gray-100">
              {/* 프로필 이미지 */}
              <div className="relative group">
                <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-lg bg-gray-100">
                  {/* 새로 업로드한 이미지가 있으면 보여주고, 없으면 기존 이미지 또는 기본 아바타 표시 */}
                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      alt="새 프로필 이미지 미리보기"
                      className="w-full h-full object-cover"
                    />
                  ) : imageChanged && !uploadedImage ? (
                    // 이미지 제거됨 상태
                    <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-400">
                      <span className="text-3xl font-medium">
                        {artist.voiceartistName?.slice(0, 2) || "?"}
                      </span>
                    </div>
                  ) : artist.profileImage ? (
                    <img
                      src={artist.profileImage}
                      alt={artist.voiceartistName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#4da34c] to-[#3d8c3c] text-white">
                      <span className="text-3xl font-medium">
                        {artist.voiceartistName?.slice(0, 2) || "?"}
                      </span>
                    </div>
                  )}
                </div>

                {/* 호버 시 카메라 오버레이 */}
                <label
                  htmlFor="profileImageInput"
                  className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                >
                  <Camera className="w-8 h-8 text-white" />
                </label>
                <input
                  id="profileImageInput"
                  type="file"
                  accept="image/jpeg,image/png,image/gif"
                  className="hidden"
                  onChange={handleImageUpload}
                />

                {/* 이미지 상태 배지 */}
                {imageChanged && (
                  <div className="absolute -bottom-1 -right-1 bg-amber-500 text-white text-xs px-2 py-0.5 rounded-full shadow">
                    변경됨
                  </div>
                )}
              </div>

              {/* 이미지 컨트롤 영역 */}
              <div className="flex flex-col justify-center gap-3 text-center sm:text-left">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">프로필 이미지</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    JPG, PNG, GIF 형식 (최대 5MB)
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                  <label
                    htmlFor="profileImageInput2"
                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-[#4da34c] bg-white border border-[#4da34c] rounded-lg hover:bg-[#f5fbf5] cursor-pointer transition-colors"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {artist.profileImage || previewUrl ? "이미지 변경" : "이미지 업로드"}
                  </label>
                  <input
                    id="profileImageInput2"
                    type="file"
                    accept="image/jpeg,image/png,image/gif"
                    className="hidden"
                    onChange={handleImageUpload}
                  />

                  {/* 이미지 제거 버튼 (현재 이미지가 있거나 새 이미지가 있는 경우에만 표시) */}
                  {(artist.profileImage || previewUrl) && !imageChanged && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleRemoveImage}
                      className="text-red-500 border-red-300 hover:bg-red-50 hover:text-red-600"
                    >
                      <X className="w-4 h-4 mr-1" />
                      제거
                    </Button>
                  )}

                  {/* 새 이미지가 있는 경우 제거 버튼 */}
                  {imageChanged && previewUrl && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleRemoveImage}
                      className="text-red-500 border-red-300 hover:bg-red-50 hover:text-red-600"
                    >
                      <X className="w-4 h-4 mr-1" />
                      제거
                    </Button>
                  )}

                  {/* 복원 버튼 (이미지가 변경된 경우에만 표시) */}
                  {imageChanged && artist.profileImage && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleRestoreImage}
                      className="text-gray-600 border-gray-300 hover:bg-gray-50"
                    >
                      원래대로
                    </Button>
                  )}
                </div>

                {/* 업로드된 파일 정보 */}
                {uploadedImage && (
                  <p className="text-xs text-gray-500">
                    {uploadedImage.name} ({Math.round(uploadedImage.size / 1024)} KB)
                  </p>
                )}
              </div>
            </div>

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
              
              {/* 성별 - 라디오 버튼 */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  성별
                </Label>
                <Controller
                  name="voiceartistGender"
                  control={control}
                  render={({ field }) => (
                    <RadioGroup
                      value={field.value || "male"}
                      onValueChange={field.onChange}
                      className="flex gap-6 pt-2"
                    >
                      {GENDER_OPTIONS.map((option) => (
                        <div key={option.value} className="flex items-center space-x-2">
                          <RadioGroupItem
                            value={option.value}
                            id={`gender-${option.value}`}
                            className="border-gray-400 text-[#4da34c] focus:ring-[#4da34c]"
                          />
                          <Label
                            htmlFor={`gender-${option.value}`}
                            className="text-sm font-normal cursor-pointer"
                          >
                            {option.label}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
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
