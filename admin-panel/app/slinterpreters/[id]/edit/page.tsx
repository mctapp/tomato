"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller, useFieldArray } from "react-hook-form";
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
  Hand,
  Star,
  Plus,
  Trash2,
  Volume2,
  BookOpen
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import {
  useSLInterpreter,
  useUpdateSLInterpreter
} from "@/hooks/useSLInterpreters";
import { SLInterpreterFormData } from "@/types/slinterpreters";
import { isValidGender, SignLanguageCode, ExpertiseField } from "@/types/personnel";
import { isValidSkillLevel } from '@/lib/utils/personnel';
import { 
  GENDER_OPTIONS, 
  SKILL_LEVEL_OPTIONS, 
  SIGN_LANGUAGE_OPTIONS,
  EXPERTISE_FIELD_OPTIONS
} from "@/lib/constants/personnel";
import { validateEmail } from "@/lib/utils/personnel";
import { DevTool } from "@hookform/devtools";

// 편집용 폼 데이터 타입
interface SignLanguageFormData {
  signLanguageCode: SignLanguageCode;
  proficiencyLevel: number;
}

interface ExpertiseFormData {
  expertiseField: ExpertiseField;
  expertiseFieldOther?: string;
  skillGrade: number;
}

interface EditSLInterpreterFormData {
  name: string;
  gender?: string;
  location?: string;
  skillLevel?: number;
  phone?: string;
  email?: string;
  memo?: string;
  signLanguages: SignLanguageFormData[];
  expertise: ExpertiseFormData[];
}

function EditSLInterpreterPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const interpreterId = parseInt(params.id, 10);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isFormReady, setIsFormReady] = useState(false);

  const { data: interpreter, isLoading, isError, error } = useSLInterpreter(interpreterId);
  const updateInterpreterMutation = useUpdateSLInterpreter(interpreterId);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
    watch,
    reset
  } = useForm<EditSLInterpreterFormData>();

  const { 
    fields: signLanguageFields, 
    append: appendSignLanguage, 
    remove: removeSignLanguage 
  } = useFieldArray({
    control,
    name: "signLanguages"
  });

  const { 
    fields: expertiseFields, 
    append: appendExpertise, 
    remove: removeExpertise 
  } = useFieldArray({
    control,
    name: "expertise"
  });

  const currentValues = watch();

  useEffect(() => {
    if (interpreter) {
      const mappedDataForForm: EditSLInterpreterFormData = {
        name: interpreter.name || "",
        gender: interpreter.gender || "prefer_not_to_say",
        location: interpreter.location || "",
        skillLevel: interpreter.skillLevel ?? 1,
        phone: interpreter.phone || "",
        email: interpreter.email || "",
        memo: interpreter.memo || "",
        signLanguages: (interpreter.signLanguages || []).map(sl => ({
          signLanguageCode: sl.signLanguageCode as SignLanguageCode,
          proficiencyLevel: sl.proficiencyLevel
        })),
        expertise: (interpreter.expertise || []).map(exp => ({
          expertiseField: exp.expertiseField as ExpertiseField,
          expertiseFieldOther: exp.expertiseFieldOther || "",
          skillGrade: exp.skillGrade
        }))
      };

      reset(mappedDataForForm);
      setIsFormReady(true);
    }
  }, [interpreter, reset]);

  const onSubmit = async (data: EditSLInterpreterFormData) => {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      if (!data.name?.trim()) throw new Error("수어통역사 이름은 필수입니다.");
      if (data.email && !validateEmail(data.email)) throw new Error("유효한 이메일 주소를 입력해주세요.");
      if (data.gender && !isValidGender(data.gender)) throw new Error("유효하지 않은 성별이 선택되었습니다.");
      if (data.skillLevel && !isValidSkillLevel(data.skillLevel)) throw new Error("스킬 레벨은 1-9 사이의 값이어야 합니다.");

      if (data.signLanguages) {
        for (const sl of data.signLanguages) {
          if (!sl.signLanguageCode) throw new Error("사용수어 코드는 필수입니다.");
          if (sl.proficiencyLevel < 1 || sl.proficiencyLevel > 9) throw new Error("숙련도는 1-9 사이의 값이어야 합니다.");
        }
      }

      if (data.expertise) {
        for (const exp of data.expertise) {
          if (!exp.expertiseField) throw new Error("전문영역 분야는 필수입니다.");
          if (exp.expertiseField === 'other' && !exp.expertiseFieldOther?.trim()) throw new Error("기타 전문영역의 설명은 필수입니다.");
          if (exp.skillGrade < 1 || exp.skillGrade > 9) throw new Error("전문 수준은 1-9 사이의 값이어야 합니다.");
        }
      }

      const updateData: Partial<SLInterpreterFormData> = {
        name: data.name.trim(),
        gender: data.gender && isValidGender(data.gender) ? data.gender : undefined,
        location: data.location?.trim() || undefined,
        skillLevel: data.skillLevel,
        phone: data.phone?.trim() || undefined,
        email: data.email?.trim() || undefined,
        memo: data.memo?.trim() || undefined,
        signLanguages: data.signLanguages?.map(sl => ({
          signLanguageCode: sl.signLanguageCode,
          proficiencyLevel: sl.proficiencyLevel
        })) || [],
        expertise: data.expertise?.map(exp => ({
          expertiseField: exp.expertiseField,
          expertiseFieldOther: exp.expertiseField === 'other' ? exp.expertiseFieldOther : undefined,
          skillGrade: exp.skillGrade
        })) || []
      };

      await updateInterpreterMutation.mutateAsync(updateData);
      toast.success("수어통역사 정보가 성공적으로 업데이트되었습니다.");
      router.push(`/slinterpreters/${interpreterId}`);

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "수어통역사 정보 업데이트 중 오류가 발생했습니다.";
      setErrorMessage(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleAddSignLanguage = () => {
    appendSignLanguage({
      signLanguageCode: "KSL" as SignLanguageCode,
      proficiencyLevel: 5
    });
  };

  const handleAddExpertise = () => {
    appendExpertise({
      expertiseField: "movie" as ExpertiseField,
      expertiseFieldOther: "",
      skillGrade: 5
    });
  };

  if (isLoading) {
    return (
      <div className="max-w-[1200px] mx-auto py-10 flex justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (isError || !interpreter) {
    return (
      <div className="max-w-[1200px] mx-auto py-10">
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            수어통역사 정보를 불러오는 중 오류가 발생했습니다.
            {error instanceof Error ? ` (${error.message})` : ''}
          </AlertDescription>
        </Alert>
        <Button onClick={() => router.push('/slinterpreters')} variant="outline">
          목록으로 돌아가기
        </Button>
      </div>
    );
  }

  if (!isFormReady) {
    return (
      <div className="max-w-[1200px] mx-auto py-10 flex justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto py-10">
      <Card className="border border-gray-300 shadow-lg rounded-xl">
        <CardHeader className="p-6 bg-white">
          <CardTitle className="text-xl font-bold text-[#333333] flex items-center">
            <Hand className="h-5 w-5 mr-2 text-[#4da34c]" />
            수어통역사 정보 수정
          </CardTitle>
          <CardDescription>
            {interpreter.name}님의 정보를 수정합니다.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6">
          {errorMessage && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}

          <form key={interpreter.id} onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            {/* 기본 정보 */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-[#333333] flex items-center">
                <BookOpen className="h-4 w-4 mr-2" />
                기본 정보
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 이름 */}
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium">
                    수어통역사 이름 <span className="text-red-500 ml-1">*</span>
                  </Label>
                  <Controller
                    name="name"
                    control={control}
                    rules={{
                      required: "수어통역사 이름은 필수입니다",
                      minLength: { value: 1, message: "이름을 입력해주세요" },
                      maxLength: { value: 100, message: "이름은 100자를 초과할 수 없습니다" }
                    }}
                    render={({ field }) => (
                      <Input
                        id="name"
                        value={field.value || ""}
                        onChange={field.onChange}
                        className="border-gray-300"
                      />
                    )}
                  />
                  {errors.name && (
                    <p className="text-sm text-red-500">{errors.name.message}</p>
                  )}
                </div>

                {/* 성별 */}
                <div className="space-y-2">
                  <Label htmlFor="gender" className="text-sm font-medium">성별</Label>
                  <Controller
                    name="gender"
                    control={control}
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
                   {errors.gender && (
                    <p className="text-sm text-red-500">{errors.gender.message}</p>
                  )}
                </div>

                {/* 스킬 레벨 */}
                <div className="space-y-2">
                  <Label htmlFor="skillLevel" className="text-sm font-medium">스킬 레벨</Label>
                  <Controller
                    name="skillLevel"
                    control={control}
                    render={({ field }) => (
                      <Select
                        value={(field.value ?? 1).toString()}
                        onValueChange={(value) => field.onChange(Number(value))}
                      >
                        <SelectTrigger className="border-gray-300">
                          <SelectValue placeholder="스킬 레벨 선택" />
                        </SelectTrigger>
                        <SelectContent>
                          {SKILL_LEVEL_OPTIONS.map((option) => (
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
                  {errors.skillLevel && (
                    <p className="text-sm text-red-500">{errors.skillLevel.message}</p>
                  )}
                </div>

                {/* 지역 */}
                <div className="space-y-2">
                  <Label htmlFor="location" className="text-sm font-medium">거주 지역</Label>
                  <Controller
                    name="location"
                    control={control}
                    render={({ field }) => (
                      <Input
                        id="location"
                        value={field.value || ""}
                        onChange={field.onChange}
                        className="border-gray-300"
                      />
                    )}
                  />
                  {errors.location && (
                    <p className="text-sm text-red-500">{errors.location.message}</p>
                  )}
                </div>

                {/* 연락처 */}
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-sm font-medium">연락처</Label>
                  <Controller
                    name="phone"
                    control={control}
                    render={({ field }) => (
                      <Input
                        id="phone"
                        type="tel"
                        value={field.value ?? ""}
                        onChange={field.onChange}
                        className="border-gray-300"
                      />
                    )}
                  />
                  {errors.phone && (
                    <p className="text-sm text-red-500">{errors.phone.message}</p>
                  )}
                </div>

                {/* 이메일 */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">이메일</Label>
                  <Controller
                    name="email"
                    control={control}
                    rules={{
                      pattern: {
                        value: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
                        message: "유효한 이메일 주소를 입력하세요"
                      }
                    }}
                    render={({ field }) => (
                      <Input
                        id="email"
                        type="email"
                        value={field.value ?? ""}
                        onChange={field.onChange}
                        className="border-gray-300"
                      />
                    )}
                  />
                  {errors.email && (
                    <p className="text-sm text-red-500">{errors.email.message}</p>
                  )}
                </div>
              </div>

              {/* 메모 */}
              <div className="space-y-2">
                <Label htmlFor="memo" className="text-sm font-medium">메모</Label>
                <Controller
                  name="memo"
                  control={control}
                  render={({ field }) => (
                    <Textarea
                      id="memo"
                      value={field.value ?? ""}
                      onChange={field.onChange}
                      className="border-gray-300"
                      rows={4}
                    />
                  )}
                />
              </div>
            </div>

            <Separator />

            {/* 사용수어 */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-[#333333] flex items-center">
                  <Volume2 className="h-4 w-4 mr-2" />
                  사용수어
                </h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddSignLanguage}
                  className="border-[#4da34c] text-[#4da34c] hover:bg-[#f5fbf5]"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  사용수어 추가
                </Button>
              </div>

              <div className="space-y-3">
                {signLanguageFields.map((field, index) => (
                  <div key={field.id} className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                    <div className="flex items-center justify-between mb-3">
                      <Badge variant="outline" className="bg-blue-50 text-blue-700">
                        사용수어 {index + 1}
                      </Badge>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeSignLanguage(index)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">수어 종류</Label>
                        <Controller
                          name={`signLanguages.${index}.signLanguageCode`}
                          control={control}
                          rules={{ required: "수어 종류를 선택해주세요" }}
                          render={({ field }) => (
                            <Select 
                              value={field.value || ""} 
                              onValueChange={(value) => field.onChange(value as SignLanguageCode)}
                            >
                              <SelectTrigger className="border-gray-300">
                                <SelectValue placeholder="수어 선택" />
                              </SelectTrigger>
                              <SelectContent>
                                {SIGN_LANGUAGE_OPTIONS.map((option) => (
                                  <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        />
                        {errors.signLanguages?.[index]?.signLanguageCode && (
                          <p className="text-sm text-red-500">
                            {errors.signLanguages[index]?.signLanguageCode?.message}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">숙련도 (1-9)</Label>
                        <Controller
                          name={`signLanguages.${index}.proficiencyLevel`}
                          control={control}
                          rules={{ 
                            required: "숙련도를 입력해주세요",
                            min: { value: 1, message: "숙련도는 1 이상이어야 합니다" },
                            max: { value: 9, message: "숙련도는 9 이하여야 합니다" }
                          }}
                          render={({ field }) => (
                            <Input
                              type="number"
                              min="1"
                              max="9"
                              value={field.value || ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                field.onChange(val === "" ? undefined : parseInt(val, 10));
                              }}
                              className="border-gray-300"
                            />
                          )}
                        />
                        {errors.signLanguages?.[index]?.proficiencyLevel && (
                          <p className="text-sm text-red-500">
                            {errors.signLanguages[index]?.proficiencyLevel?.message}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {signLanguageFields.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <p>등록된 사용수어가 없습니다.</p>
                    <p className="text-sm mt-2">위의 "사용수어 추가" 버튼을 클릭하여 추가해주세요.</p>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* 전문영역 */}
            <div className="space-y-4">
               <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-[#333333] flex items-center">
                  <Star className="h-4 w-4 mr-2" />
                  전문 영역
                </h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddExpertise}
                  className="border-[#4da34c] text-[#4da34c] hover:bg-[#f5fbf5]"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  전문영역 추가
                </Button>
              </div>
              <div className="space-y-3">
                {expertiseFields.map((field, index) => (
                  <div key={field.id} className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                    <div className="flex items-center justify-between mb-3">
                      <Badge variant="outline" className="bg-purple-50 text-purple-700">
                        전문영역 {index + 1}
                      </Badge>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeExpertise(index)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">전문 분야</Label>
                        <Controller
                          name={`expertise.${index}.expertiseField`}
                          control={control}
                          rules={{ required: "전문 분야를 선택해주세요" }}
                          render={({ field }) => (
                            <Select 
                              value={field.value || ""} 
                              onValueChange={(value) => field.onChange(value as ExpertiseField)}
                            >
                              <SelectTrigger className="border-gray-300">
                                <SelectValue placeholder="분야 선택" />
                              </SelectTrigger>
                              <SelectContent>
                                {EXPERTISE_FIELD_OPTIONS.map((option) => (
                                  <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        />
                        {errors.expertise?.[index]?.expertiseField && (
                          <p className="text-sm text-red-500">
                            {errors.expertise[index]?.expertiseField?.message}
                          </p>
                        )}
                      </div>
                      {currentValues.expertise?.[index]?.expertiseField === 'other' && (
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">기타 분야 설명</Label>
                          <Controller
                            name={`expertise.${index}.expertiseFieldOther`}
                            control={control}
                            rules={{
                              required: currentValues.expertise?.[index]?.expertiseField === 'other' 
                                ? "기타 분야 설명을 입력해주세요" : false
                            }}
                            render={({ field }) => (
                              <Input
                                value={field.value || ""}
                                onChange={field.onChange}
                                className="border-gray-300"
                                placeholder="기타 분야를 설명해주세요"
                              />
                            )}
                          />
                          {errors.expertise?.[index]?.expertiseFieldOther && (
                            <p className="text-sm text-red-500">
                              {errors.expertise[index]?.expertiseFieldOther?.message}
                            </p>
                          )}
                        </div>
                      )}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">전문 수준 (1-9)</Label>
                        <Controller
                          name={`expertise.${index}.skillGrade`}
                          control={control}
                          rules={{ 
                            required: "전문 수준을 입력해주세요",
                            min: { value: 1, message: "전문 수준은 1 이상이어야 합니다" },
                            max: { value: 9, message: "전문 수준은 9 이하여야 합니다" }
                          }}
                          render={({ field }) => (
                            <Input
                              type="number"
                              min="1"
                              max="9"
                              value={field.value || ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                field.onChange(val === "" ? undefined : parseInt(val, 10));
                              }}
                              className="border-gray-300"
                            />
                          )}
                        />
                        {errors.expertise?.[index]?.skillGrade && (
                          <p className="text-sm text-red-500">
                            {errors.expertise[index]?.skillGrade?.message}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {expertiseFields.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <p>등록된 전문 영역이 없습니다.</p>
                    <p className="text-sm mt-2">위의 "전문영역 추가" 버튼을 클릭하여 추가해주세요.</p>
                  </div>
                )}
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

      {/* React Hook Form DevTools */}
      {process.env.NODE_ENV === 'development' && <DevTool control={control} />}
    </div>
  );
}

export default function ProtectedEditSLInterpreterPage({ params }: { params: { id: string } }) {
  return (
    <ProtectedRoute>
      <EditSLInterpreterPage params={params} />
    </ProtectedRoute>
  );
}
