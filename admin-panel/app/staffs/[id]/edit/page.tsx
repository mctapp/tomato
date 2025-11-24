// app/staffs/[id]/edit/page.tsx
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
  Briefcase,
  Star,
  Plus,
  Trash2,
  BookOpen
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import {
  useStaff,
  useUpdateStaff
} from "@/hooks/useStaffs";
import { StaffFormData, StaffRole, StaffExpertise } from "@/types/staffs";
import { isValidGender, Gender } from "@/types/personnel";
import { isValidSkillLevel } from '@/lib/utils/personnel';
import { 
  GENDER_OPTIONS, 
  SKILL_LEVEL_OPTIONS,
  EXPERTISE_FIELD_OPTIONS
} from "@/lib/constants/personnel";
import { 
  ROLE_OPTIONS
} from "@/lib/constants/staff";
import { validateEmail } from "@/lib/utils/personnel";

// 편집용 폼 데이터 타입
interface RoleFormData {
  roleType: string;
  roleOther?: string;
}

interface ExpertiseFormData {
  expertiseField: string;
  expertiseFieldOther?: string;
  skillGrade: number;
}

interface EditStaffFormData {
  name: string;
  gender?: string;
  location?: string;
  skillLevel?: number;
  phone?: string;
  email?: string;
  memo?: string;
  roles: RoleFormData[];
  expertise: ExpertiseFormData[];
}

function EditStaffPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const staffId = parseInt(params.id, 10);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isFormReady, setIsFormReady] = useState(false);

  const { data: staff, isLoading, isError, error } = useStaff(staffId);
  const updateStaffMutation = useUpdateStaff(staffId);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
    watch,
    reset
  } = useForm<EditStaffFormData>();

  const { 
    fields: roleFields, 
    append: appendRole, 
    remove: removeRole 
  } = useFieldArray({
    control,
    name: "roles"
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
    if (staff) {
      const mappedDataForForm: EditStaffFormData = {
        name: staff.name || "",
        gender: staff.gender || "prefer_not_to_say",
        location: staff.location || "",
        skillLevel: staff.skillLevel ?? 1,
        phone: staff.phone || "",
        email: staff.email || "",
        memo: staff.memo || "",
        roles: (staff.roles || []).map(role => ({
          roleType: role.roleType,
          roleOther: role.roleOther
        })),
        expertise: (staff.expertise || []).map(exp => ({
          expertiseField: exp.expertiseField,
          expertiseFieldOther: exp.expertiseFieldOther,
          skillGrade: exp.skillGrade
        }))
      };

      reset(mappedDataForForm);
      setIsFormReady(true);
    }
  }, [staff, reset]);

  const onSubmit = async (data: EditStaffFormData) => {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      if (!data.name?.trim()) throw new Error("스태프 이름은 필수입니다.");
      if (data.email && !validateEmail(data.email)) throw new Error("유효한 이메일 주소를 입력해주세요.");
      if (data.gender && !isValidGender(data.gender)) throw new Error("유효하지 않은 성별이 선택되었습니다.");
      if (data.skillLevel && !isValidSkillLevel(data.skillLevel)) throw new Error("스킬 레벨은 1-9 사이의 값이어야 합니다.");

      if (data.roles) {
        for (const role of data.roles) {
          if (!role.roleType) throw new Error("역할 타입은 필수입니다.");
          if (role.roleType === 'other' && !role.roleOther) throw new Error("기타 역할을 선택한 경우 상세 내용을 입력해주세요.");
        }
      }

      if (data.expertise) {
        for (const exp of data.expertise) {
          if (!exp.expertiseField) throw new Error("전문 영역은 필수입니다.");
          if (exp.expertiseField === 'other' && !exp.expertiseFieldOther) throw new Error("기타 전문영역을 선택한 경우 상세 내용을 입력해주세요.");
          if (exp.skillGrade < 1 || exp.skillGrade > 9) throw new Error("스킬 등급은 1-9 사이의 값이어야 합니다.");
        }
      }

      const updateData: Partial<StaffFormData> = {
        name: data.name.trim(),
        gender: data.gender && isValidGender(data.gender) ? data.gender as Gender : undefined,
        location: data.location?.trim() || undefined,
        skillLevel: data.skillLevel,
        phone: data.phone?.trim() || undefined,
        email: data.email?.trim() || undefined,
        memo: data.memo?.trim() || undefined,
        roles: data.roles?.map(role => ({
          roleType: role.roleType as any,
          roleOther: role.roleOther
        })) || [],
        expertise: data.expertise?.map(exp => ({
          expertiseField: exp.expertiseField as any,
          expertiseFieldOther: exp.expertiseFieldOther,
          skillGrade: exp.skillGrade
        })) || []
      };

      await updateStaffMutation.mutateAsync(updateData);
      toast.success("스태프 정보가 성공적으로 업데이트되었습니다.");
      router.push(`/staffs/${staffId}`);

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "스태프 정보 업데이트 중 오류가 발생했습니다.";
      setErrorMessage(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleAddRole = () => {
    appendRole({
      roleType: "producer",
      roleOther: undefined
    });
  };

  const handleAddExpertise = () => {
    appendExpertise({
      expertiseField: "movie",
      expertiseFieldOther: undefined,
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

  if (isError || !staff) {
    return (
      <div className="max-w-[1200px] mx-auto py-10">
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            스태프 정보를 불러오는 중 오류가 발생했습니다.
            {error instanceof Error ? ` (${error.message})` : ''}
          </AlertDescription>
        </Alert>
        <Button onClick={() => router.push('/staffs')} variant="outline">
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
            <Briefcase className="h-5 w-5 mr-2 text-[#4da34c]" />
            스태프 정보 수정
          </CardTitle>
          <CardDescription>
            {staff.name}님의 정보를 수정합니다.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6">
          {errorMessage && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}

          <form key={staff.id} onSubmit={handleSubmit(onSubmit)} className="space-y-8">
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
                    스태프 이름 <span className="text-red-500 ml-1">*</span>
                  </Label>
                  <Controller
                    name="name"
                    control={control}
                    rules={{
                      required: "스태프 이름은 필수입니다",
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

            {/* 역할 */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-[#333333] flex items-center">
                  <Briefcase className="h-4 w-4 mr-2" />
                  역할
                </h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddRole}
                  className="border-[#4da34c] text-[#4da34c] hover:bg-[#f5fbf5]"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  역할 추가
                </Button>
              </div>

              <div className="space-y-3">
                {roleFields.map((field, index) => (
                  <div key={field.id} className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                    <div className="flex items-center justify-between mb-3">
                      <Badge variant="outline" className="bg-blue-50 text-blue-700">
                        역할 {index + 1}
                      </Badge>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeRole(index)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">역할 타입</Label>
                        <Controller
                          name={`roles.${index}.roleType`}
                          control={control}
                          rules={{ required: "역할을 선택해주세요" }}
                          render={({ field }) => (
                            <Select 
                              value={field.value || ""} 
                              onValueChange={(value) => field.onChange(value)}
                            >
                              <SelectTrigger className="border-gray-300">
                                <SelectValue placeholder="역할 선택" />
                              </SelectTrigger>
                              <SelectContent>
                                {ROLE_OPTIONS.map((option) => (
                                  <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        />
                        {errors.roles?.[index]?.roleType && (
                          <p className="text-sm text-red-500">
                            {errors.roles[index]?.roleType?.message}
                          </p>
                        )}
                      </div>
                      
                      {watch(`roles.${index}.roleType`) === "other" && (
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">기타 역할 설명</Label>
                          <Controller
                            name={`roles.${index}.roleOther`}
                            control={control}
                            rules={{ required: "기타 역할 설명을 입력해주세요" }}
                            render={({ field }) => (
                              <Input
                                placeholder="역할을 설명해주세요"
                                value={field.value || ""}
                                onChange={field.onChange}
                                className="border-gray-300"
                              />
                            )}
                          />
                          {errors.roles?.[index]?.roleOther && (
                            <p className="text-sm text-red-500">
                              {errors.roles[index]?.roleOther?.message}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {roleFields.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <p>등록된 역할이 없습니다.</p>
                    <p className="text-sm mt-2">위의 "역할 추가" 버튼을 클릭하여 추가해주세요.</p>
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
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">전문 영역</Label>
                        <Controller
                          name={`expertise.${index}.expertiseField`}
                          control={control}
                          rules={{ required: "전문 영역을 선택해주세요" }}
                          render={({ field }) => (
                            <Select 
                              value={field.value || ""} 
                              onValueChange={(value) => field.onChange(value)}
                            >
                              <SelectTrigger className="border-gray-300">
                                <SelectValue placeholder="영역 선택" />
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
                      
                      {watch(`expertise.${index}.expertiseField`) === "other" && (
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">기타 전문영역 설명</Label>
                          <Controller
                            name={`expertise.${index}.expertiseFieldOther`}
                            control={control}
                            rules={{ required: "기타 전문영역 설명을 입력해주세요" }}
                            render={({ field }) => (
                              <Input
                                placeholder="전문영역을 설명해주세요"
                                value={field.value || ""}
                                onChange={field.onChange}
                                className="border-gray-300"
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
                        <Label className="text-sm font-medium">스킬 등급 (1-9)</Label>
                        <Controller
                          name={`expertise.${index}.skillGrade`}
                          control={control}
                          rules={{ 
                            required: "스킬 등급을 입력해주세요",
                            min: { value: 1, message: "스킬 등급은 1 이상이어야 합니다" },
                            max: { value: 9, message: "스킬 등급은 9 이하여야 합니다" }
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

export default function ProtectedEditStaffPage({ params }: { params: { id: string } }) {
  return (
    <ProtectedRoute>
      <EditStaffPage params={params} />
    </ProtectedRoute>
  );
}
