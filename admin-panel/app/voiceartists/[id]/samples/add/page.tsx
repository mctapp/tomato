// app/voiceartists/[id]/samples/add/page.tsx
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
  FileAudio,
  Upload,
  Play,
  Pause,
  Volume2
} from "lucide-react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useVoiceArtist, useCreateVoiceArtistSample, useUploadVoiceArtistSampleFile } from "@/hooks/useVoiceArtists";
import { VoiceArtist, VoiceArtistSample } from "@/types/voiceartists";

/**
 * 폼 데이터 타입 - 카멜케이스로 변경
 */
interface SampleFormData {
  title: string;
  sequenceNumber: number;  // snake_case -> camelCase
}

function AddVoiceArtistSamplePage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const artistId = parseInt(params.id, 10);
  
  // 성우 데이터 조회
  const { data: artist, isLoading: isArtistLoading } = useVoiceArtist(artistId);
  
  // 상태 관리
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nextSequence, setNextSequence] = useState<number>(1);
  
  // 오디오 요소 참조
  const audioRef = useRef<HTMLAudioElement>(null);
  
  // 다음 시퀀스 번호 계산 (최대 5, 기존 번호를 제외한 사용 가능한 번호 중 가장 작은 값)
  function getNextSequenceNumber(): number {
    if (!artist || !artist.samples || artist.samples.length === 0) return 1;
    
    // 이미 사용 중인 시퀀스 번호 배열
    const usedNumbers = artist.samples.map((sample: VoiceArtistSample) => sample.sequenceNumber);
    
    // 1부터 5까지 중 사용되지 않은 가장 작은 번호 찾기
    for (let i = 1; i <= 5; i++) {
      if (!usedNumbers.includes(i)) {
        return i;
      }
    }
    
    // 모든 번호가 사용 중인 경우 (비정상적 상황)
    return 1;
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
      sequenceNumber: 1  // snake_case -> camelCase
    },
    mode: "onChange" // 실시간 유효성 검사 활성화
  });
  
  // 모니터링을 위해 폼 값을 관찰
  const formValues = watch();
  
  // 디버깅용 로그
  useEffect(() => {
    console.log("Form values:", formValues);
    console.log("Form errors:", errors);
    console.log("Form valid:", isValid);
  }, [formValues, errors, isValid]);
  
  // artist 데이터가 로드되면 다음 시퀀스 번호 계산하여 폼에 설정
  useEffect(() => {
    if (artist) {
      const nextSeq = getNextSequenceNumber();
      setNextSequence(nextSeq);
      setValue("sequenceNumber", nextSeq);  // snake_case -> camelCase
    }
  }, [artist, setValue]);
  
  // 뮤테이션 훅
  const createSampleMutation = useCreateVoiceArtistSample();
  const uploadSampleFileMutation = useUploadVoiceArtistSampleFile();
  
  // 파일 업로드 핸들러
  const handleFileUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      
      // 유효성 검사: 오디오 파일 타입
      const validAudioTypes = [
        'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav',
        'audio/m4a', 'audio/x-m4a', 'audio/aac', 'audio/ogg', 'audio/flac'
      ];
      
      if (!validAudioTypes.includes(file.type) && 
          !file.name.match(/\.(mp3|wav|m4a|aac|ogg|flac)$/i)) {
        setErrorMessage("오디오 파일만 업로드 가능합니다. (MP3, WAV, M4A, AAC, OGG, FLAC)");
        return;
      }
      
      // 유효성 검사: 파일 크기 (10MB 제한)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        setErrorMessage("파일 크기가 너무 큽니다. 최대 10MB까지 업로드 가능합니다.");
        return;
      }
      
      // 미리보기 URL 생성
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
      setUploadedFile(file);
      setErrorMessage(null);
      
      // 이미 재생 중인 경우 중지
      if (isPlaying && audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
      }
    },
    [isPlaying]
  );
  
  // 오디오 재생/일시정지 토글
  const toggleAudio = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      // 오류 방지를 위한 추가 처리
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(err => {
          console.error("오디오 재생 오류:", err);
          setErrorMessage("오디오를 재생할 수 없습니다. 브라우저의 자동 재생 정책을 확인하세요.");
        });
      }
    }
    
    setIsPlaying(!isPlaying);
  };
  
  // 오디오 이벤트 리스너
  const handleAudioEnded = () => {
    setIsPlaying(false);
  };
  
  // 폼 제출 핸들러
  const onSubmit = async (data: SampleFormData) => {
    // 추가 유효성 검사
    if (!data.title?.trim()) {
      setErrorMessage("샘플 제목은 필수입니다");
      return;
    }
    
    console.log("제출 데이터:", data);
    
    if (!uploadedFile) {
      setErrorMessage("오디오 파일을 업로드해주세요.");
      return;
    }
    
    setIsSubmitting(true);
    setErrorMessage(null);
    
    try {
      // 확실히 숫자 타입으로 변환
      const formData = {
        title: data.title.trim(),
        sequence_number: Number(data.sequenceNumber)  // API 요청을 위해 스네이크케이스로 변환
      };
      
      // 1. 샘플 메타데이터 생성
      console.log("API 요청 - 샘플 메타데이터 생성:", formData);
      const createdSample = await createSampleMutation.mutateAsync({
        voiceArtistId: artistId,
        sampleData: formData
      });
      console.log("샘플 메타데이터 생성 결과:", createdSample);
      
      // 2. 샘플 파일 업로드
      if (createdSample && createdSample.id) {
        console.log("API 요청 - 샘플 파일 업로드:", uploadedFile.name);
        const uploadResult = await uploadSampleFileMutation.mutateAsync({
          voiceArtistId: artistId,
          sampleId: createdSample.id,
          file: uploadedFile
        });
        console.log("샘플 파일 업로드 결과:", uploadResult);
        
        toast.success("음성 샘플이 성공적으로 등록되었습니다.");
        router.push(`/voiceartists/${artistId}`);
      } else {
        throw new Error("샘플 메타데이터 생성 결과가 유효하지 않습니다.");
      }
    } catch (error) {
      console.error("샘플 등록 오류:", error);
      const errorMsg =
        error instanceof Error
          ? error.message
          : "음성 샘플 등록 중 오류가 발생했습니다.";
      setErrorMessage(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // 성우 데이터 로딩 중
  if (isArtistLoading) {
    return (
      <div className="max-w-[800px] mx-auto py-10">
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }
  
  // 성우 데이터가 없는 경우
  if (!artist) {
    return (
      <div className="max-w-[800px] mx-auto py-10">
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            성우 정보를 찾을 수 없습니다.
          </AlertDescription>
        </Alert>
        <Button onClick={() => router.push("/voiceartists")}>목록으로 돌아가기</Button>
      </div>
    );
  }
  
  return (
    <div className="max-w-[800px] mx-auto py-10">
      <Card className="shadow-md border border-gray-300 hover:shadow-lg transition-all duration-300 rounded-xl overflow-hidden">
        <CardHeader className="p-4 pb-2 bg-white">
          <CardTitle className="text-xl font-bold text-[#333333] flex items-center">
            <FileAudio className="h-5 w-5 mr-2 text-[#ff6246]" />
            음성 샘플 추가
          </CardTitle>
          <CardDescription>
            {artist.voiceartistName}의 새 음성 샘플을 등록합니다.
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
              {/* 샘플 제목 - Controller 사용 */}
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
                        trigger('title'); // 값이 변경될 때 유효성 검사 트리거
                      }}
                    />
                  )}
                />
                {errors.title && (
                  <p className="text-sm text-red-500">{errors.title.message}</p>
                )}
              </div>
              
              {/* 시퀀스 번호 - Controller 사용 (이름 변경) */}
              <div className="space-y-2">
                <Label htmlFor="sequenceNumber" className="text-sm font-medium">
                  순서 번호 <span className="text-red-500 ml-1">*</span>
                </Label>
                <Controller
                  name="sequenceNumber"  // snake_case -> camelCase
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
                      id="sequenceNumber"  // snake_case -> camelCase
                      type="number"
                      min="1"
                      max="5"
                      className="border-gray-300 focus:ring-[#4da34c] focus:border-[#4da34c]"
                      {...field}
                      value={field.value}
                      onChange={(e) => {
                        const numValue = parseInt(e.target.value);
                        field.onChange(isNaN(numValue) ? "" : numValue);
                        trigger('sequenceNumber'); // 값이 변경될 때 유효성 검사 트리거
                      }}
                    />
                  )}
                />
                {errors.sequenceNumber && (  // snake_case -> camelCase
                  <p className="text-sm text-red-500">{errors.sequenceNumber.message}</p>
                )}
                <p className="text-xs text-gray-500">
                  순서 번호는 1부터 5까지 사용할 수 있으며, 이미 사용 중인 번호와 중복될 수 없습니다.
                </p>
              </div>
              
              {/* 오디오 파일 업로드 */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  오디오 파일 <span className="text-red-500 ml-1">*</span>
                </Label>
                <div className="border-2 border-dashed rounded-lg p-4 text-center hover:bg-gray-50 transition-colors">
                  {uploadedFile && previewUrl ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-center">
                        <FileAudio className="h-12 w-12 text-[#ff6246]" />
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm font-medium">{uploadedFile.name}</p>
                        <p className="text-xs text-gray-500">
                          {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      
                      {/* 오디오 미리듣기 */}
                      <div className="border rounded-lg p-3 bg-gray-50">
                        <audio 
                          ref={audioRef} 
                          src={previewUrl} 
                          onEnded={handleAudioEnded}
                          className="hidden"
                          crossOrigin="anonymous"
                        />
                        <div className="flex items-center justify-between">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={toggleAudio}
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
                          <div className="flex items-center">
                            <Volume2 className="h-4 w-4 mr-1 text-gray-500" />
                            <span className="text-sm text-gray-500">미리듣기</span>
                          </div>
                        </div>
                      </div>
                      
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          if (audioRef.current && isPlaying) {
                            audioRef.current.pause();
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
                        <p className="text-sm font-medium">오디오 파일을 업로드하세요</p>
                        <p className="text-xs text-gray-500">MP3, WAV, M4A, AAC, OGG, FLAC 파일 (최대 10MB)</p>
                      </div>
                      <Input
                        id="audioFile"
                        type="file"
                        accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg,.flac"
                        className="hidden"
                        onChange={handleFileUpload}
                      />
                      <Label 
                        htmlFor="audioFile" 
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

/**
 * 최종 Default Export: ProtectedRoute로 감싼 페이지
 */
export default function ProtectedAddVoiceArtistSamplePage({ params }: { params: { id: string } }) {
  return (
    <ProtectedRoute>
      <AddVoiceArtistSamplePage params={params} />
    </ProtectedRoute>
  );
}
