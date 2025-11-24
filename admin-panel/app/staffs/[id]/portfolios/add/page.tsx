// app/staffs/[id]/portfolios/add/page.tsx
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
  Briefcase,
  Upload,
  Image as ImageIcon,
  Film,
  Calendar,
  Link as LinkIcon,
  FileText
} from "lucide-react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { 
  useStaff, 
  useCreateStaffPortfolio, 
  useUploadStaffPosterImage,
  useUploadStaffCreditImage
} from "@/hooks/useStaffs";
import { Staff, StaffPortfolio } from "@/types/staffs";
import { safeArray } from "@/lib/utils/personnel";

interface PortfolioFormData {
  workTitle: string;
  directorName?: string;
  workYear?: number;
  hasAd: boolean;
  hasCc: boolean;
  hasSl: boolean;
  referenceUrl?: string;
  participationContent?: string;
  sequenceNumber: number;
}

function AddStaffPortfolioPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const staffId = parseInt(params.id, 10);
  
  // 스태프 데이터 조회
  const { data: staff, isLoading: isStaffLoading } = useStaff(staffId);
  
  // 상태 관리
  const [posterImage, setPosterImage] = useState<File | null>(null);
  const [posterPreviewUrl, setPosterPreviewUrl] = useState<string | null>(null);
  const [creditImage, setCreditImage] = useState<File | null>(null);
  const [creditPreviewUrl, setCreditPreviewUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nextSequence, setNextSequence] = useState<number>(1);
  
  // 다음 시퀀스 번호 계산
  function getNextSequenceNumber(): number {
    if (!staff) return 1;
    
    const portfolios = safeArray(staff.portfolios);
    if (portfolios.length === 0) return 1;
    
    // 이미 사용 중인 시퀀스 번호 배열
    const usedNumbers = portfolios.map((portfolio: StaffPortfolio) => portfolio.sequenceNumber);
    
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
  } = useForm<PortfolioFormData>({
    defaultValues: {
      workTitle: "",
      directorName: "",
      workYear: undefined,
      hasAd: false,
      hasCc: false,
      hasSl: false,
      referenceUrl: "",
      participationContent: "",
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
  
  // staff 데이터가 로드되면 시퀀스 번호 계산
  useEffect(() => {
    if (staff) {
      const nextSeq = getNextSequenceNumber();
      setNextSequence(nextSeq);
      setValue("sequenceNumber", nextSeq);
    }
  }, [staff, setValue]);
  
  // 뮤테이션 훅
  const createPortfolioMutation = useCreateStaffPortfolio();
  const uploadPosterImageMutation = useUploadStaffPosterImage();
  const uploadCreditImageMutation = useUploadStaffCreditImage();
  
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

  // 크레디트 이미지 업로드 핸들러
  const handleCreditImageUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      
      // 이미지 파일 검증
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        setErrorMessage("크레디트 이미지는 JPEG, PNG, GIF, WebP 파일만 업로드 가능합니다.");
        return;
      }
      
      // 파일 크기 검증 (10MB)
      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        setErrorMessage("크레디트 이미지 파일 크기가 너무 큽니다. 최대 10MB까지 업로드 가능합니다.");
        return;
      }
      
      const objectUrl = URL.createObjectURL(file);
      setCreditPreviewUrl(objectUrl);
      setCreditImage(file);
      setErrorMessage(null);
    },
    []
  );
  
  // 폼 제출 핸들러
  const onSubmit = async (data: PortfolioFormData) => {
    if (!data.workTitle?.trim()) {
      setErrorMessage("작품 제목은 필수입니다");
      return;
    }
    
    if (!data.hasAd && !data.hasCc && !data.hasSl) {
      setErrorMessage("AD, CC, SL 중 최소 하나는 선택해야 합니다");
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
        hasSl: data.hasSl,
        referenceUrl: data.referenceUrl?.trim() || undefined,
        participationContent: data.participationContent?.trim() || undefined,
        sequenceNumber: Number(data.sequenceNumber)
      };
      
      // 1. 대표작 메타데이터 생성
      console.log("API 요청 - 대표작 메타데이터 생성:", formData);
      const createdPortfolio = await createPortfolioMutation.mutateAsync({
        staffId: staffId,
        portfolioData: formData
      });
      console.log("대표작 메타데이터 생성 결과:", createdPortfolio);
      
      // 2. 포스터 이미지 업로드 (있는 경우)
      if (posterImage && createdPortfolio && createdPortfolio.id) {
        console.log("API 요청 - 포스터 이미지 업로드:", posterImage.name);
        try {
          const posterUploadResult = await uploadPosterImageMutation.mutateAsync({
            staffId: staffId,
            portfolioId: createdPortfolio.id,
            file: posterImage
          });
          console.log("포스터 이미지 업로드 결과:", posterUploadResult);
        } catch (error) {
          console.error("포스터 이미지 업로드 오류:", error);
          // 포스터 이미지 업로드 실패는 치명적이지 않으므로 계속 진행
        }
      }
      
      // 3. 크레디트 이미지 업로드 (있는 경우)
      if (creditImage && createdPortfolio && createdPortfolio.id) {
        console.log("API 요청 - 크레디트 이미지 업로드:", creditImage.name);
        try {
          const creditUploadResult = await uploadCreditImageMutation.mutateAsync({
            staffId: staffId,
            portfolioId: createdPortfolio.id,
            file: creditImage
          });
          console.log("크레디트 이미지 업로드 결과:", creditUploadResult);
        } catch (error) {
          console.error("크레디트 이미지 업로드 오류:", error);
          // 크레디트 이미지 업로드 실패는 치명적이지 않으므로 계속 진행
        }
      }
      
      if (createdPortfolio && createdPortfolio.id) {
        toast.success("대표작이 성공적으로 등록되었습니다.");
        router.push(`/staffs/${staffId}`);
      } else {
        throw new Error("대표작 메타데이터 생성 결과가 유효하지 않습니다.");
      }
    } catch (error) {
      console.error("대표작 등록 오류:", error);
      const errorMsg =
        error instanceof Error
          ? error.message
          : "대표작 등록 중 오류가 발생했습니다.";
      setErrorMessage(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // 스태프 데이터 로딩 중
  if (isStaffLoading) {
    return (
      <div className="max-w-[800px] mx-auto py-10">
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }
  
  // 스태프 데이터가 없는 경우
  if (!staff) {
    return (
      <div className="max-w-[800px] mx-auto py-10">
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            스태프 정보를 찾을 수 없습니다.
          </AlertDescription>
        </Alert>
        <Button onClick={() => router.push("/staffs")}>목록으로 돌아가기</Button>
      </div>
    );
  }
  
  return (
    <div className="max-w-[800px] mx-auto py-10">
      <Card className="shadow-md border border-gray-300 hover:shadow-lg transition-all duration-300 rounded-xl overflow-hidden">
        <CardHeader className="p-4 pb-2 bg-white">
          <CardTitle className="text-xl font-bold text-[#333333] flex items-center">
            <Briefcase className="h-5 w-5 mr-2 text-[#ff6246]" />
            대표작 추가
          </CardTitle>
          <CardDescription>
            {staff.name}의 새 대표작을 등록합니다.
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
                  접근성 분야 <span className="text-red-500 ml-1">*</span>
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
                        <Label htmlFor="hasAd" className="text-sm">음성해설(AD) 참여</Label>
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
                        <Label htmlFor="hasCc" className="text-sm">자막해설(CC) 참여</Label>
                      </div>
                    )}
                  />
                  
                  <Controller
                    name="hasSl"
                    control={control}
                    render={({ field }) => (
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="hasSl"
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                        <Label htmlFor="hasSl" className="text-sm">수어해설(SL) 참여</Label>
                      </div>
                    )}
                  />
                </div>
                {!formValues.hasAd && !formValues.hasCc && !formValues.hasSl && (
                  <p className="text-sm text-red-500">AD, CC, SL 중 최소 하나는 선택해야 합니다.</p>
                )}
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

              {/* 참여 내용 */}
              <div className="space-y-2">
                <Label htmlFor="participationContent" className="text-sm font-medium flex items-center">
                  <FileText className="h-4 w-4 mr-1 text-[#4da34c]" />
                  참여 내용
                </Label>
                <Controller
                  name="participationContent"
                  control={control}
                  render={({ field }) => (
                    <Textarea
                      id="participationContent"
                      placeholder="참여 내용을 입력하세요"
                      className="min-h-[120px] border-gray-300 focus:ring-[#4da34c] focus:border-[#4da34c]"
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

                {/* 크레디트 이미지 */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">크레디트 이미지</Label>
                  <div className="border-2 border-dashed rounded-lg p-4 text-center hover:bg-gray-50 transition-colors">
                    {creditPreviewUrl ? (
                      <div className="space-y-4">
                        <img 
                          src={creditPreviewUrl} 
                          alt="크레디트 이미지 미리보기" 
                          className="w-32 h-24 object-cover rounded-lg mx-auto border"
                        />
                        {creditImage && (
                          <p className="text-sm text-gray-500">
                            {creditImage.name} ({(creditImage.size / 1024 / 1024).toFixed(2)} MB)
                          </p>
                        )}
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setCreditImage(null);
                            setCreditPreviewUrl(null);
                          }}
                        >
                          이미지 제거
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <Film className="h-12 w-12 mx-auto text-gray-400" />
                        <div className="space-y-2">
                          <p className="text-sm font-medium">크레디트 이미지 업로드</p>
                          <p className="text-xs text-gray-500">JPG, PNG, GIF, WebP 파일 (최대 10MB)</p>
                        </div>
                        <Input
                          id="creditImage"
                          type="file"
                          accept="image/jpeg,image/png,image/gif,image/webp"
                          className="hidden"
                          onChange={handleCreditImageUpload}
                        />
                        <Label 
                          htmlFor="creditImage" 
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
                onClick={() => router.push(`/staffs/${staffId}`)}
                className="px-6"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                뒤로
              </Button>
              
              <div className="space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push(`/staffs/${staffId}`)}
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

export default function ProtectedAddStaffPortfolioPage({ params }: { params: { id: string } }) {
  return (
    <ProtectedRoute>
      <AddStaffPortfolioPage params={params} />
    </ProtectedRoute>
  );
}
