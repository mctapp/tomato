// components/distributors/DistributorForm.tsx
"use client";

import { useForm, useFieldArray, Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

// 연락처 스키마 정의
const contactSchema = z.object({
  id: z.number().optional(),
  name: z.string().min(1, '담당자 이름을 입력하세요'),
  position: z.string().optional(),
  department: z.string().optional(),
  email: z.string().email('유효한 이메일을 입력하세요').optional().or(z.literal('')),
  officePhone: z.string().optional(),
  mobilePhone: z.string().optional(),
  isPrimary: z.boolean(),
  notes: z.string().optional(),
});

// 배급사 스키마 정의
const distributorSchema = z.object({
  name: z.string().min(1, '배급사 이름을 입력하세요'),
  isActive: z.boolean(),
  businessRegistrationNumber: z.string().optional(),
  address: z.string().optional(),
  website: z.string().optional(),
  ceoName: z.string().optional(),
  notes: z.string().optional(),
  taxInvoiceEmail: z.string().email('유효한 이메일을 입력하세요').optional().or(z.literal('')),
  bankName: z.string().optional(),
  bankAccountNumber: z.string().optional(),
  accountHolderName: z.string().optional(),
  settlementCycle: z.string().optional(),
  defaultRevenueShare: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? undefined : Number(val)),
    z.number().min(0).max(100).optional()
  ),
  paymentMethod: z.string().optional(),
  contacts: z.array(contactSchema),
});

// 타입 정의
export type DistributorFormData = z.infer<typeof distributorSchema>;

interface DistributorFormProps {
  onSubmit: (data: DistributorFormData) => Promise<void>;
  defaultValues?: Partial<DistributorFormData & { id?: number }>;
  isLoading?: boolean;
}

export function DistributorForm({ onSubmit, defaultValues, isLoading }: DistributorFormProps) {
  const router = useRouter();
  
  const form = useForm<DistributorFormData>({
    resolver: zodResolver(distributorSchema) as Resolver<DistributorFormData, any>,
    defaultValues: {
      name: '',
      isActive: true,
      contacts: [],
      ...defaultValues,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "contacts"
  });

  const addContact = () => {
    append({
      name: '',
      isPrimary: fields.length === 0,
      position: '',
      department: '',
      email: '',
      officePhone: '',
      mobilePhone: '',
      notes: ''
    });
  };

  // 주 담당자 단일 선택 로직
  const handlePrimaryToggle = (index: number) => {
    form.setValue("contacts", form.getValues("contacts").map((contact, i) => ({
      ...contact,
      isPrimary: i === index
    })));
  };

  // 폼 제출 시 검증
  const validateContacts = () => {
    const contacts = form.getValues("contacts");
    const primaryCount = contacts.filter(c => c.isPrimary).length;

    if (primaryCount > 1) {
      form.setError("contacts", { message: "주 담당자는 하나만 선택 가능합니다" });
      return false;
    }

    if (contacts.length > 0 && primaryCount === 0) {
      form.setError("contacts", { message: "최소 한 명의 주 담당자를 지정해야 합니다" });
      return false;
    }

    return true;
  };

  const handleSubmit = async (data: DistributorFormData) => {
    if (!validateContacts()) return;
    
    // 디버깅을 위한 데이터 로깅
    console.log("제출 데이터:", JSON.stringify(data, null, 2));
    
    await onSubmit(data);
  };

  const isEditing = !!defaultValues?.id;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>기본 정보</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>배급사명</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel>활성 상태</FormLabel>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="businessRegistrationNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>사업자등록번호</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value || ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>주소</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value || ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* 배급사 메모 필드 추가 */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>메모</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      value={field.value || ''} 
                      placeholder="배급사 관련 추가 정보를 입력하세요"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>정산 정보</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <FormField
              control={form.control}
              name="bankName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>은행명</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value || ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="bankAccountNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>계좌번호</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value || ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="defaultRevenueShare"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>기본 수익 분배율 (%)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      {...field}
                      value={field.value === undefined ? '' : field.value}
                      onChange={e => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              담당자 정보
              <Button type="button" variant="outline" size="sm" onClick={addContact}>
                <Plus className="h-4 w-4 mr-2" />
                담당자 추가
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {fields.length === 0 ? (
              <div className="text-center py-4 text-gray-500">
                등록된 담당자가 없습니다. '담당자 추가' 버튼을 클릭하여 담당자를 추가하세요.
              </div>
            ) : (
              <>
                {form.formState.errors.contacts?.message && (
                  <div className="mb-4 text-red-500 text-sm">
                    {form.formState.errors.contacts.message}
                  </div>
                )}

                {fields.map((field, index) => (
                  <div key={field.id} className="border rounded-lg p-4 mb-4">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="text-sm font-medium">담당자 #{index + 1}</h4>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => remove(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name={`contacts.${index}.name`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>이름</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`contacts.${index}.position`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>직책</FormLabel>
                            <FormControl>
                              <Input {...field} value={field.value || ''} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`contacts.${index}.department`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>부서</FormLabel>
                            <FormControl>
                              <Input {...field} value={field.value || ''} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`contacts.${index}.email`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>이메일</FormLabel>
                            <FormControl>
                              <Input {...field} value={field.value || ''} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`contacts.${index}.mobilePhone`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>휴대폰</FormLabel>
                            <FormControl>
                              <Input {...field} value={field.value || ''} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`contacts.${index}.officePhone`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>사무실 전화</FormLabel>
                            <FormControl>
                              <Input {...field} value={field.value || ''} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`contacts.${index}.isPrimary`}
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between rounded-lg border p-4 col-span-2">
                            <div className="space-y-0.5">
                              <FormLabel>기본 담당자</FormLabel>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={checked => {
                                  if (checked) {
                                    handlePrimaryToggle(index);
                                  } else {
                                    field.onChange(false);
                                  }
                                }}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      
                      {/* 담당자 메모 필드 추가 */}
                      <FormField
                        control={form.control}
                        name={`contacts.${index}.notes`}
                        render={({ field }) => (
                          <FormItem className="col-span-2">
                            <FormLabel>메모</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                value={field.value || ''} 
                                placeholder="담당자 관련 메모를 입력하세요"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                ))}
              </>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            취소
          </Button>
          <Button
            type="submit"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                처리 중...
              </>
            ) : (
              isEditing ? '수정' : '등록'
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
