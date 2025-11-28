// app/voiceartists/[id]/edit/page.tsx
"use client";

import React, { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller, useFieldArray } from "react-hook-form";
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
import {
  AlertCircle,
  ArrowLeft,
  Save,
  UserCog,
  Star,
  Upload,
  Camera,
  X,
  Plus,
  Trash2
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

// 전문 영역 도메인 옵션
const DOMAIN_OPTIONS = [
  { value: "movie", label: "영화" },
  { value: "video", label: "영상물" },
  { value: "theater", label: "연극" },
  { value: "performance", label: "공연" },
  { value: "other", label: "기타" },
];

interface FormData {
  voiceartistName: string;
  voiceartistGender: string;
  voiceartistLocation: string;
  voiceartistLevel: number;
  voiceartistPhone: string;
  voiceartistEmail: string;
  voiceartistMemo: string;
  expertise: {
    domain: string;
    domainOther?: string;
    grade: number;
  }[];
}

function EditVoiceArtistPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const artistId = parseInt(params.id, 10);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

      const validImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/jpg'];
      if (!validImageTypes.includes(file.type)) {
        setErrorMessage("이미지 파일만 업로드 가능합니다. (JPEG, PNG, GIF)");
        return;
      }

      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        setErrorMessage("파일 크기가 너무 큽니다. 최대 5MB까지 업로드 가능합니다.");
        return;
      }

      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
      setUploadedImage(file);
      setImageChanged(true);
      setErrorMessage(null);
    },
    []
  );

  const handleRemoveImage = useCallback(() => {
    if (previewUrl && uploadedImage) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setUploadedImage(null);
    setImageChanged(true);
  }, [previewUrl, uploadedImage]);

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
  } = useForm<FormData>({
    defaultValues: {
      voiceartistName: "",
      voiceartistGender: "male",
      voiceartistLocation: "",
      voiceartistLevel: 1,
      voiceartistPhone: "",
      voiceartistEmail: "",
      voiceartistMemo: "",
      expertise: [{ domain: "movie", grade: 5 }]
    }
  });

  // artist 데이터가 로드되면 폼 리셋
  useEffect(() => {
    if (artist) {
      // 디버깅: API 응답 확인
      console.log("=== Artist data from API ===");
      console.log("Full artist object:", artist);
      console.log("Keys:", Object.keys(artist));
      console.log("voiceartistName:", artist.voiceartistName);
      console.log("voiceartist_name:", (artist as any).voiceartist_name);

      // API가 snake_case로 반환할 경우 대비
      const artistData = artist as any;
      const name = artist.voiceartistName || artistData.voiceartist_name || "";
      const gender = artist.voiceartistGender || artistData.voiceartist_gender || "male";
      const location = artist.voiceartistLocation || artistData.voiceartist_location || "";
      const level = artist.voiceartistLevel || artistData.voiceartist_level || 1;
      const phone = artist.voiceartistPhone || artistData.voiceartist_phone || "";
      const email = artist.voiceartistEmail || artistData.voiceartist_email || "";
      const memo = artist.voiceartistMemo || artistData.voiceartist_memo || "";

      const validGender = (gender === "male" || gender === "female") ? gender : "male";

      // expertise 데이터 변환 (snake_case 대응)
      const expertiseData = artist.expertise && artist.expertise.length > 0
        ? artist.expertise.map((exp: any) => ({
            domain: exp.domain || "movie",
            domainOther: exp.domainOther || exp.domain_other || "",
            grade: exp.grade || 5
          }))
        : [{ domain: "movie", grade: 5 }];

      const formData = {
        voiceartistName: name,
        voiceartistGender: validGender,
        voiceartistLocation: location,
        voiceartistLevel: level,
        voiceartistPhone: phone,
        voiceartistEmail: email,
        voiceartistMemo: memo,
        expertise: expertiseData
      };

      console.log("=== Form data to reset ===");
      console.log(formData);

      reset(formData);
    }
  }, [artist, reset]);

  // 전문 영역 필드 배열
  const { fields, append, remove } = useFieldArray({
    control,
    name: "expertise"
  });

  const watchedExpertise = watch("expertise");
  const watchedGender = watch("voiceartistGender");

  // 전문 영역 추가
  const handleAddExpertise = () => {
    if (fields.length >= 5) {
      toast.error("전문 영역은 최대 5개까지 추가할 수 있습니다.");
      return;
    }
    append({ domain: "movie", grade: 5 });
  };

  // 폼 제출 핸들러
  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const updateData = {
        voiceartistName: data.voiceartistName,
        voiceartistGender: data.voiceartistGender,
        voiceartistLocation: data.voiceartistLocation,
        voiceartistLevel: data.voiceartistLevel ? parseInt(data.voiceartistLevel.toString()) : 1,
        voiceartistPhone: data.voiceartistPhone,
        voiceartistEmail: data.voiceartistEmail,
        voiceartistMemo: data.voiceartistMemo,
        expertise: data.expertise
      };

      console.log("Update data:", updateData);
      await updateArtistMutation.mutateAsync(updateData);

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

      console.log("Invalidating cache...");
      await queryClient.invalidateQueries({ queryKey: ['voiceArtist', artistId] });
      await queryClient.invalidateQueries({ queryKey: ['voiceArtists'] });
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

  if (isLoading) {
    return (
      <div className="max-w-[1200px] mx-auto py-10">
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (isError || !artist) {
    return (
      <div className="max-w-[1200px] mx-auto py-10">
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            성우 정보를 불러오는 중 오류가 발생했습니다.
            {error instanceof Error ? ` (${error.message})` : ''}
          </AlertDescription>
        </Alert>
        <Button onClick={() => router.push('/voiceartists')} variant="outline">
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
              <div className="relative group">
                <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-lg bg-gray-100">
                  {previewUrl ? (
                    <img src={previewUrl} alt="새 프로필 이미지 미리보기" className="w-full h-full object-cover" />
                  ) : imageChanged && !uploadedImage ? (
                    <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-400">
                      <span className="text-3xl font-medium">{artist.voiceartistName?.slice(0, 2) || "?"}</span>
                    </div>
                  ) : artist.profileImage ? (
                    <img src={artist.profileImage} alt={artist.voiceartistName} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#4da34c] to-[#3d8c3c] text-white">
                      <span className="text-3xl font-medium">{artist.voiceartistName?.slice(0, 2) || "?"}</span>
                    </div>
                  )}
                </div>
                <label htmlFor="profileImageInput" className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                  <Camera className="w-8 h-8 text-white" />
                </label>
                <input id="profileImageInput" type="file" accept="image/jpeg,image/png,image/gif" className="hidden" onChange={handleImageUpload} />
                {imageChanged && (
                  <div className="absolute -bottom-1 -right-1 bg-amber-500 text-white text-xs px-2 py-0.5 rounded-full shadow">변경됨</div>
                )}
              </div>

              <div className="flex flex-col justify-center gap-3 text-center sm:text-left">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">프로필 이미지</h3>
                  <p className="text-sm text-gray-500 mt-1">JPG, PNG, GIF 형식 (최대 5MB)</p>
                </div>
                <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                  <label htmlFor="profileImageInput2" className="inline-flex items-center px-4 py-2 text-sm font-medium text-[#4da34c] bg-white border border-[#4da34c] rounded-lg hover:bg-[#f5fbf5] cursor-pointer transition-colors">
                    <Upload className="w-4 h-4 mr-2" />
                    {artist.profileImage || previewUrl ? "이미지 변경" : "이미지 업로드"}
                  </label>
                  <input id="profileImageInput2" type="file" accept="image/jpeg,image/png,image/gif" className="hidden" onChange={handleImageUpload} />
                  {(artist.profileImage || previewUrl) && !imageChanged && (
                    <Button type="button" variant="outline" size="sm" onClick={handleRemoveImage} className="text-red-500 border-red-300 hover:bg-red-50 hover:text-red-600">
                      <X className="w-4 h-4 mr-1" />제거
                    </Button>
                  )}
                  {imageChanged && previewUrl && (
                    <Button type="button" variant="outline" size="sm" onClick={handleRemoveImage} className="text-red-500 border-red-300 hover:bg-red-50 hover:text-red-600">
                      <X className="w-4 h-4 mr-1" />제거
                    </Button>
                  )}
                  {imageChanged && artist.profileImage && (
                    <Button type="button" variant="outline" size="sm" onClick={handleRestoreImage} className="text-gray-600 border-gray-300 hover:bg-gray-50">
                      원래대로
                    </Button>
                  )}
                </div>
                {uploadedImage && (
                  <p className="text-xs text-gray-500">{uploadedImage.name} ({Math.round(uploadedImage.size / 1024)} KB)</p>
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
                    maxLength: { value: 100, message: "성우 이름은 100자를 초과할 수 없습니다" }
                  })}
                  className="border-gray-300"
                />
                {errors.voiceartistName && (
                  <p className="text-sm text-red-500">{String(errors.voiceartistName.message)}</p>
                )}
              </div>

              {/* 성별 - accessmedia 스타일 라디오 버튼 */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">성별</Label>
                <div className="flex gap-4">
                  {GENDER_OPTIONS.map((option) => (
                    <div
                      key={option.value}
                      className={`flex items-center space-x-2 hover:bg-gray-50 p-2 rounded-md border cursor-pointer ${
                        watchedGender === option.value ? 'border-[#4da34c] bg-[#f5fbf5]' : 'border-gray-200'
                      }`}
                      onClick={() => setValue("voiceartistGender", option.value)}
                    >
                      <input
                        type="radio"
                        id={`gender-${option.value}`}
                        name="voiceartistGender"
                        value={option.value}
                        className="form-radio h-4 w-4 text-[#4da34c]"
                        checked={watchedGender === option.value}
                        onChange={() => setValue("voiceartistGender", option.value)}
                      />
                      <Label htmlFor={`gender-${option.value}`} className="text-sm cursor-pointer">
                        {option.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* 레벨 */}
              <div className="space-y-2">
                <Label htmlFor="voiceartistLevel" className="text-sm font-medium">레벨</Label>
                <Controller
                  name="voiceartistLevel"
                  control={control}
                  render={({ field }) => (
                    <Select value={(field.value || 1).toString()} onValueChange={(value) => field.onChange(parseInt(value))}>
                      <SelectTrigger className="border-gray-300">
                        <SelectValue placeholder="레벨 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        {LEVEL_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value.toString()}>
                            <div className="flex items-center">
                              <span>{option.label}</span>
                              {option.value >= 7 && <Star className="ml-1 h-3.5 w-3.5 text-purple-500 fill-purple-500" />}
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
                <Label htmlFor="voiceartistLocation" className="text-sm font-medium">거주 지역</Label>
                <Input id="voiceartistLocation" {...register("voiceartistLocation")} className="border-gray-300" />
              </div>

              {/* 연락처 */}
              <div className="space-y-2">
                <Label htmlFor="voiceartistPhone" className="text-sm font-medium">연락처</Label>
                <Input id="voiceartistPhone" type="tel" {...register("voiceartistPhone")} className="border-gray-300" />
              </div>

              {/* 이메일 */}
              <div className="space-y-2">
                <Label htmlFor="voiceartistEmail" className="text-sm font-medium">이메일</Label>
                <Input id="voiceartistEmail" type="email" {...register("voiceartistEmail")} className="border-gray-300" />
              </div>
            </div>

            {/* 메모 */}
            <div className="space-y-2">
              <Label htmlFor="voiceartistMemo" className="text-sm font-medium">메모</Label>
              <Textarea id="voiceartistMemo" {...register("voiceartistMemo")} className="border-gray-300" rows={4} />
            </div>

            {/* 전문 영역 섹션 */}
            <div className="space-y-4 p-6 bg-gray-50 rounded-xl border border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">전문 영역</h3>
                <Button
                  type="button"
                  onClick={handleAddExpertise}
                  className="bg-[#4da34c] hover:bg-[#3d8c3c]"
                  disabled={fields.length >= 5}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  전문 영역 추가
                </Button>
              </div>

              {fields.map((field, index) => (
                <Card key={field.id} className="border border-gray-200 bg-white">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="font-medium">전문 영역 #{index + 1}</h4>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => remove(index)}
                        disabled={fields.length <= 1}
                        className="h-8 w-8 hover:bg-red-50 hover:text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">도메인</Label>
                        <Controller
                          name={`expertise.${index}.domain`}
                          control={control}
                          render={({ field }) => (
                            <Select value={field.value || "movie"} onValueChange={field.onChange}>
                              <SelectTrigger className="border-gray-300">
                                <SelectValue placeholder="도메인 선택" />
                              </SelectTrigger>
                              <SelectContent>
                                {DOMAIN_OPTIONS.map((option) => (
                                  <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </div>

                      {watchedExpertise?.[index]?.domain === "other" && (
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">기타 도메인 설명</Label>
                          <Input
                            {...register(`expertise.${index}.domainOther`)}
                            placeholder="도메인을 설명해주세요"
                            className="border-gray-300"
                          />
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label className="text-sm font-medium">등급 (1-9)</Label>
                        <Controller
                          name={`expertise.${index}.grade`}
                          control={control}
                          render={({ field }) => (
                            <div className="flex items-center space-x-4">
                              <input
                                type="range"
                                min="1"
                                max="9"
                                step="1"
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                value={field.value || 5}
                                onChange={(e) => field.onChange(parseInt(e.target.value))}
                              />
                              <div className="flex items-center">
                                {Array.from({ length: 9 }).map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`h-4 w-4 ${
                                      i < (field.value || 0) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
                                    }`}
                                  />
                                ))}
                              </div>
                              <span className="font-medium min-w-[40px] text-center">{field.value || 5}/9</span>
                            </div>
                          )}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* 버튼 영역 */}
            <div className="pt-6 flex justify-between">
              <Button type="button" variant="outline" onClick={() => router.push(`/voiceartists/${artistId}`)} className="px-6">
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
                <Button type="submit" disabled={isSubmitting} className="bg-[#4da34c] hover:bg-[#3d8c3c]">
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
