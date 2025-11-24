// app/slinterpreters/[id]/samples/add/page.tsx
"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  AlertCircle, 
  ArrowLeft, 
  Hand,
  Upload,
  Play,
  Pause,
  Video,
  Image
} from "lucide-react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useSLInterpreter, useCreateSLInterpreterSample, useUploadSLInterpreterSampleFile } from "@/hooks/useSLInterpreters";
import { SLInterpreter, SLInterpreterSample } from "@/types/slinterpreters";
import { safeArray } from "@/lib/utils/personnel";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SampleFormData {
  title: string;
  sampleType: 'video' | 'image';
  sequenceNumber: number;
}

function AddSLInterpreterSamplePage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const interpreterId = parseInt(params.id, 10);
  
  // 수어통역사 데이터 조회
  const { data: interpreter, isLoading: isInterpreterLoading } = useSLInterpreter(interpreterId);
  
  // 상태 관리
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nextSequence, setNextSequence] = useState<number>(1);
  const [selectedSampleType, setSelectedSampleType] = useState<'video' | 'image'>('video');
  
  // 비디오/오디오 요소 참조
  const mediaRef = useRef<HTMLVideoElement>(null);
  
  // 다음 시퀀스 번호 계산
  function getNextSequenceNumber(sampleType: 'video' | 'image'): number {
    if (!interpreter) return 1;
    
    const samples = safeArray(interpreter.samples);
    if (samples.length === 0) return 1;
    
    // 해당 타입의 이미 사용 중인 시퀀스 번호 배열
    const usedNumbers = samples
      .filter((sample: SLInterpreterSample) => sample.sampleType === sampleType)
      .map((sample: SLInterpreterSample) => sample.sequenceNumber);
    
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
      title: "",
      sampleType: "video",
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
  
  // interpreter 데이터가 로드되면 시퀀스 번호 계산
  useEffect(() => {
    if (interpreter) {
      const nextSeq = getNextSequenceNumber(selectedSampleType);
      setNextSequence(nextSeq);
      setValue("sequenceNumber", nextSeq);
    }
  }, [interpreter, selectedSampleType, setValue]);
  
  // 뮤테이션 훅
  const createSampleMutation = useCreateSLInterpreterSample();
  const uploadSampleFileMutation = useUploadSLInterpreterSampleFile();
  
  // 샘플 타입 변경 핸들러
  const handleSampleTypeChange = (sampleType: 'video' | 'image') => {
    setSelectedSampleType(sampleType);
    setValue("sampleType", sampleType);
    
    // 업로드된 파일 초기화
    setUploadedFile(null);
    setPreviewUrl(null);
    
    // 시퀀스 번호 재계산
    if (interpreter) {
      const nextSeq = getNextSequenceNumber(sampleType);
      setNextSequence(nextSeq);
      setValue("sequenceNumber", nextSeq);
    }
  };
  
  // 파일 업로드 핸들러
  const handleFileUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      
      let validTypes: string[] = [];
      let maxSize: number = 0;
      
      if (selectedSampleType === 'video') {
        validTypes = ['video/mp4', 'video/mov', 'video/avi', 'video/mkv', 'video/webm'];
        maxSize = 50 * 1024 * 1024; // 50MB
      } else {
        validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        maxSize = 10 * 1024 * 1024; // 10MB
      }
      
      // 파일 타입 검증
      if (!validTypes.includes(file.type) && 
          !file.name.match(selectedSampleType === 'video' ? /\.(mp4|mov|avi|mkv|webm)$/i : /\.(jpg|jpeg|png|gif|webp)$/i)) {
        setErrorMessage(`${selectedSampleType === 'video' ? '비디오' : '이미지'} 파일만 업로드 가능합니다.`);
        return;
      }
      
      // 파일 크기 검증
      if (file.size > maxSize) {
        setErrorMessage(`파일 크기가 너무 큽니다. 최대 ${maxSize / (1024*1024)}MB까지 업로드 가능합니다.`);
        return;
      }
      
      // 미리보기 URL 생성
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
      setUploadedFile(file);
      setErrorMessage(null);
      
      // 재생 상태 초기화
      if (isPlaying && mediaRef.current) {
        if (selectedSampleType === 'video') {
          (mediaRef.current as HTMLVideoElement).pause();
        }
        setIsPlaying(false);
      }
    },
    [selectedSampleType, isPlaying]
  );
  
  // 미디어 재생/일시정지 토글 (비디오만)
  const toggleMedia = () => {
    if (!mediaRef.current || selectedSampleType !== 'video') return;
    
    const video = mediaRef.current as HTMLVideoElement;
    
    if (isPlaying) {
      video.pause();
    } else {
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch(err => {
          console.error("비디오 재생 오류:", err);
          setErrorMessage("비디오를 재생할 수 없습니다.");
        });
      }
    }
    
    setIsPlaying(!isPlaying);
  };
  
  // 미디어 이벤트 리스너
  const handleMediaEnded = () => {
    setIsPlaying(false);
  };
  
  // 폼 제출 핸들러
  const onSubmit = async (data: SampleFormData) => {
    if (!data.title?.trim()) {
      setErrorMessage("샘플 제목은 필수입니다");
      return;
    }
    
    console.log("제출 데이터:", data);
    
    if (!uploadedFile) {
      setErrorMessage(`${selectedSampleType === 'video' ? '비디오' : '이미지'} 파일을 업로드해주세요.`);
      return;
    }
    
    setIsSubmitting(true);
    setErrorMessage(null);
    
    try {
      const formData = {
        title: data.title.trim(),
        sample_type: data.sampleType,
        sequence_number: Number(data.sequenceNumber)
      };
      
      // 1. 샘플 메타데이터 생성
      console.log("API 요청 - 샘플 메타데이터 생성:", formData);
      const createdSample = await createSampleMutation.mutateAsync({
  slInterpreterId: interpreterId,
  sampleData: {
    title: formData.title,
    sampleType: formData.sample_type,
    sequenceNumber: formData.sequence_number
  }
});
      console.log("샘플 메타데이터 생성 결과:", createdSample);
      
      // 2. 샘플 파일 업로드
      if (createdSample && createdSample.id) {
        console.log("API 요청 - 샘플 파일 업로드:", uploadedFile.name);
        const uploadResult = await uploadSampleFileMutation.mutateAsync({
          slInterpreterId: interpreterId,
          sampleId: createdSample.id,
          file: uploadedFile
        });
        console.log("샘플 파일 업로드 결과:", uploadResult);
        
        toast.success(`${selectedSampleType === 'video' ? '영상' : '이미지'} 샘플이 성공적으로 등록되었습니다.`);
        router.push(`/slinterpreters/${interpreterId}`);
      } else {
        throw new Error("샘플 메타데이터 생성 결과가 유효하지 않습니다.");
      }
    } catch (error) {
      console.error("샘플 등록 오류:", error);
      const errorMsg =
        error instanceof Error
          ? error.message
          : "샘플 등록 중 오류가 발생했습니다.";
      setErrorMessage(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // 수어통역사 데이터 로딩 중
  if (isInterpreterLoading) {
    return (
      <div className="max-w-[800px] mx-auto py-10">
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }
  
  // 수어통역사 데이터가 없는 경우
  if (!interpreter) {
    return (
      <div className="max-w-[800px] mx-auto py-10">
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            수어통역사 정보를 찾을 수 없습니다.
          </AlertDescription>
        </Alert>
        <Button onClick={() => router.push("/slinterpreters")}>목록으로 돌아가기</Button>
      </div>
    );
  }
  
  return (
    <div className="max-w-[800px] mx-auto py-10">
      <Card className="shadow-md border border-gray-300 hover:shadow-lg transition-all duration-300 rounded-xl overflow-hidden">
        <CardHeader className="p-4 pb-2 bg-white">
          <CardTitle className="text-xl font-bold text-[#333333] flex items-center">
            <Hand className="h-5 w-5 mr-2 text-[#ff6246]" />
            샘플 추가
          </CardTitle>
          <CardDescription>
            {interpreter.name}의 새 샘플을 등록합니다.
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
              {/* 샘플 타입 선택 */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  샘플 타입 <span className="text-red-500 ml-1">*</span>
                </Label>
                <Controller
                  name="sampleType"
                  control={control}
                  rules={{ required: "샘플 타입은 필수입니다" }}
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={(value) => {
                        field.onChange(value);
                        handleSampleTypeChange(value as 'video' | 'image');
                      }}
                    >
                      <SelectTrigger className="border-gray-300 focus:ring-[#4da34c] focus:border-[#4da34c]">
                        <SelectValue placeholder="샘플 타입 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="video">
                          <div className="flex items-center">
                            <Video className="h-4 w-4 mr-2" />
                            영상 샘플
                          </div>
                        </SelectItem>
                        <SelectItem value="image">
                          <div className="flex items-center">
                            <Image className="h-4 w-4 mr-2" />
                            사진 샘플
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.sampleType && (
                  <p className="text-sm text-red-500">{errors.sampleType.message}</p>
                )}
              </div>

              {/* 샘플 제목 */}
              <div className="space-y-2">
                <Label htmlFor="title" className="text-sm font-medium">
                  샘플 제목 <span className="text-red-500 ml-1">*</span>
                </Label>
                <Controller
                  name="title"
                  control={control}
                  rules={{
                    required: "샘플 제목은 필수입니다",
                    maxLength: {
                      value: 255,
                      message: "샘플 제목은 255자를 초과할 수 없습니다"
                    }
                  }}
                  render={({ field }) => (
                    <Input
                      id="title"
                      placeholder="샘플 제목을 입력하세요"
                      className="border-gray-300 focus:ring-[#4da34c] focus:border-[#4da34c]"
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        trigger('title');
                      }}
                    />
                  )}
                />
                {errors.title && (
                  <p className="text-sm text-red-500">{errors.title.message}</p>
                )}
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
                  순서 번호는 1부터 5까지 사용할 수 있으며, 같은 타입 내에서 중복될 수 없습니다.
                </p>
              </div>
              
              {/* 파일 업로드 */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  {selectedSampleType === 'video' ? '비디오' : '이미지'} 파일 <span className="text-red-500 ml-1">*</span>
                </Label>
                <div className="border-2 border-dashed rounded-lg p-4 text-center hover:bg-gray-50 transition-colors">
                  {uploadedFile && previewUrl ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-center">
                        {selectedSampleType === 'video' ? (
                          <Video className="h-12 w-12 text-[#ff6246]" />
                        ) : (
                          <Image className="h-12 w-12 text-[#ff6246]" />
                        )}
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm font-medium">{uploadedFile.name}</p>
                        <p className="text-xs text-gray-500">
                          {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      
                      {/* 미리보기 */}
                      <div className="border rounded-lg p-3 bg-gray-50">
                        {selectedSampleType === 'video' ? (
                          <div className="space-y-2">
                            <video 
                              ref={mediaRef} 
                              src={previewUrl} 
                              onEnded={handleMediaEnded}
                              className="w-full h-48 bg-black rounded"
                              controls={false}
                            />
                            <div className="flex items-center justify-center">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={toggleMedia}
                                className={`flex items-center space-x-1 ${
                                  isPlaying ? 'bg-[#ff6246] text-white hover:bg-[#e55236]' : 'border-[#ff6246] text-[#ff6246] hover:bg-[#fff5f3]'
                                }`}
                              >
                                {isPlaying ? (
                                  <Pause className="h-4 w-4 mr-1" />
                                ) : (
                                  <Play className="h-4 w-4 mr-1" />
                                )}
                                {isPlaying ? '일시정지' : '재생'}
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <img 
                            src={previewUrl} 
                            alt="이미지 미리보기"
                            className="w-full h-48 object-contain bg-white rounded"
                          />
                        )}
                      </div>
                      
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          if (mediaRef.current && isPlaying) {
                            if (selectedSampleType === 'video') {
                              (mediaRef.current as HTMLVideoElement).pause();
                            }
                            setIsPlaying(false);
                          }
                          setUploadedFile(null);
                          setPreviewUrl(null);
                        }}
                      >
                        파일 제거
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <Upload className="h-12 w-12 mx-auto text-gray-400" />
                      <div className="space-y-2">
                        <p className="text-sm font-medium">
                          {selectedSampleType === 'video' ? '비디오' : '이미지'} 파일을 업로드하세요
                        </p>
                        <p className="text-xs text-gray-500">
                          {selectedSampleType === 'video' 
                            ? 'MP4, MOV, AVI, MKV, WebM 파일 (최대 50MB)' 
                            : 'JPG, PNG, GIF, WebP 파일 (최대 10MB)'
                          }
                        </p>
                      </div>
                      <Input
                        id="file"
                        type="file"
                        accept={selectedSampleType === 'video' 
                          ? "video/*,.mp4,.mov,.avi,.mkv,.webm" 
                          : "image/*,.jpg,.jpeg,.png,.gif,.webp"
                        }
                        className="hidden"
                        onChange={handleFileUpload}
                      />
                      <Label 
                        htmlFor="file" 
                        className="inline-block px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium cursor-pointer hover:bg-gray-50"
                      >
                        파일 선택
                      </Label>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* 버튼 영역 */}
            <div className="pt-6 flex justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push(`/slinterpreters/${interpreterId}`)}
                className="px-6"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                뒤로
              </Button>
              
              <div className="space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push(`/slinterpreters/${interpreterId}`)}
                  className="border-gray-300 hover:bg-[#fff5f3] hover:text-[#ff6246] hover:border-[#ff6246]"
                >
                  취소
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || !uploadedFile}
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

export default function ProtectedAddSLInterpreterSamplePage({ params }: { params: { id: string } }) {
  return (
    <ProtectedRoute>
      <AddSLInterpreterSamplePage params={params} />
    </ProtectedRoute>
  );
}
