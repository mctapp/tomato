// app/components/accessibility/media/AccessAssetForm.tsx
import React, { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { getLanguageDisplay } from '@/lib/utils/languages';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { 
  accessAssetBaseSchema, 
  AccessAssetCreate, 
  AccessAssetUpdate,
  AccessAssetResponse,
  MEDIA_TYPES,
  LANGUAGES,
  ASSET_TYPES
} from '@/types/accessAsset';

interface AccessAssetFormProps {
  asset?: AccessAssetResponse;
  movies: { id: number; title: string }[];
  guidelines: { id: number; name: string }[];
  onSubmit: (data: AccessAssetCreate | AccessAssetUpdate) => void;
  isSubmitting: boolean;
}

// 변환된 폼 스키마
const formSchema = accessAssetBaseSchema
  .extend({
    movieId: z.coerce.number(),  // 문자열에서 숫자로 변환
    guidelineId: z.coerce.number().nullable().optional(),
    productionYear: z.coerce.number().nullable().optional(),
  })
  .partial();

export function AccessAssetForm({
  asset,
  movies,
  guidelines,
  onSubmit,
  isSubmitting
}: AccessAssetFormProps) {
  // 폼 설정
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: asset ? {
      movieId: asset.movieId,
      mediaType: asset.mediaType,
      language: asset.language,
      assetType: asset.assetType,
      name: asset.name,
      guidelineId: asset.guidelineId || null,
      productionYear: asset.productionYear || null,
      supportedOs: asset.supportedOs || [],
      isPublic: asset.isPublic,
      isLocked: asset.isLocked,
      publishingStatus: asset.publishingStatus,
      accessPolicy: asset.accessPolicy,
      productionStatus: asset.productionStatus,
    } : {
      movieId: undefined,
      mediaType: 'AD',
      language: 'ko',
      assetType: 'description',
      name: '',
      guidelineId: null,
      productionYear: new Date().getFullYear(),
      supportedOs: [],
      isPublic: false,
      isLocked: true,
      publishingStatus: 'draft',
      accessPolicy: 'private',
      productionStatus: 'planning',
    }
  });

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    onSubmit(values);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>기본 정보</CardTitle>
            <CardDescription>
              접근성 미디어 자산의 기본 정보를 입력하세요
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 영화 선택 */}
            <FormField
              control={form.control}
              name="movieId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>영화</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(parseInt(value))}
                    value={field.value?.toString()}
                    disabled={!!asset}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="영화 선택" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {movies.map((movie) => (
                        <SelectItem key={movie.id} value={movie.id.toString()}>
                          {movie.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 미디어 이름 */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>미디어 이름</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="미디어 이름을 입력하세요" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 미디어 타입 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="mediaType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>미디어 타입</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={!!asset}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="미디어 타입 선택" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {MEDIA_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 언어 */}
              <FormField
                control={form.control}
                name="language"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>언어</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="언어 선택" />
                        </SelectTrigger>
                      </FormControl>
<SelectContent>
  {LANGUAGES.map((lang) => (
    <SelectItem key={lang} value={lang}>
      {getLanguageDisplay(lang)}
    </SelectItem>
  ))}
</SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 자산 유형 */}
              <FormField
                control={form.control}
                name="assetType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>자산 유형</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="자산 유형 선택" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ASSET_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type === 'description' ? '설명' :
                             type === 'introduction' ? '소개' :
                             type === 'review' ? '리뷰' : type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* 제작 연도 & 가이드라인 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 제작 연도 */}
              <FormField
                control={form.control}
                name="productionYear"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>제작 연도</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        value={field.value || ''}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                        placeholder="제작 연도"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 가이드라인 */}
              <FormField
                control={form.control}
                name="guidelineId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>가이드라인</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(value ? parseInt(value) : null)}
                      value={field.value?.toString() || ''}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="가이드라인 선택" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">선택 안함</SelectItem>
                        {guidelines.map((guideline) => (
                          <SelectItem key={guideline.id} value={guideline.id.toString()}>
                            {guideline.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* 지원 OS */}
            <FormField
              control={form.control}
              name="supportedOs"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>지원 OS</FormLabel>
                  <div className="flex space-x-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="ios"
                        checked={field.value?.includes('iOS')}
                        onCheckedChange={(checked) => {
                          const currentValue = field.value || [];
                          if (checked) {
                            field.onChange([...currentValue, 'iOS']);
                          } else {
                            field.onChange(currentValue.filter(val => val !== 'iOS'));
                          }
                        }}
                      />
                      <label htmlFor="ios" className="text-sm">iOS</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="android"
                        checked={field.value?.includes('Android')}
                        onCheckedChange={(checked) => {
                          const currentValue = field.value || [];
                          if (checked) {
                            field.onChange([...currentValue, 'Android']);
                          } else {
                            field.onChange(currentValue.filter(val => val !== 'Android'));
                          }
                        }}
                      />
                      <label htmlFor="android" className="text-sm">Android</label>
                    </div>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>게시 설정</CardTitle>
            <CardDescription>
              접근성 미디어 자산의 공개 및 접근 설정을 입력하세요
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 공개 여부 */}
            <FormField
              control={form.control}
              name="isPublic"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>공개</FormLabel>
                    <p className="text-sm text-gray-500">
                      이 자산을 공개적으로 접근 가능하게 설정합니다
                    </p>
                  </div>
                </FormItem>
              )}
            />

            {/* 잠금 여부 */}
            <FormField
              control={form.control}
              name="isLocked"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>잠금</FormLabel>
                    <p className="text-sm text-gray-500">
                      이 자산의 접근을 요청 기반으로 제한합니다
                    </p>
                  </div>
                </FormItem>
              )}
            />

            {/* 게시 상태 */}
            <FormField
              control={form.control}
              name="publishingStatus"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>게시 상태</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="게시 상태 선택" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="draft">초안</SelectItem>
                      <SelectItem value="review">검토 중</SelectItem>
                      <SelectItem value="published">게시됨</SelectItem>
                      <SelectItem value="archived">보관됨</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 접근 정책 */}
            <FormField
              control={form.control}
              name="accessPolicy"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>접근 정책</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="접근 정책 선택" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="private">비공개</SelectItem>
                      <SelectItem value="public">공개</SelectItem>
                      <SelectItem value="restricted">제한적</SelectItem>
                      <SelectItem value="educational">교육용</SelectItem>
                      <SelectItem value="commercial">상업용</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 제작 상태 */}
            <FormField
              control={form.control}
              name="productionStatus"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>제작 상태</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="제작 상태 선택" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="planning">계획 중</SelectItem>
                      <SelectItem value="in_progress">진행 중</SelectItem>
                      <SelectItem value="completed">완료됨</SelectItem>
                      <SelectItem value="delayed">지연됨</SelectItem>
                      <SelectItem value="cancelled">취소됨</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end space-x-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => window.history.back()}
          >
            취소
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? '처리 중...' : (asset ? '업데이트' : '생성')}
          </Button>
        </div>
      </form>
    </Form>
  );
}
