// app/voiceartists/create/page.tsx
"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  AlertCircle, 
  Upload, 
  User,
  Mic,
  Mail,
  Phone,
  MapPin,
  ChevronRight,
  ArrowLeft,
  ArrowRight,
  Star,
  Plus,
  Trash2,
  Volume2
} from "lucide-react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useCreateVoiceArtist } from "@/hooks/useVoiceArtists";
import { VoiceArtistExpertise } from "@/types/voiceartists";
import AudioPlayer from "@/components/audio/AudioPlayer";

// 성별 옵션
const GENDER_OPTIONS = [
  { value: "male", label: "남성" },
  { value: "female", label: "여성" },
  { value: "other", label: "기타" },
  { value: "prefer_not_to_say", label: "미표시" },
];

// 전문 영역 도메인 옵션
const DOMAIN_OPTIONS = [
  { value: "movie", label: "영화" },
  { value: "video", label: "영상물" },
  { value: "theater", label: "연극" },
  { value: "performance", label: "공연" },
  { value: "other", label: "기타" },
];

/**
 * 폼 데이터 타입 - camelCase로 통일
 */
interface VoiceArtistFormData {
  voiceartistName: string;
  voiceartistGender: string;
  voiceartistLocation: string;
  voiceartistLevel: number;
  voiceartistPhone: string;
  voiceartistEmail: string;
  voiceartistMemo: string;
  uploadedImage?: File | null;
  expertise: {
    domain: string;
    domainOther?: string;
    grade: number;
  }[];
}

function CreateVoiceArtistPage() {
  const router = useRouter();
  
  // 탭 전환
  const [activeTab, setActiveTab] = useState("basic");

  // 파일 & 에러 관리
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [previewAudio, setPreviewAudio] = useState<string | null>(null);
  
  // 폼 데이터 직접 관리
  const [formInputs, setFormInputs] = useState<Partial<VoiceArtistFormData>>({
    voiceartistName: "",
    voiceartistGender: "prefer_not_to_say",
    voiceartistLocation: "",
    voiceartistLevel: 1,
    voiceartistPhone: "",
    voiceartistEmail: "",
    voiceartistMemo: "",
    expertise: [{ domain: "movie", grade: 5 }],
  });

  // React Query 뮤테이션 훅 사용
  const createVoiceArtistMutation = useCreateVoiceArtist();

  // React Hook Form 설정 - 사실상 기능적으로는 필요한 부분만 사용
  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
    trigger,
    clearErrors,
    getValues,
  } = useForm<VoiceArtistFormData>({
    defaultValues: formInputs as VoiceArtistFormData,
    mode: "onBlur",
  });

  // useFieldArray로 전문 영역 관리
  const { fields, append, remove } = useFieldArray({
    control,
    name: "expertise",
  });

  // 일반 입력 필드 핸들러
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    // 1. 로컬 상태 업데이트
    setFormInputs(prev => ({
      ...prev,
      [id]: value
    }));
    
    // 2. React Hook Form 상태 업데이트
    setValue(id as any, value, { shouldValidate: true });
    
    console.log(`Input changed: ${id} = ${value}`);
  };

  // 이름 입력 핸들러 특별 처리
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    setFormInputs(prev => ({
      ...prev,
      voiceartistName: value
    }));
    setValue("voiceartistName", value, { shouldValidate: true });
    
    if (value.trim() !== "") {
      clearErrors("voiceartistName");
    }
    
    console.log(`Name changed: ${value}`);
  };
  
  // 성별 선택 핸들러
  const handleGenderChange = (value: string) => {
    setFormInputs(prev => ({
      ...prev,
      voiceartistGender: value
    }));
    setValue("voiceartistGender", value, { shouldValidate: true });
    console.log(`Gender changed: ${value}`);
  };
  
  // 레벨 선택 핸들러
  const handleLevelChange = (value: string) => {
    const levelNum = parseInt(value, 10);
    setFormInputs(prev => ({
      ...prev,
      voiceartistLevel: levelNum
    }));
    setValue("voiceartistLevel", levelNum, { shouldValidate: true });
    console.log(`Level changed: ${levelNum}`);
  };
  
  // 메모 입력 핸들러
  const handleMemoChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const { value } = e.target;
    setFormInputs(prev => ({
      ...prev,
      voiceartistMemo: value
    }));
    setValue("voiceartistMemo", value, { shouldValidate: true });
    console.log(`Memo changed: ${value}`);
  };
  
  // 전문 영역 추가 핸들러
  const handleAddExpertise = () => {
    if (fields.length >= 5) {
      toast.error("전문 영역은 최대 5개까지 추가할 수 있습니다.");
      return;
    }
    const newExpertise = { domain: "movie", grade: 5 };
    
    // 1. 로컬 상태 업데이트
    setFormInputs(prev => ({
      ...prev,
      expertise: [...(prev.expertise || []), newExpertise]
    }));
    
    // 2. React Hook Form 상태 업데이트
    append(newExpertise);
  };
  
  // 전문 영역 도메인 변경 핸들러
  const handleDomainChange = (index: number, value: string) => {
    // 1. 로컬 상태 업데이트
    setFormInputs(prev => {
      const newExpertise = [...(prev.expertise || [])];
      newExpertise[index] = { ...newExpertise[index], domain: value };
      return { ...prev, expertise: newExpertise };
    });
    
    // 2. React Hook Form 상태 업데이트
    setValue(`expertise.${index}.domain` as const, value, { shouldValidate: true });
    console.log(`Domain ${index} changed: ${value}`);
  };
  
  // 전문 영역 등급 변경 핸들러
  const handleGradeChange = (index: number, value: number) => {
    // 1. 로컬 상태 업데이트
    setFormInputs(prev => {
      const newExpertise = [...(prev.expertise || [])];
      newExpertise[index] = { ...newExpertise[index], grade: value };
      return { ...prev, expertise: newExpertise };
    });
    
    // 2. React Hook Form 상태 업데이트
    setValue(`expertise.${index}.grade` as const, value, { shouldValidate: true });
    console.log(`Grade ${index} changed: ${value}`);
  };

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
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        setErrorMessage("파일 크기가 너무 큽니다. 최대 5MB까지 업로드 가능합니다.");
        return;
      }

      // 미리보기 URL 생성
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
      setUploadedImage(file);
      setErrorMessage(null);
    },
    []
  );

  // 오디오 미리듣기 설정 (테스트용)
  const handlePreviewAudio = () => {
    // 예시 오디오 URL - 실제 사용 시에는 적절한 URL로 변경 필요
    setPreviewAudio("https://tomato-app-storage.s3.ap-northeast-2.amazonaws.com/voice-artists/example-audio.mp3");
  };

  // 탭 전환 시 현재 상태 로깅
  useEffect(() => {
    console.log("Current tab:", activeTab);
    console.log("Current form values:", formInputs);
  }, [activeTab, formInputs]);

  // 다음 단계로 이동 시 현재 폼 검증
  const handleNextStep = async () => {
    // 기본 정보 탭의 내용 검증 (이름만 필수)
    const isValid = await trigger("voiceartistName");
    
    if (!isValid) {
      return;
    }
    
    // 현재 입력된 전체 데이터 로깅 (디버깅용)
    console.log("Moving to expertise tab with data:", formInputs);
    
    // 이름이 있으면 다음 단계로 진행
    clearErrors("voiceartistName");
    setActiveTab("expertise");
  };

  // 이전 단계로 돌아가는 함수
  const handlePrevStep = () => {
    // 현재 상태 로깅 (디버깅용)
    console.log("Moving back to basic tab with data:", formInputs);
    setActiveTab("basic");
  };

  // 폼 제출 핸들러
  const onSubmit = async (data: VoiceArtistFormData) => {
    // 성우 이름이 비어있는지 다시 확인
    if (!data.voiceartistName || data.voiceartistName.trim() === "") {
      setValue("voiceartistName", "", { shouldValidate: true });
      setActiveTab("basic");
      return;
    }
    
    // 현재 로컬 상태의 값과 React Hook Form에서 받은 값을 병합
    // 이 방법으로 어느 하나가 누락되더라도 데이터는 유지됨
    const submitData = {
      ...formInputs,
      ...data,
      voiceartistName: data.voiceartistName || formInputs.voiceartistName,
      voiceartistGender: data.voiceartistGender || formInputs.voiceartistGender,
      voiceartistLocation: data.voiceartistLocation || formInputs.voiceartistLocation,
      voiceartistLevel: data.voiceartistLevel || formInputs.voiceartistLevel,
      voiceartistPhone: data.voiceartistPhone || formInputs.voiceartistPhone,
      voiceartistEmail: data.voiceartistEmail || formInputs.voiceartistEmail,
      voiceartistMemo: data.voiceartistMemo || formInputs.voiceartistMemo,
      expertise: data.expertise || formInputs.expertise,
    } as VoiceArtistFormData;
    
    setErrorMessage(null);
    
    // 확인을 위해 제출 데이터 콘솔에 출력
    console.log("Submitting final form data:", submitData);

    try {
      // 1. 성우 정보 생성 - camelCase 그대로 전송
      const createdArtist = await createVoiceArtistMutation.mutateAsync(submitData);

      // 2. 이미지 업로드 (있는 경우)
      if (uploadedImage && createdArtist) {
        try {
          // 이미지 업로드를 위한 함수 정의
          const uploadImage = async (artistId: number, file: File) => {
            const formData = new FormData();
            formData.append('file', file);
            
            const response = await fetch(
              `/admin/api/voiceartists/${artistId}/profile-image`,
              {
                method: 'POST',
                body: formData
              }
            );
            
            if (!response.ok) {
              throw new Error('이미지 업로드에 실패했습니다.');
            }
            
            return await response.json();
          };
          
          // 이미지 업로드 실행
          await uploadImage(createdArtist.id, uploadedImage);
        } catch (uploadError) {
          console.error("Profile image upload error:", uploadError);
          // 이미지 업로드 실패해도 성우 정보는 생성된 상태
          toast.error("성우 정보는 생성되었으나, 프로필 이미지 업로드에 실패했습니다.");
        }
      }

      toast.success("성우가 성공적으로 등록되었습니다.");
      router.push(`/voiceartists/${createdArtist.id}`);
    } catch (error) {
      console.error("Error creating voice artist:", error);
      const errorMsg =
        error instanceof Error
          ? error.message
          : "성우 등록 중 오류가 발생했습니다.";
      setErrorMessage(errorMsg);
      toast.error(errorMsg);
    }
  };

  return (
    <div className="max-w-[1200px] mx-auto py-10">
      <Card className="shadow-md border border-gray-300 hover:shadow-lg transition-all duration-300 rounded-xl overflow-hidden">
        <CardHeader className="p-4 pb-2 bg-white">
          <CardTitle className="text-2xl font-bold text-[#333333] flex items-center">
            <Mic className="h-6 w-6 mr-2 text-[#ff6246]" />
            새 성우 등록
          </CardTitle>
          <CardDescription>
            새로운 성우를 등록합니다. 기본 정보와 전문 영역을 입력해주세요.
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
            {/* 스텝 기반 탭 디자인 */}
            <div className="relative mb-12">
              <div className="absolute left-0 right-0 h-1 bg-gray-200 top-5"></div>
              <div className="flex justify-between relative">
                <button 
                  type="button" 
                  onClick={() => setActiveTab("basic")}
                  className={`flex flex-col items-center z-10 ${activeTab === "basic" ? "text-[#ff6246]" : "text-gray-500"}`}
                >
                  <div className={`rounded-full w-10 h-10 mb-2 flex items-center justify-center ${activeTab === "basic" ? "bg-[#ff6246] text-white" : activeTab === "expertise" ? "bg-[#4da34c] text-white" : "bg-gray-200"}`}>
                    1
                  </div>
                  <span className="text-xs font-medium">기본 정보</span>
                </button>
                
                <button 
                  type="button" 
                  onClick={() => setActiveTab("expertise")}
                  className={`flex flex-col items-center z-10 ${activeTab === "expertise" ? "text-[#ff6246]" : "text-gray-500"}`}
                >
                  <div className={`rounded-full w-10 h-10 mb-2 flex items-center justify-center ${activeTab === "expertise" ? "bg-[#ff6246] text-white" : "bg-gray-200"}`}>
                    2
                  </div>
                  <span className="text-xs font-medium">전문 영역</span>
                </button>
              </div>
            </div>

            {/* --- 기본 정보 탭 --- */}
            {activeTab === "basic" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* 왼쪽 열: 기본 정보 */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="voiceartistName" className="text-sm font-medium flex items-center">
                        <User className="h-4 w-4 mr-1 text-[#4da34c]" />
                        성우 이름 <span className="text-red-500 ml-1">*</span>
                      </Label>
                      <Input
                        id="voiceartistName"
                        placeholder="성우 이름을 입력하세요"
                        className="border-gray-300 focus:ring-[#4da34c] focus:border-[#4da34c]"
                        value={formInputs.voiceartistName || ""}
                        onChange={handleNameChange}
                        aria-invalid={errors.voiceartistName ? "true" : "false"}
                      />
                      {errors.voiceartistName && (
                        <p className="text-sm text-red-500">{errors.voiceartistName.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="voiceartistGender" className="text-sm font-medium">
                        성별
                      </Label>
                      <Select
                        value={formInputs.voiceartistGender || "prefer_not_to_say"}
                        onValueChange={handleGenderChange}
                      >
                        <SelectTrigger className="w-full border-gray-300 focus:ring-[#4da34c] focus:border-[#4da34c]">
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
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="voiceartistLocation" className="text-sm font-medium flex items-center">
                        <MapPin className="h-4 w-4 mr-1 text-[#4da34c]" />
                        지역
                      </Label>
                      <Input
                        id="voiceartistLocation"
                        placeholder="활동 지역을 입력하세요"
                        className="border-gray-300 focus:ring-[#4da34c] focus:border-[#4da34c]"
                        value={formInputs.voiceartistLocation || ""}
                        onChange={handleInputChange}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="voiceartistLevel" className="text-sm font-medium">
                        레벨
                      </Label>
                      <Select
                        value={formInputs.voiceartistLevel?.toString() || "1"}
                        onValueChange={handleLevelChange}
                      >
                        <SelectTrigger className="w-full border-gray-300 focus:ring-[#4da34c] focus:border-[#4da34c]">
                          <SelectValue placeholder="레벨 선택" />
                        </SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((level) => (
                            <SelectItem key={level} value={level.toString()}>
                              Lv.{level}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* 오른쪽 열: 연락처 및 이미지 */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="voiceartistPhone" className="text-sm font-medium flex items-center">
                        <Phone className="h-4 w-4 mr-1 text-[#4da34c]" />
                        전화번호
                      </Label>
                      <Input
                        id="voiceartistPhone"
                        placeholder="전화번호를 입력하세요"
                        className="border-gray-300 focus:ring-[#4da34c] focus:border-[#4da34c]"
                        value={formInputs.voiceartistPhone || ""}
                        onChange={handleInputChange}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="voiceartistEmail" className="text-sm font-medium flex items-center">
                        <Mail className="h-4 w-4 mr-1 text-[#4da34c]" />
                        이메일
                      </Label>
                      <Input
                        id="voiceartistEmail"
                        type="email"
                        placeholder="이메일을 입력하세요"
                        className="border-gray-300 focus:ring-[#4da34c] focus:border-[#4da34c]"
                        value={formInputs.voiceartistEmail || ""}
                        onChange={handleInputChange}
                      />
                      {errors.voiceartistEmail && (
                        <p className="text-sm text-red-500">{errors.voiceartistEmail.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">
                        프로필 이미지
                      </Label>
                      <div className="border-2 border-dashed rounded-lg p-4 text-center hover:bg-gray-50 transition-colors">
                        {previewUrl ? (
                          <div className="space-y-4">
                            <img 
                              src={previewUrl} 
                              alt="프로필 이미지 미리보기" 
                              className="w-32 h-32 object-cover rounded-lg mx-auto"
                            />
                            {uploadedImage && (
                              <p className="text-sm text-gray-500">
                                {uploadedImage.name} ({uploadedImage ? Math.round(uploadedImage.size / 1024) : 0} KB)
                              </p>
                            )}
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => {
                                setUploadedImage(null);
                                setPreviewUrl(null);
                              }}
                            >
                              이미지 제거
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <Upload className="h-12 w-12 mx-auto text-gray-400" />
                            <div className="space-y-2">
                              <p className="text-sm font-medium">이미지를 업로드하세요</p>
                              <p className="text-xs text-gray-500">JPG, PNG, GIF 파일 (최대 5MB)</p>
                            </div>
                            <Input
                              id="profileImage"
                              type="file"
                              accept="image/jpeg,image/png,image/gif"
                              className="hidden"
                              onChange={handleImageUpload}
                            />
                            <Label 
                              htmlFor="profileImage" 
                              className="inline-block px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium cursor-pointer hover:bg-gray-50"
                            >
                              파일 선택
                            </Label>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="voiceartistMemo" className="text-sm font-medium">
                    메모
                  </Label>
                  <Textarea
                    id="voiceartistMemo"
                    placeholder="메모를 입력하세요"
                    className="min-h-[120px] border-gray-300 focus:ring-[#4da34c] focus:border-[#4da34c]"
                    value={formInputs.voiceartistMemo || ""}
                    onChange={handleMemoChange}
                  />
                </div>

                {/* 오디오 플레이어 미리보기 (테스트용) */}
                {previewAudio && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <h4 className="text-sm font-medium mb-2">
                      <Volume2 className="h-4 w-4 inline mr-1" />
                      음성 샘플 미리듣기
                    </h4>
                    <AudioPlayer 
                      src={previewAudio} 
                      title="샘플 오디오"
                    />
                  </div>
                )}

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
                  <div className="space-x-2">
                    <Button
                      type="button" 
                      variant="outline"
                      onClick={handlePreviewAudio}
                      className="hover:bg-[#f5fbf5] hover:text-[#4da34c]"
                    >
                      <Volume2 className="h-4 w-4 mr-1" />
                      샘플 미리듣기
                    </Button>
                    <Button
                      type="button"
                      onClick={handleNextStep}
                      className="px-6 bg-[#4da34c] hover:bg-[#3d8c3c]"
                    >
                      다음: 전문 영역
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* --- 전문 영역 탭 --- */}
            {activeTab === "expertise" && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">전문 영역</h3>
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
                  <Card key={field.id} className="border border-gray-200">
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
                          <Label className="text-sm font-medium">
                            도메인
                          </Label>
                          <Select
                            value={formInputs.expertise?.[index]?.domain || "movie"}
                            onValueChange={(value) => handleDomainChange(index, value)}
                          >
                            <SelectTrigger className="w-full border-gray-300 focus:ring-[#4da34c] focus:border-[#4da34c]">
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
                        </div>

                        {(formInputs.expertise?.[index]?.domain === "other") && (
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">
                              기타 도메인 설명
                            </Label>
                            <Input
                              placeholder="도메인을 설명해주세요"
                              className="border-gray-300 focus:ring-[#4da34c] focus:border-[#4da34c]"
                              value={formInputs.expertise?.[index]?.domainOther || ""}
                              onChange={(e) => {
                                const { value } = e.target;
                                setFormInputs(prev => {
                                  const newExpertise = [...(prev.expertise || [])];
                                  newExpertise[index] = { ...newExpertise[index], domainOther: value };
                                  return { ...prev, expertise: newExpertise };
                                });
                                setValue(`expertise.${index}.domainOther` as const, value);
                              }}
                            />
                          </div>
                        )}

                        <div className="space-y-2">
                          <Label className="text-sm font-medium">
                            등급 (1-9)
                          </Label>
                          <div className="flex items-center space-x-2">
                            <input
                              type="range"
                              min="1"
                              max="9"
                              step="1"
                              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                              value={formInputs.expertise?.[index]?.grade || 5}
                              onChange={(e) => {
                                const gradeNum = parseInt(e.target.value, 10);
                                handleGradeChange(index, gradeNum);
                              }}
                            />
                            <div className="flex items-center min-w-[100px]">
                              {Array.from({ length: 9 }).map((_, i) => (
                                <Star
                                  key={i}
                                  className={`h-4 w-4 ${
                                    i < (formInputs.expertise?.[index]?.grade || 0) 
                                      ? 'text-yellow-400 fill-yellow-400' 
                                      : 'text-gray-300'
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="font-medium min-w-[40px] text-center">
                              {formInputs.expertise?.[index]?.grade || 5}/9
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {/* 최종 제출 버튼 */}
                <div className="pt-6 flex justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handlePrevStep}
                    className="px-6"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    이전: 기본 정보
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
                      disabled={isSubmitting || createVoiceArtistMutation.isPending}
                      className="bg-[#4da34c] hover:bg-[#3d8c3c]"
                    >
                      {(isSubmitting || createVoiceArtistMutation.isPending) ? (
                        <>
                          <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                          처리 중...
                        </>
                      ) : (
                        "등록"
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * 최종 Default Export: ProtectedRoute로 감싼 페이지
 */
export default function ProtectedCreateVoiceArtistPage() {
  return (
    <ProtectedRoute>
      <CreateVoiceArtistPage />
    </ProtectedRoute>
  );
}
