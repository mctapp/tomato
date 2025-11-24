"use client";

import React from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2 } from 'lucide-react';
import { GuidelineFileUpload } from './GuidelineFileUpload';

// 폼 스키마 정의
const formSchema = z.object({
  name: z.string().min(1, "이름을 입력해주세요."),
  type: z.enum(["AD", "CC", "SL"], {
    required_error: "유형을 선택해주세요.",
  }),
  field: z.enum(["movie", "exhibition", "theater", "musical", "concert", "other"], {
    required_error: "분야를 선택해주세요.",
  }),
  field_other: z.string().optional(),
  version: z.string().min(1, "버전을 입력해주세요."),
  contents: z.array(
    z.object({
      category: z.string().min(1, "구분을 입력해주세요."),
      content: z.string().min(1, "내용을 입력해주세요.")
    })
  ).optional(),
  feedbacks: z.array(
    z.object({
      feedback_type: z.enum(["non_disabled", "visually_impaired", "hearing_impaired"], {
        required_error: "대상자 유형을 선택해주세요."
      }),
      content: z.string().min(1, "내용을 입력해주세요.")
    })
  ).optional(),
  memos: z.array(
    z.object({
      content: z.string().min(1, "메모 내용을 입력해주세요.")
    })
  ).optional()
});

// 유효한 타입인지 확인하는 헬퍼 함수
const isValidType = (type: string): type is "AD" | "CC" | "SL" => {
  return ["AD", "CC", "SL"].includes(type);
};

const isValidField = (field: string): field is "movie" | "exhibition" | "theater" | "musical" | "concert" | "other" => {
  return ["movie", "exhibition", "theater", "musical", "concert", "other"].includes(field);
};

const isValidFeedbackType = (type: string): type is "non_disabled" | "visually_impaired" | "hearing_impaired" => {
  return ["non_disabled", "visually_impaired", "hearing_impaired"].includes(type);
};

interface GuidelineFormProps {
  initialData?: any;
  guidelineId?: number;
  onSubmit: (data: any) => void;
  isSubmitting: boolean;
  onFileUpload?: (fileData: any) => void;
}

export function GuidelineForm({ 
  initialData, 
  guidelineId, 
  onSubmit, 
  isSubmitting,
  onFileUpload 
}: GuidelineFormProps) {
  // 타입 검증 및 안전한 변환
  const safeInitialType = initialData?.type && isValidType(initialData.type) ? initialData.type : "AD";
  const safeInitialField = initialData?.field && isValidField(initialData.field) ? initialData.field : "movie";
  
  // 초기 데이터 준비 - feedbacks에 대한 기본값 설정
  const initialFeedbacks = initialData?.feedbacks?.map((feedback: any) => ({
    ...feedback,
    feedback_type: isValidFeedbackType(feedback.feedback_type) ? 
      feedback.feedback_type : "non_disabled"
  })) || [];
  
  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: initialData ? {
      name: initialData.name || "",
      type: safeInitialType,
      field: safeInitialField,
      field_other: initialData.field_other || "",
      version: initialData.version || "1.0",
      contents: initialData.contents || [],
      feedbacks: initialFeedbacks,
      memos: initialData.memos || []
    } : {
      name: "",
      type: "AD",
      field: "movie",
      field_other: "",
      version: "1.0",
      contents: [],
      feedbacks: [],
      memos: []
    }
  });
  
  // 동적 필드 배열 설정
  const { fields: contentFields, append: appendContent, remove: removeContent } = 
    useFieldArray({ control: form.control, name: "contents" });
  
  const { fields: feedbackFields, append: appendFeedback, remove: removeFeedback } = 
    useFieldArray({ control: form.control, name: "feedbacks" });
  
  const { fields: memoFields, append: appendMemo, remove: removeMemo } = 
    useFieldArray({ control: form.control, name: "memos" });

  // 수정: fileData 전체를 전달하도록 변경
  const handleFileUpdate = (fileData: any) => {
    if (onFileUpload) {
      onFileUpload(fileData);
    }
  };

  const handleFormSubmit = (data: any) => {
    // 필터링 및 번호 부여
    const formattedData = {
      ...data,
      contents: data.contents
        ?.filter((item: any) => item.category.trim() && item.content.trim())
        .map((item: any, index: number) => ({
          category: item.category,
          content: item.content,
          sequence_number: index + 1
        })) || [],
      feedbacks: data.feedbacks
        ?.filter((item: any) => item.feedback_type && item.content.trim())
        .map((item: any, index: number) => ({
          feedback_type: item.feedback_type,
          content: item.content,
          sequence_number: index + 1
        })) || [],
      memos: data.memos
        ?.filter((item: any) => item.content.trim())
        .map((item: any) => ({
          content: item.content
        })) || []
    };
    
    onSubmit(formattedData);
  };

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
          {/* 기본 정보 카드 */}
          <Card>
            <CardHeader>
              <CardTitle>가이드라인 기본 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>가이드라인 이름</FormLabel>
                    <FormControl>
                      <Input placeholder="가이드라인 이름을 입력하세요" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>유형</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="유형을 선택하세요" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="AD">음성해설(AD)</SelectItem>
                          <SelectItem value="CC">자막해설(CC)</SelectItem>
                          <SelectItem value="SL">수어해설(SL)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="version"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>버전</FormLabel>
                      <FormControl>
                        <Input placeholder="버전을 입력하세요" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="field"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>분야</FormLabel>
                      <Select 
                        onValueChange={(value) => {
                          field.onChange(value);
                          if (value !== "other") {
                            form.setValue("field_other", "");
                          }
                        }} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="분야를 선택하세요" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="movie">영화영상</SelectItem>
                          <SelectItem value="exhibition">전시회</SelectItem>
                          <SelectItem value="theater">연극</SelectItem>
                          <SelectItem value="musical">뮤지컬</SelectItem>
                          <SelectItem value="concert">콘서트</SelectItem>
                          <SelectItem value="other">기타</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {form.watch("field") === "other" && (
                  <FormField
                    control={form.control}
                    name="field_other"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>기타 분야</FormLabel>
                        <FormControl>
                          <Input placeholder="기타 분야를 입력하세요" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
            </CardContent>
          </Card>

          {/* 주요 변경 사항 */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>주요 변경 사항</CardTitle>
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={() => appendContent({ category: '', content: '' })}
              >
                <Plus className="h-4 w-4 mr-1" /> 항목 추가
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {contentFields.length === 0 && (
                <div className="text-muted-foreground text-center p-4">
                  변경 사항이 없습니다. 추가 버튼을 눌러 항목을 추가하세요.
                </div>
              )}
              
              {contentFields.map((field, index) => (
                <div key={field.id} className="space-y-4 p-4 border rounded-md relative">
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="icon" 
                    className="absolute top-2 right-2 h-6 w-6" 
                    onClick={() => removeContent(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  
                  <FormField
                    control={form.control}
                    name={`contents.${index}.category`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>구분</FormLabel>
                        <FormControl>
                          <Input placeholder="변경 사항 구분을 입력하세요" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name={`contents.${index}.content`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>내용</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="변경 사항 내용을 입력하세요"
                            rows={3}
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* 향후 개선 사항 */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>향후 개선 사항</CardTitle>
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={() => appendFeedback({ feedback_type: 'non_disabled', content: '' })}
              >
                <Plus className="h-4 w-4 mr-1" /> 항목 추가
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {feedbackFields.length === 0 && (
                <div className="text-muted-foreground text-center p-4">
                  개선 사항이 없습니다. 추가 버튼을 눌러 항목을 추가하세요.
                </div>
              )}
              
              {feedbackFields.map((field, index) => (
                <div key={field.id} className="space-y-4 p-4 border rounded-md relative">
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="icon" 
                    className="absolute top-2 right-2 h-6 w-6" 
                    onClick={() => removeFeedback(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  
                  <FormField
                    control={form.control}
                    name={`feedbacks.${index}.feedback_type`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>대상자 유형</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value || "non_disabled"}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="대상자 유형을 선택하세요" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="non_disabled">비장애인</SelectItem>
                            <SelectItem value="visually_impaired">시각장애인</SelectItem>
                            <SelectItem value="hearing_impaired">청각장애인</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name={`feedbacks.${index}.content`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>내용</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="개선 사항 내용을 입력하세요"
                            rows={3}
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* 메모 */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>메모</CardTitle>
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={() => appendMemo({ content: '' })}
              >
                <Plus className="h-4 w-4 mr-1" /> 메모 추가
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {memoFields.length === 0 && (
                <div className="text-muted-foreground text-center p-4">
                  메모가 없습니다. 추가 버튼을 눌러 메모를 추가하세요.
                </div>
              )}
              
              {memoFields.map((field, index) => (
                <div key={field.id} className="space-y-4 p-4 border rounded-md relative">
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="icon" 
                    className="absolute top-2 right-2 h-6 w-6" 
                    onClick={() => removeMemo(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  
                  <FormField
                    control={form.control}
                    name={`memos.${index}.content`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>메모 내용</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="메모 내용을 입력하세요"
                            rows={3}
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "저장 중..." : "저장"}
            </Button>
          </div>
        </form>
      </Form>
      
      {/* 수정: 파일 업로드 컴포넌트를 항상 표시 */}
      <GuidelineFileUpload 
        guidelineId={guidelineId || -1}
        initialFileUrl={initialData?.attachment}
        onFileUpdate={handleFileUpdate}
      />
    </div>
  );
}
