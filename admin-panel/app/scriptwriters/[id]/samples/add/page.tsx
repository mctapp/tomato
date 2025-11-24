// app/scriptwriters/[id]/samples/add/page.tsx
"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  AlertCircle, 
  ArrowLeft, 
  PenTool,
  Upload,
  Image as ImageIcon,
  Film,
  Calendar,
  Clock,
  Link as LinkIcon,
  FileText
} from "lucide-react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { 
  useScriptwriter, 
  useCreateScriptwriterSample, 
  useUploadScriptwriterPosterImage,
  useUploadScriptwriterReferenceImage
} from "@/hooks/useScriptwriters";
import { Scriptwriter, ScriptwriterSample } from "@/types/scriptwriters";
import { safeArray } from "@/lib/utils/personnel";

interface SampleFormData {
  workTitle: string;
  directorName?: string;
  workYear?: number;
  hasAd: boolean;
  hasCc: boolean;
  timecodeIn?: string;
  timecodeOut?: string;
  referenceUrl?: string;
  narrationContent?: string;
  narrationMemo?: string;
  sequenceNumber: number;
}

function AddScriptwriterSamplePage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const scriptwriterId = parseInt(params.id, 10);
  
  // 해설작가 데이터 조회
  const { data: scriptwriter, isLoading: isScriptwriterLoading } = useScriptwriter(scriptwriterId);
  
  // 상태 관리
  const [posterImage, setPosterImage] = useState<File | null>(null);
  const [posterPreviewUrl, setPosterPreviewUrl] = useState<string | null>(null);
  const [referenceImage, setReferenceImage] = useState<File | null>(null);
  const [referencePreviewUrl, setReferencePreviewUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nextSequence, setNextSequence] = useState<number>(1);
  
  // 다음 시퀀스 번호 계산
  function getNextSequenceNumber(): number {
    if (!scriptwriter) return 1;
    
    const samples = safeArray(scriptwriter.samples);
    if (samples.length === 0) return 1;
    
    // 이미 사용 중인 시퀀스 번호 배열
    const usedNumbers = samples.map((sample: ScriptwriterSample) => sample.sequenceNumber);
    
    // 1부터 5까지 중 사용되지 않은 가장 작은 번호 찾기
    for (let i = 1; i <= 5; i++) {
      if (!usedNumbers.includes(i)) {
        return i;
      }
    }
    
    return 1; // 모든 번호가 사용 중인 경우
  }
  
  // 폼 설정
  const {
    control,
    register,
    handleSubmit,
    setValue,
    formState: { errors, isValid },
    trigger,
    watch
  } = useForm<SampleFormData>({
    defaultValues: {
      workTitle: "",
      directorName: "",
      workYear: undefined,
      hasAd: false,
      hasCc: false,
      timecodeIn: "",
      timecodeOut: "",
      referenceUrl: "",
      narrationContent: "",
      narrationMemo: "",
      sequenceNumber: 1
    },
    mode: "onChange"
  });
  
  // 폼 값을 관찰
  const formValues = watch();
  
  // 디버깅용 로그
  useEffect(() => {
    console.log("Form values:", formValues);
    console.log("Form errors:", errors);
    console.log("Form valid:", isValid);
  }, [formValues, errors, isValid]);
  
  // scriptwriter 데이터가 로드되면 시퀀스 번호 계산
  useEffect(() => {
    if (scriptwriter) {
      const nextSeq = getNextSequenceNumber();
      setNextSequence(nextSeq);
      setValue("sequenceNumber", nextSeq);
    }
  }, [scriptwriter, setValue]);
  
  // 뮤테이션 훅
  const createSampleMutation = useCreateScriptwriterSample();
  const uploadPosterImageMutation = useUploadScriptwriterPosterImage();
  const uploadReferenceImageMutation = useUploadScriptwriterReferenceImage();
  
  // 포스터 이미지 업로드 핸들러
  const handlePosterImageUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      
      // 이미지 파일 검증
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        setErrorMessage("포스터 이미지는 JPEG, PNG, GIF, WebP 파일만 업로드 가능합니다.");
        return;
      }
      
      // 파일 크기 검증 (10MB)
      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        setErrorMessage("포스터 이미지 파일 크기가 너무 큽니다. 최대 10MB까지 업로드 가능합니다.");
        return;
      }
      
      const objectUrl = URL.createObjectURL(file);
      setPosterPreviewUrl(objectUrl);
      setPosterImage(file);
      setErrorMessage(null);
    },
    []
  );

  // 참고 이미지 업로드 핸들러
  const handleReferenceImageUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      
      // 이미지 파일 검증
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        setErrorMessage("참고 이미지는 JPEG, PNG, GIF, WebP 파일만 업로드 가능합니다.");
        return;
      }
      
      // 파일 크기 검증 (10MB)
      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        setErrorMessage("참고 이미지 파일 크기가 너무 큽니다. 최대 10MB까지 업로드 가능합니다.");
        return;
      }
      
      const objectUrl = URL.createObjectURL(file);
      setReferencePreviewUrl(objectUrl);
      setReferenceImage(file);
      setErrorMessage(null);
    },
    []
  );
  
  // 폼 제출 핸들러
  const onSubmit = async (data: SampleFormData) => {
    if (!data.workTitle?.trim()) {
      setErrorMessage("작품 제목은 필수입니다");
      return;
    }
    
    if (!data.hasAd && !data.hasCc) {
      setErrorMessage("AD 또는 CC 중 최소 하나는 선택해야 합니다");
      return;
    }
    
    console.log("제출 데이터:", data);
    
    setIsSubmitting(true);
    setErrorMessage(null);
    
    try {
      const formData = {
        workTitle: data.workTitle.trim(),
        directorName: data.directorName?.trim() || undefined,
        workYear: data.workYear || undefined,
        hasAd: data.hasAd,
        hasCc: data.hasCc,
        timecodeIn: data.timecodeIn?.trim() || undefined,
        timecodeOut: data.timecodeOut?.trim() || undefined,
        referenceUrl: data.referenceUrl?.trim() || undefined,
        narrationContent: data.narrationContent?.trim() || undefined,
        narrationMemo: data.narrationMemo?.trim() || undefined,
        sequenceNumber: Number(data.sequenceNumber)
      };
      
      // 1. 대표해설 메타데이터 생성
      console.log("API 요청 - 대표해설 메타데이터 생성:", formData);
      const createdSample = await createSampleMutation.mutateAsync({
        scriptwriterId: scriptwriterId,
        sampleData: formData
      });
      console.log("대표해설 메타데이터 생성 결과:", createdSample);
      
      // 2. 포스터 이미지 업로드 (있는 경우)
      if (posterImage && createdSample && createdSample.id) {
        console.log("API 요청 - 포스터 이미지 업로드:", posterImage.name);
        try {
          const posterUploadResult = await uploadPosterImageMutation.mutateAsync({
            scriptwriterId: scriptwriterId,
            sampleId: createdSample.id,
            file: posterImage
          });
          console.log("포스터 이미지 업로드 결과:", posterUploadResult);
        } catch (error) {
          console.error("포스터 이미지 업로드 오류:", error);
          // 포스터 이미지 업로드 실패는 치명적이지 않으므로 계속 진행
        }
      }
      
      // 3. 참고 이미지 업로드 (있는 경우)
      if (referenceImage && createdSample && createdSample.id) {
        console.log("API 요청 - 참고 이미지 업로드:", referenceImage.name);
        try {
          const referenceUploadResult = await uploadReferenceImageMutation.mutateAsync({
            scriptwriterId: scriptwriterId,
            sampleId: createdSample.id,
            file: referenceImage
          });
          console.log("참고 이미지 업로드 결과:", referenceUploadResult);
        } catch (error) {
          console.error("참고 이미지 업로드 오류:", error);
          // 참고 이미지 업로드 실패는 치명적이지 않으므로 계속 진행
        }
      }
      
      if (createdSample && createdSample.id) {
        toast.success("대표해설이 성공적으로 등록되었습니다.");
        router.push(`/scriptwriters/${scriptwriterId}`);
      } else {
        throw new Error("대표해설 메타데이터 생성 결과가 유효하지 않습니다.");
      }
    } catch (error) {
      console.error("대표해설 등록 오류:", error);
      const errorMsg =
        error instanceof Error
          ? error.message
          : "대표해설 등록 중 오류가 발생했습니다.";
      setErrorMessage(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // 해설작가 데이터 로딩 중
  if (isScriptwriterLoading) {
    return (
      <div className="max-w-[800px] mx-auto py-10">
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }
  
  // 해설작가 데이터가 없는 경우
  if (!scriptwriter) {
    return (
      <div className="max-w-[800px] mx-auto py-10">
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            해설작가 정보를 찾을 수 없습니다.
          </AlertDescription>
        </Alert>
        <Button onClick={() => router.push("/scriptwriters")}>목록으로 돌아가기</Button>
      </div>
    );
  }
  
  return (
    <div className="max-w-[800px] mx-auto py-10">
      <Card className="shadow-md border border-gray-300 hover:shadow-lg transition-all duration-300 rounded-xl overflow-hidden">
        <CardHeader className="p-4 pb-2 bg-white">
          <CardTitle className="text-xl font-bold text-[#333333] flex items-center">
            <PenTool className="h-5 w-5 mr-2 text-[#ff6246]" />
            대표해설 추가
          </CardTitle>
          <CardDescription>
            {scriptwriter.name}의 새 대표해설을 등록합니다.
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
            <div className="space-y-4">
              {/* 작품 제목 */}
              <div className="space-y-2">
                <Label htmlFor="workTitle" className="text-sm font-medium">
                  작품 제목 <span className="text-red-500 ml-1">*</span>
                </Label>
                <Controller
                  name="workTitle"
                  control={control}
                  rules={{
                    required: "작품 제목은 필수입니다",
                    maxLength: {
                      value: 255,
                      message: "작품 제목은 255자를 초과할 수 없습니다"
                    }
                  }}
                  render={({ field }) => (
                    <Input
                      id="workTitle"
                      placeholder="작품 제목을 입력하세요"
                      className="border-gray-300 focus:ring-[#4da34c] focus:border-[#4da34c]"
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        trigger('workTitle');
                      }}
                    />
                  )}
                />
                {errors.workTitle && (
                  <p className="text-sm text-red-500">{errors.workTitle.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 감독 이름 */}
                <div className="space-y-2">
                  <Label htmlFor="directorName" className="text-sm font-medium">감독 이름</Label>
                  <Controller
                    name="directorName"
                    control={control}
                    render={({ field }) => (
                      <Input
                        id="directorName"
                        placeholder="감독 이름을 입력하세요"
                        className="border-gray-300 focus:ring-[#4da34c] focus:border-[#4da34c]"
                        {...field}
                      />
                    )}
                  />
                </div>

                {/* 작업연도 */}
                <div className="space-y-2">
                  <Label htmlFor="workYear" className="text-sm font-medium">작업연도</Label>
                  <Controller
                    name="workYear"
                    control={control}
                    render={({ field }) => (
                      <Input
                        id="workYear"
                        type="number"
                        min="1900"
                        max="2100"
                        placeholder="2024"
                        className="border-gray-300 focus:ring-[#4da34c] focus:border-[#4da34c]"
                        {...field}
                        value={field.value || ""}
                        onChange={(e) => {
                          const value = e.target.value;
                          field.onChange(value ? parseInt(value) : undefined);
                        }}
                      />
                    )}
                  />
                </div>
              </div>

              {/* 해설분야 선택 */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">
                  해설분야 <span className="text-red-500 ml-1">*</span>
                </Label>
                <div className="flex space-x-6">
                  <Controller
                    name="hasAd"
                    control={control}
                    render={({ field }) => (
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="hasAd"
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                        <Label htmlFor="hasAd" className="text-sm">음성해설(AD)</Label>
                      </div>
                    )}
                  />
                  
                  <Controller
                    name="hasCc"
                    control={control}
                    render={({ field }) => (
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="hasCc"
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                        <Label htmlFor="hasCc" className="text-sm">자막해설(CC)</Label>
                      </div>
                    )}
                  />
                </div>
                {!formValues.hasAd && !formValues.hasCc && (
                  <p className="text-sm text-red-500">AD 또는 CC 중 최소 하나는 선택해야 합니다.</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 타임코드 IN */}
                <div className="space-y-2">
                  <Label htmlFor="timecodeIn" className="text-sm font-medium flex items-center">
                    <Clock className="h-4 w-4 mr-1 text-[#4da34c]" />
                    타임코드 IN
                  </Label>
                  <Controller
                    name="timecodeIn"
                    control={control}
                    render={({ field }) => (
                      <Input
                        id="timecodeIn"
                        placeholder="00:00:00"
                        className="border-gray-300 focus:ring-[#4da34c] focus:border-[#4da34c]"
                        {...field}
                      />
                    )}
                  />
                </div>

                {/* 타임코드 OUT */}
                <div className="space-y-2">
                  <Label htmlFor="timecodeOut" className="text-sm font-medium flex items-center">
                    <Clock className="h-4 w-4 mr-1 text-[#4da34c]" />
                    타임코드 OUT
                  </Label>
                  <Controller
                    name="timecodeOut"
                    control={control}
                    render={({ field }) => (
                      <Input
                        id="timecodeOut"
                        placeholder="00:00:00"
                        className="border-gray-300 focus:ring-[#4da34c] focus:border-[#4da34c]"
                        {...field}
                      />
                    )}
                  />
                </div>
              </div>

              {/* 참고 URL */}
              <div className="space-y-2">
                <Label htmlFor="referenceUrl" className="text-sm font-medium flex items-center">
                  <LinkIcon className="h-4 w-4 mr-1 text-[#4da34c]" />
                  참고 URL
                </Label>
                <Controller
                  name="referenceUrl"
                  control={control}
                  render={({ field }) => (
                    <Input
                      id="referenceUrl"
                      type="url"
                      placeholder="https://example.com"
                      className="border-gray-300 focus:ring-[#4da34c] focus:border-[#4da34c]"
                      {...field}
                    />
                  )}
                />
              </div>

              {/* 시퀀스 번호 */}
              <div className="space-y-2">
                <Label htmlFor="sequenceNumber" className="text-sm font-medium">
                  순서 번호 <span className="text-red-500 ml-1">*</span>
                </Label>
                <Controller
                  name="sequenceNumber"
                  control={control}
                  rules={{
                    required: "순서 번호는 필수입니다",
                    min: {
                      value: 1,
                      message: "순서 번호는 1 이상이어야 합니다"
                    },
                    max: {
                      value: 5,
                      message: "순서 번호는 5 이하여야 합니다"
                    }
                  }}
                  render={({ field }) => (
                    <Input
                      id="sequenceNumber"
                      type="number"
                      min="1"
                      max="5"
                      className="border-gray-300 focus:ring-[#4da34c] focus:border-[#4da34c]"
                      {...field}
                      value={field.value}
                      onChange={(e) => {
                        const numValue = parseInt(e.target.value);
                        field.onChange(isNaN(numValue) ? "" : numValue);
                        trigger('sequenceNumber');
                      }}
                    />
                  )}
                />
                {errors.sequenceNumber && (
                  <p className="text-sm text-red-500">{errors.sequenceNumber.message}</p>
                )}
                <p className="text-xs text-gray-500">
                  순서 번호는 1부터 5까지 사용할 수 있으며, 중복될 수 없습니다.
                </p>
              </div>

              {/* 해설 내용 */}
              <div className="space-y-2">
                <Label htmlFor="narrationContent" className="text-sm font-medium flex items-center">
                  <FileText className="h-4 w-4 mr-1 text-[#4da34c]" />
                  해설 내용
                </Label>
                <Controller
                  name="narrationContent"
                  control={control}
                  render={({ field }) => (
                    <Textarea
                      id="narrationContent"
                      placeholder="해설 내용을 입력하세요"
                      className="min-h-[120px] border-gray-300 focus:ring-[#4da34c] focus:border-[#4da34c]"
                      {...field}
                    />
                  )}
                />
              </div>

              {/* 해설 메모 */}
              <div className="space-y-2">
                <Label htmlFor="narrationMemo" className="text-sm font-medium">해설 메모</Label>
                <Controller
                  name="narrationMemo"
                  control={control}
                  render={({ field }) => (
                    <Textarea
                      id="narrationMemo"
                      placeholder="해설 메모를 입력하세요"
                      className="min-h-[100px] border-gray-300 focus:ring-[#4da34c] focus:border-[#4da34c]"
                      {...field}
                    />
                  )}
                />
              </div>

              {/* 이미지 업로드 섹션 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 포스터 이미지 */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">포스터 이미지</Label>
                  <div className="border-2 border-dashed rounded-lg p-4 text-center hover:bg-gray-50 transition-colors">
                    {posterPreviewUrl ? (
                      <div className="space-y-4">
                        <img 
                          src={posterPreviewUrl} 
                          alt="포스터 이미지 미리보기" 
                          className="w-32 h-40 object-cover rounded-lg mx-auto border"
                        />
                        {posterImage && (
                          <p className="text-sm text-gray-500">
                            {posterImage.name} ({(posterImage.size / 1024 / 1024).toFixed(2)} MB)
                          </p>
                        )}
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setPosterImage(null);
                            setPosterPreviewUrl(null);
                          }}
                        >
                          이미지 제거
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <ImageIcon className="h-12 w-12 mx-auto text-gray-400" />
                        <div className="space-y-2">
                          <p className="text-sm font-medium">포스터 이미지 업로드</p>
                          <p className="text-xs text-gray-500">JPG, PNG, GIF, WebP 파일 (최대 10MB)</p>
                        </div>
                        <Input
                          id="posterImage"
                          type="file"
                          accept="image/jpeg,image/png,image/gif,image/webp"
                          className="hidden"
                          onChange={handlePosterImageUpload}
                        />
                        <Label 
                          htmlFor="posterImage" 
                          className="inline-block px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium cursor-pointer hover:bg-gray-50"
                        >
                          파일 선택
                        </Label>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">공개 저장소에 업로드됩니다.</p>
                </div>

                {/* 참고 이미지 */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">참고 이미지</Label>
                  <div className="border-2 border-dashed rounded-lg p-4 text-center hover:bg-gray-50 transition-colors">
                    {referencePreviewUrl ? (
                      <div className="space-y-4">
                        <img 
                          src={referencePreviewUrl} 
                          alt="참고 이미지 미리보기" 
                          className="w-32 h-24 object-cover rounded-lg mx-auto border"
                        />
                        {referenceImage && (
                          <p className="text-sm text-gray-500">
                            {referenceImage.name} ({(referenceImage.size / 1024 / 1024).toFixed(2)} MB)
                          </p>
                        )}
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setReferenceImage(null);
                            setReferencePreviewUrl(null);
                          }}
                        >
                          이미지 제거
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <Film className="h-12 w-12 mx-auto text-gray-400" />
                        <div className="space-y-2">
                          <p className="text-sm font-medium">참고 이미지 업로드</p>
                          <p className="text-xs text-gray-500">JPG, PNG, GIF, WebP 파일 (최대 10MB)</p>
                        </div>
                        <Input
                          id="referenceImage"
                          type="file"
                          accept="image/jpeg,image/png,image/gif,image/webp"
                          className="hidden"
                          onChange={handleReferenceImageUpload}
                        />
                        <Label 
                          htmlFor="referenceImage" 
                          className="inline-block px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium cursor-pointer hover:bg-gray-50"
                        >
                          파일 선택
                        </Label>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">비공개 저장소에 업로드됩니다.</p>
                </div>
              </div>
            </div>
            
            {/* 버튼 영역 */}
            <div className="pt-6 flex justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push(`/scriptwriters/${scriptwriterId}`)}
                className="px-6"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                뒤로
              </Button>
              
              <div className="space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push(`/scriptwriters/${scriptwriterId}`)}
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
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ProtectedAddScriptwriterSamplePage({ params }: { params: { id: string } }) {
  return (
    <ProtectedRoute>
      <AddScriptwriterSamplePage params={params} />
    </ProtectedRoute>
  );
}
