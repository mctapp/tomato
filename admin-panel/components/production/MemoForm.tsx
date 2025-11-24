// components/production/MemoForm.tsx

'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { fetchApi } from '@/lib/api';

// ── 타입 정의 ──────────────────────────────────────────────────────────

interface ProductionMemo {
  id: number;
  productionProjectId: number;
  productionTaskId?: number | null;
  memoContent: string;
  memoType: string;
  priorityLevel: number;
  tags: string[];
  isPinned: boolean;
}

interface MemoFormProps {
  projectId: number;
  taskId?: number | null;
  editingMemo?: ProductionMemo | null;
  onSuccess: () => void;
  onCancel: () => void;
}

// ── 폼 스키마 ──────────────────────────────────────────────────────────

const memoFormSchema = z.object({
  memoContent: z.string()
    .min(1, '메모 내용을 입력해주세요.')
    .max(10000, '메모는 10,000자를 초과할 수 없습니다.'),
  memoType: z.enum(['general', 'issue', 'decision', 'review']),
  priorityLevel: z.number().min(1).max(5),
  tags: z.string().optional(),
  isPinned: z.boolean(),
});

type MemoFormData = z.infer<typeof memoFormSchema>;

// ── 상수 정의 (토마토 색상 계열) ──────────────────────────────────────────

// 배열 확인 헬퍼
const ensureArray = (value: any): string[] => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string' && value) return value.split(',').map(s => s.trim());
  return [];
};

const MEMO_TYPES = [
  { value: 'general', label: '일반', color: 'bg-gray-50 text-gray-700' },
  { value: 'issue', label: '이슈', color: 'bg-red-50 text-[#c75146]' },
  { value: 'decision', label: '결정', color: 'bg-[#e6f4e6] text-[#4da34c]' },
  { value: 'review', label: '검토', color: 'bg-orange-50 text-[#ff8c42]' },
];

const PRIORITY_LABELS: Record<number, string> = {
  1: '최소',
  2: '낮음',
  3: '보통',
  4: '높음',
  5: '긴급',
};

const PRIORITY_COLORS: Record<number, string> = {
  1: 'text-gray-500',
  2: 'text-gray-600',
  3: 'text-[#f9c784]',
  4: 'text-[#ff8c42]',
  5: 'text-[#ff6246]',
};

// ── 메인 컴포넌트 ──────────────────────────────────────────────────────

export default function MemoForm({
  projectId,
  taskId,
  editingMemo,
  onSuccess,
  onCancel,
}: MemoFormProps) {
  const queryClient = useQueryClient();
  const isEdit = !!editingMemo;

  const form = useForm<MemoFormData>({
    resolver: zodResolver(memoFormSchema),
    defaultValues: {
      memoContent: editingMemo?.memoContent || '',
      memoType: (editingMemo?.memoType as 'general' | 'issue' | 'decision' | 'review') || 'general',
      priorityLevel: editingMemo?.priorityLevel || 3,
      tags: editingMemo ? ensureArray(editingMemo.tags).join(', ') : '',
      isPinned: editingMemo?.isPinned || false,
    },
  });

  const createMemoMutation = useMutation({
    mutationFn: async (data: MemoFormData) => {
      const tagsArray = data.tags
        ? data.tags.split(',').map(tag => tag.trim()).filter(tag => tag)
        : [];

      const payload = {
        productionProjectId: projectId,
        productionTaskId: taskId || null,
        memoContent: data.memoContent,
        memoType: data.memoType,
        priorityLevel: data.priorityLevel,
        tags: tagsArray.join(','),
        isPinned: data.isPinned,
      };

      await fetchApi('/admin/api/production/memos', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      toast.success('메모가 생성되었습니다.');
      // 칸반보드 데이터 새로고침
      queryClient.invalidateQueries({ queryKey: ['production-kanban'] });
      onSuccess();
    },
    onError: () => {
      toast.error('메모 생성에 실패했습니다.');
    },
  });

  const updateMemoMutation = useMutation({
    mutationFn: async (data: MemoFormData) => {
      const tagsArray = data.tags
        ? data.tags.split(',').map(tag => tag.trim()).filter(tag => tag)
        : [];

      const payload = {
        memoContent: data.memoContent,
        memoType: data.memoType,
        priorityLevel: data.priorityLevel,
        tags: tagsArray.join(','),
        isPinned: data.isPinned,
      };

      await fetchApi(`/admin/api/production/memos/${editingMemo?.id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      toast.success('메모가 수정되었습니다.');
      // 칸반보드 데이터 새로고침
      queryClient.invalidateQueries({ queryKey: ['production-kanban'] });
      onSuccess();
    },
    onError: () => {
      toast.error('메모 수정에 실패했습니다.');
    },
  });

  const onSubmit = (data: MemoFormData) => {
    if (isEdit) {
      updateMemoMutation.mutate(data);
    } else {
      createMemoMutation.mutate(data);
    }
  };

  const priorityLevel = form.watch('priorityLevel');
  const memoType = form.watch('memoType');

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* 메모 내용 */}
        <FormField
          control={form.control}
          name="memoContent"
          render={({ field }) => (
            <FormItem>
              <FormLabel>메모 내용</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder="메모를 입력하세요..."
                  className="min-h-[150px] resize-y"
                />
              </FormControl>
              <FormDescription>
                {field.value.length}/10,000자
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* 메모 타입 */}
        <FormField
          control={form.control}
          name="memoType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>메모 타입</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  className="flex gap-4"
                >
                  {MEMO_TYPES.map(type => (
                    <div key={type.value} className="flex items-center space-x-2">
                      <RadioGroupItem 
                        value={type.value} 
                        id={type.value} 
                        className="sr-only"
                      />
                      <label
                        htmlFor={type.value}
                        className={`cursor-pointer px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                          memoType === type.value 
                            ? `${type.color} border-transparent` 
                            : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {type.label}
                      </label>
                    </div>
                  ))}
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* 우선순위 */}
        <FormField
          control={form.control}
          name="priorityLevel"
          render={({ field }) => (
            <FormItem>
              <div className="flex justify-between items-center mb-2">
                <FormLabel>우선순위</FormLabel>
                <span className={`text-sm font-medium ${PRIORITY_COLORS[priorityLevel]}`}>
                  {PRIORITY_LABELS[priorityLevel]}
                </span>
              </div>
              <FormControl>
                <Slider
                  min={1}
                  max={5}
                  step={1}
                  value={[field.value]}
                  onValueChange={(value) => field.onChange(value[0])}
                  className="w-full [&_[role=slider]]:bg-[#4da34c] [&_[role=slider]]:border-[#4da34c] [&>span>span]:bg-[#4da34c]"
                />
              </FormControl>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>최소</span>
                <span>낮음</span>
                <span>보통</span>
                <span>높음</span>
                <span>긴급</span>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* 태그 */}
        <FormField
          control={form.control}
          name="tags"
          render={({ field }) => (
            <FormItem>
              <FormLabel>태그</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="태그1, 태그2, 태그3 (쉼표로 구분)"
                />
              </FormControl>
              <FormDescription>
                쉼표로 구분하여 여러 태그를 입력할 수 있습니다.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* 핀 고정 */}
        <FormField
          control={form.control}
          name="isPinned"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">핀 고정</FormLabel>
                <FormDescription>
                  핀 고정된 메모는 목록 최상단에 표시됩니다.
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  className="data-[state=checked]:bg-[#4da34c]"
                />
              </FormControl>
            </FormItem>
          )}
        />

        {/* 버튼 */}
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={createMemoMutation.isPending || updateMemoMutation.isPending}
          >
            취소
          </Button>
          <Button
            type="submit"
            disabled={createMemoMutation.isPending || updateMemoMutation.isPending}
            className="bg-[#ff6246] hover:bg-[#e55439] text-white"
          >
            {createMemoMutation.isPending || updateMemoMutation.isPending
              ? '저장 중...'
              : isEdit
              ? '수정'
              : '생성'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
