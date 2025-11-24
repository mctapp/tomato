// app/staffs/create/page.tsx
"use client";

import React, { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray, Controller } from "react-hook-form";
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
  Briefcase,
  Mail,
  Phone,
  MapPin,
  ArrowLeft,
  ArrowRight,
  Plus,
  Trash2,
  Star
} from "lucide-react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { GradeDisplay } from "@/components/personnel/GradeDisplay";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useCreateStaff } from "@/hooks/useStaffs";
import { StaffFormData, StaffRole, StaffExpertise } from "@/types/staffs";
import { isValidGender, Gender } from "@/types/personnel";
import { 
  GENDER_OPTIONS, 
  SKILL_LEVEL_OPTIONS,
  EXPERTISE_FIELD_OPTIONS,
  EXPERTISE_FIELD_DISPLAY
} from "@/lib/constants/personnel";
import { 
  ROLE_OPTIONS,
  ROLE_DISPLAY
} from "@/lib/constants/staff";
import { Separator } from "@/components/ui/separator";
import { safeArray, validateEmail, isValidImageFile, formatFileSize } from "@/lib/utils/personnel";

function CreateStaffPage() {
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState<"basic" | "expertise">("basic");
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 로컬 상태로 폼 데이터 관리
  const [formInputs, setFormInputs] = useState<Partial<StaffFormData>>({
    name: "",
    gender: "prefer_not_to_say",
    location: "",
    skillLevel: 1,
    phone: "",
    email: "",
    memo: "",
    roles: [{ roleType: "producer" }],
    expertise: [{ expertiseField: "movie", skillGrade: 5 }],
  });

  const createStaffMutation = useCreateStaff();

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting },
    trigger,
    clearErrors,
    watch
  } = useForm<StaffFormData>({
    defaultValues: formInputs as StaffFormData,
    mode: "onBlur",
  });

  const { fields: roleFields, append: appendRole, remove: removeRole } = useFieldArray({
    control,
    name: "roles",
  });

  const { fields: expertiseFields, append: appendExpertise, remove: removeExpertise } = useFieldArray({
    control,
    name: "expertise",
  });

  // 일반 입력 필드 핸들러
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormInputs(prev => ({
      ...prev,
      [id]: value
    }));
    setValue(id as keyof StaffFormData, value, { shouldValidate: true });
    console.log(`Input changed: ${id} = ${value}`);
  };

  // 이름 입력 핸들러
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    setFormInputs(prev => ({
      ...prev,
      name: value
    }));
    setValue("name", value, { shouldValidate: true });
    
    if (value.trim() !== "") {
      clearErrors("name");
    }
    
    console.log(`Name changed: ${value}`);
  };

  // 성별 선택 핸들러
  const handleGenderChange = (value: string) => {
    if (isValidGender(value)) {
      setFormInputs(prev => ({
        ...prev,
        gender: value as Gender
      }));
      setValue("gender", value as Gender, { shouldValidate: true });
      console.log(`Gender changed: ${value}`);
    }
  };

  // 스킬 레벨 선택 핸들러
  const handleSkillLevelChange = (value: string) => {
    const levelNum = parseInt(value, 10);
    setFormInputs(prev => ({
      ...prev,
      skillLevel: levelNum
    }));
    setValue("skillLevel", levelNum, { shouldValidate: true });
    console.log(`Skill level changed: ${levelNum}`);
  };

  // 메모 입력 핸들러
  const handleMemoChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const { value } = e.target;
    setFormInputs(prev => ({
      ...prev,
      memo: value
    }));
    setValue("memo", value, { shouldValidate: true });
    console.log(`Memo changed: ${value}`);
  };

  const handleAddRole = () => {
    if (roleFields.length >= 10) {
      toast.error("역할은 최대 10개까지 추가할 수 있습니다.");
      return;
    }
    const newRole = { roleType: "producer" as any };
    
    setFormInputs(prev => ({
      ...prev,
      roles: [...(prev.roles || []), newRole]
    }));
    
    appendRole(newRole);
  };

  const handleAddExpertise = () => {
    if (expertiseFields.length >= 5) {
      toast.error("전문 영역은 최대 5개까지 추가할 수 있습니다.");
      return;
    }
    const newExpertise = { expertiseField: "movie" as any, skillGrade: 5 };
    
    setFormInputs(prev => ({
      ...prev,
      expertise: [...(prev.expertise || []), newExpertise]
    }));
    
    appendExpertise(newExpertise);
  };

  // 역할 변경 핸들러
  const handleRoleChange = (index: number, field: 'roleType' | 'roleOther', value: string) => {
    setFormInputs(prev => {
      const newRoles = [...(prev.roles || [])];
      newRoles[index] = { ...newRoles[index], [field]: value } as any;
      return { ...prev, roles: newRoles };
    });
    
    setValue(`roles.${index}.${field}` as any, value, { shouldValidate: true });
    console.log(`Role ${index} ${field} changed: ${value}`);
  };

  // 전문영역 변경 핸들러
  const handleExpertiseChange = (index: number, field: string, value: any) => {
    setFormInputs(prev => {
      const newExpertise = [...(prev.expertise || [])];
      newExpertise[index] = { ...newExpertise[index], [field]: value };
      return { ...prev, expertise: newExpertise };
    });
    
    setValue(`expertise.${index}.${field}` as any, value, { shouldValidate: true });
    console.log(`Expertise ${index} ${field} changed: ${value}`);
  };

  const handleImageUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      if (!isValidImageFile(file)) {
        setErrorMessage("이미지 파일만 업로드 가능합니다. (JPEG, PNG, GIF, WebP)");
        return;
      }

      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        setErrorMessage(`파일 크기가 너무 큽니다. 최대 5MB까지 업로드 가능합니다. (현재: ${formatFileSize(file.size)})`);
        return;
      }

      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
      setUploadedImage(file);
      setErrorMessage(null);
    },
    []
  );

  // 탭 전환 시 현재 상태 로깅
  useEffect(() => {
    console.log("Current tab:", activeTab);
    console.log("Current form values:", formInputs);
  }, [activeTab, formInputs]);

  const handleNextStep = async () => {
    const isValid = await trigger(["name", "email"]);
    console.log("Validation result:", isValid);
    console.log("Moving to expertise tab with data:", formInputs);
    
    if (!isValid) return;
    setActiveTab("expertise");
  };

  const handlePrevStep = () => {
    console.log("Moving back to basic tab with data:", formInputs);
    setActiveTab("basic");
  };

  const onSubmit = async (data: StaffFormData) => {
    console.log("Form data from RHF:", data);
    console.log("Local form inputs:", formInputs);
    
    // 로컬 상태와 RHF 데이터 병합
    const submitData = {
      ...formInputs,
      ...data,
      name: data.name || formInputs.name,
      gender: data.gender || formInputs.gender,
      location: data.location || formInputs.location,
      skillLevel: data.skillLevel || formInputs.skillLevel,
      phone: data.phone || formInputs.phone,
      email: data.email || formInputs.email,
      memo: data.memo || formInputs.memo,
      roles: data.roles || formInputs.roles,
      expertise: data.expertise || formInputs.expertise,
    } as StaffFormData;

    setErrorMessage(null);

    console.log("Final submit data:", submitData);

    // 클라이언트 사이드 검증
    if (!submitData.name || !submitData.name.trim()) {
      setErrorMessage("스태프 이름은 필수입니다.");
      setActiveTab("basic");
      return;
    }

    if (submitData.email && !validateEmail(submitData.email)) {
      setErrorMessage("유효한 이메일 주소를 입력해주세요.");
      setActiveTab("basic");
      return;
    }

    if (submitData.gender && !isValidGender(submitData.gender)) {
      setErrorMessage("유효하지 않은 성별이 선택되었습니다.");
      setActiveTab("basic");
      return;
    }

    // 역할 검증
    const roles = safeArray(submitData.roles);
    for (const role of roles) {
      if (!role.roleType) {
        setErrorMessage("역할 타입은 필수입니다.");
        setActiveTab("expertise");
        return;
      }
      if (role.roleType === 'other' && !role.roleOther) {
        setErrorMessage("기타 역할을 선택한 경우 상세 내용을 입력해주세요.");
        setActiveTab("expertise");
        return;
      }
    }

    // 전문영역 검증
    const expertise = safeArray(submitData.expertise);
    for (const exp of expertise) {
      if (!exp.expertiseField) {
        setErrorMessage("전문 영역은 필수입니다.");
        setActiveTab("expertise");
        return;
      }
      if (exp.expertiseField === 'other' && !exp.expertiseFieldOther) {
        setErrorMessage("기타 전문영역을 선택한 경우 상세 내용을 입력해주세요.");
        setActiveTab("expertise");
        return;
      }
      if (exp.skillGrade < 1 || exp.skillGrade > 9) {
        setErrorMessage("스킬 등급은 1-9 사이의 값이어야 합니다.");
        setActiveTab("expertise");
        return;
      }
    }

    try {
      const createdStaff = await createStaffMutation.mutateAsync(submitData);

      if (uploadedImage && createdStaff) {
        try {
          const uploadImage = async (staffId: number, file: File) => {
            const formData = new FormData();
            formData.append('file', file);
            
            const response = await fetch(
              `/admin/api/staffs/${staffId}/profile-image`,
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
          
          await uploadImage(createdStaff.id, uploadedImage);
        } catch (uploadError) {
          console.error("Profile image upload error:", uploadError);
          toast.error("스태프 정보는 생성되었으나, 프로필 이미지 업로드에 실패했습니다.");
        }
      }

      toast.success("스태프가 성공적으로 등록되었습니다.");
      router.push(`/staffs/${createdStaff.id}`);
    } catch (error) {
      console.error("Error creating staff:", error);
      const errorMsg = error instanceof Error ? error.message : "스태프 등록 중 오류가 발생했습니다.";
      setErrorMessage(errorMsg);
      toast.error(errorMsg);
    }
  };

  return (
    <div className="max-w-[1200px] mx-auto py-10">
      <Card className="shadow-md border border-gray-300 hover:shadow-lg transition-all duration-300 rounded-xl overflow-hidden">
        <CardHeader className="p-4 pb-2 bg-white">
          <CardTitle className="text-2xl font-bold text-[#333333] flex items-center">
            <Briefcase className="h-6 w-6 mr-2 text-[#ff6246]" />
            새 스태프 등록
          </CardTitle>
          <CardDescription>
            새로운 스태프를 등록합니다. 기본 정보, 역할 및 전문 영역을 입력해주세요.
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
                  <span className="text-xs font-medium">역할 & 전문영역</span>
                </button>
              </div>
            </div>

            {activeTab === "basic" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-sm font-medium flex items-center">
                        <User className="h-4 w-4 mr-1 text-[#4da34c]" />
                        스태프 이름 <span className="text-red-500 ml-1">*</span>
                      </Label>
                      <Input
                        id="name"
                        placeholder="스태프 이름을 입력하세요"
                        className="border-gray-300 focus:ring-[#4da34c] focus:border-[#4da34c]"
                        value={formInputs.name || ""}
                        onChange={handleNameChange}
                        aria-invalid={errors.name ? "true" : "false"}
                      />
                      {errors.name && (
                        <p className="text-sm text-red-500">{errors.name.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="gender" className="text-sm font-medium">성별</Label>
                      <Select
                        value={formInputs.gender || "prefer_not_to_say"}
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
                      <Label htmlFor="location" className="text-sm font-medium flex items-center">
                        <MapPin className="h-4 w-4 mr-1 text-[#4da34c]" />
                        지역
                      </Label>
                      <Input
                        id="location"
                        placeholder="활동 지역을 입력하세요"
                        className="border-gray-300 focus:ring-[#4da34c] focus:border-[#4da34c]"
                        value={formInputs.location || ""}
                        onChange={handleInputChange}
                      />
                      {errors.location && (
                        <p className="text-sm text-red-500">{errors.location.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="skillLevel" className="text-sm font-medium">스킬 레벨</Label>
                      <Select 
                        value={formInputs.skillLevel?.toString() || "1"} 
                        onValueChange={handleSkillLevelChange}
                      >
                        <SelectTrigger className="w-full border-gray-300 focus:ring-[#4da34c] focus:border-[#4da34c]">
                          <SelectValue placeholder="스킬 레벨 선택" />
                        </SelectTrigger>
                        <SelectContent>
                          {SKILL_LEVEL_OPTIONS.map((skillLevel) => (
                            <SelectItem key={skillLevel.value} value={skillLevel.value.toString()}>
                              {skillLevel.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-sm font-medium flex items-center">
                        <Phone className="h-4 w-4 mr-1 text-[#4da34c]" />
                        전화번호
                      </Label>
                      <Input
                        id="phone"
                        placeholder="전화번호를 입력하세요"
                        className="border-gray-300 focus:ring-[#4da34c] focus:border-[#4da34c]"
                        value={formInputs.phone || ""}
                        onChange={handleInputChange}
                      />
                      {errors.phone && (
                        <p className="text-sm text-red-500">{errors.phone.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-sm font-medium flex items-center">
                        <Mail className="h-4 w-4 mr-1 text-[#4da34c]" />
                        이메일
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="이메일을 입력하세요"
                        className="border-gray-300 focus:ring-[#4da34c] focus:border-[#4da34c]"
                        value={formInputs.email || ""}
                        onChange={handleInputChange}
                      />
                      {errors.email && (
                        <p className="text-sm text-red-500">{errors.email.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">프로필 이미지</Label>
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
                                {uploadedImage.name} ({formatFileSize(uploadedImage.size)})
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
                              <p className="text-xs text-gray-500">JPG, PNG, GIF, WebP 파일 (최대 5MB)</p>
                            </div>
                            <Input
                              id="profileImage"
                              type="file"
                              accept="image/jpeg,image/png,image/gif,image/webp"
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
                  <Label htmlFor="memo" className="text-sm font-medium">메모</Label>
                  <Textarea
                    id="memo"
                    placeholder="메모를 입력하세요"
                    className="min-h-[120px] border-gray-300 focus:ring-[#4da34c] focus:border-[#4da34c]"
                    value={formInputs.memo || ""}
                    onChange={handleMemoChange}
                  />
                </div>

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
                  <Button
                    type="button"
                    onClick={handleNextStep}
                    className="px-6 bg-[#4da34c] hover:bg-[#3d8c3c]"
                  >
                    다음: 역할 & 전문영역
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {activeTab === "expertise" && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium">역할</h3>
                    <Button
                      type="button"
                      onClick={handleAddRole}
                      className="bg-[#4da34c] hover:bg-[#3d8c3c]"
                      disabled={roleFields.length >= 10}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      역할 추가
                    </Button>
                  </div>

                  {roleFields.map((field, index) => (
                    <Card key={field.id} className="border border-gray-200">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-center mb-4">
                          <h4 className="font-medium">역할 #{index + 1}</h4>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              removeRole(index);
                              setFormInputs(prev => ({
                                ...prev,
                                roles: prev.roles?.filter((_, i) => i !== index)
                              }));
                            }}
                            disabled={roleFields.length <= 1}
                            className="h-8 w-8 hover:bg-red-50 hover:text-red-500"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">역할 타입</Label>
                            <Select 
                              value={formInputs.roles?.[index]?.roleType || "producer"} 
                              onValueChange={(value) => handleRoleChange(index, "roleType", value)}
                            >
                              <SelectTrigger className="w-full border-gray-300 focus:ring-[#4da34c] focus:border-[#4da34c]">
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
                          </div>

                          {formInputs.roles?.[index]?.roleType === "other" && (
                            <div className="space-y-2">
                              <Label className="text-sm font-medium">기타 역할 설명</Label>
                              <Input
                                placeholder="역할을 설명해주세요"
                                className="border-gray-300 focus:ring-[#4da34c] focus:border-[#4da34c]"
                                value={formInputs.roles?.[index]?.roleOther || ""}
                                onChange={(e) => handleRoleChange(index, "roleOther", e.target.value)}
                              />
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium">전문 영역</h3>
                    <Button
                      type="button"
                      onClick={handleAddExpertise}
                      className="bg-[#4da34c] hover:bg-[#3d8c3c]"
                      disabled={expertiseFields.length >= 5}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      전문 영역 추가
                    </Button>
                  </div>

                  {expertiseFields.map((field, index) => (
                    <Card key={field.id} className="border border-gray-200">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-center mb-4">
                          <h4 className="font-medium">전문 영역 #{index + 1}</h4>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              removeExpertise(index);
                              setFormInputs(prev => ({
                                ...prev,
                                expertise: prev.expertise?.filter((_, i) => i !== index)
                              }));
                            }}
                            disabled={expertiseFields.length <= 1}
                            className="h-8 w-8 hover:bg-red-50 hover:text-red-500"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">전문 영역</Label>
                            <Select 
                              value={formInputs.expertise?.[index]?.expertiseField || "movie"} 
                              onValueChange={(value) => handleExpertiseChange(index, "expertiseField", value)}
                            >
                              <SelectTrigger className="w-full border-gray-300 focus:ring-[#4da34c] focus:border-[#4da34c]">
                                <SelectValue placeholder="전문 영역 선택" />
                              </SelectTrigger>
                              <SelectContent>
                                {EXPERTISE_FIELD_OPTIONS.map((option) => (
                                  <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {formInputs.expertise?.[index]?.expertiseField === "other" && (
                            <div className="space-y-2">
                              <Label className="text-sm font-medium">기타 전문 영역 설명</Label>
                              <Input
                                placeholder="전문 영역을 설명해주세요"
                                className="border-gray-300 focus:ring-[#4da34c] focus:border-[#4da34c]"
                                value={formInputs.expertise?.[index]?.expertiseFieldOther || ""}
                                onChange={(e) => handleExpertiseChange(index, "expertiseFieldOther", e.target.value)}
                              />
                            </div>
                          )}

                          <div className="space-y-2">
                            <Label className="text-sm font-medium">스킬 등급 (1-9)</Label>
                            <div className="flex items-center space-x-2">
                              <input
                                type="range"
                                min="1"
                                max="9"
                                step="1"
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                value={formInputs.expertise?.[index]?.skillGrade || 5}
                                onChange={(e) => handleExpertiseChange(index, "skillGrade", parseInt(e.target.value))}
                              />
                              <div className="flex items-center min-w-[100px]">
                                <GradeDisplay 
                                  skillGrade={formInputs.expertise?.[index]?.skillGrade || 5} 
                                  showText={false} 
                                  size="sm" 
                                />
                              </div>
                              <span className="font-medium min-w-[40px] text-center">
                                {formInputs.expertise?.[index]?.skillGrade || 5}/9
                              </span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

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
                      disabled={isSubmitting || createStaffMutation.isPending}
                      className="bg-[#4da34c] hover:bg-[#3d8c3c]"
                    >
                      {(isSubmitting || createStaffMutation.isPending) ? (
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

export default function ProtectedCreateStaffPage() {
  return (
    <ProtectedRoute>
      <CreateStaffPage />
    </ProtectedRoute>
  );
}
