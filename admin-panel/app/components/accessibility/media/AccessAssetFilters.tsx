// app/components/accessibility/media/AccessAssetFilters.tsx
import React, { useState } from 'react';
import { 
  Card, 
  CardContent 
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  MEDIA_TYPES, 
  LANGUAGES,
  ASSET_TYPES,
  PUBLISHING_STATUSES 
} from '@/types/accessAsset';

interface AccessAssetFiltersProps {
  initialFilters?: any;
  onFilterChange: (filters: any) => void;
  movies: { id: number; title: string }[];
}

export function AccessAssetFilters({ 
  initialFilters = {}, 
  onFilterChange,
  movies 
}: AccessAssetFiltersProps) {
  const [filters, setFilters] = useState({
    movie_id: initialFilters.movie_id || '',
    media_types: initialFilters.media_types || [],
    languages: initialFilters.languages || [],
    asset_types: initialFilters.asset_types || [],
    publishing_status: initialFilters.publishing_status || '',
    is_public: initialFilters.is_public === undefined ? '' : String(initialFilters.is_public),
    search_term: initialFilters.search_term || '',
  });

  const handleFilterChange = (key: string, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleApplyFilters = () => {
    // 형식 변환 및 빈 필터 제거
    const cleanedFilters = Object.entries(filters).reduce((acc: any, [key, value]) => {
      if (value !== '' && value !== null && value !== undefined) {
        if (key === 'is_public') {
          acc[key] = value === 'true';
        } else {
          acc[key] = value;
        }
      }
      return acc;
    }, {});
    
    onFilterChange(cleanedFilters);
  };

  const handleResetFilters = () => {
    setFilters({
      movie_id: '',
      media_types: [],
      languages: [],
      asset_types: [],
      publishing_status: '',
      is_public: '',
      search_term: '',
    });
    
    onFilterChange({});
  };

  return (
    <Card className="mb-6">
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* 영화 필터 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">영화</label>
            <Select
              value={filters.movie_id}
              onValueChange={(value) => handleFilterChange('movie_id', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="영화 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">전체</SelectItem>
                {movies.map((movie) => (
                  <SelectItem key={movie.id} value={String(movie.id)}>
                    {movie.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 미디어 유형 필터 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">미디어 유형</label>
            <Select
              value={filters.media_types[0] || ''}
              onValueChange={(value) => handleFilterChange('media_types', value ? [value] : [])}
            >
              <SelectTrigger>
                <SelectValue placeholder="미디어 유형 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">전체</SelectItem>
                {MEDIA_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 언어 필터 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">언어</label>
            <Select
              value={filters.languages[0] || ''}
              onValueChange={(value) => handleFilterChange('languages', value ? [value] : [])}
            >
              <SelectTrigger>
                <SelectValue placeholder="언어 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">전체</SelectItem>
                {LANGUAGES.map((lang) => (
                  <SelectItem key={lang} value={lang}>
                    {lang === 'ko' ? '한국어' :
                     lang === 'en' ? '영어' :
                     lang === 'ja' ? '일본어' :
                     lang === 'zh' ? '중국어' :
                     lang === 'vi' ? '베트남어' : lang}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 자산 유형 필터 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">자산 유형</label>
            <Select
              value={filters.asset_types[0] || ''}
              onValueChange={(value) => handleFilterChange('asset_types', value ? [value] : [])}
            >
              <SelectTrigger>
                <SelectValue placeholder="자산 유형 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">전체</SelectItem>
                {ASSET_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type === 'description' ? '설명' :
                     type === 'introduction' ? '소개' :
                     type === 'review' ? '리뷰' : type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 게시 상태 필터 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">게시 상태</label>
            <Select
              value={filters.publishing_status}
              onValueChange={(value) => handleFilterChange('publishing_status', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="게시 상태 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">전체</SelectItem>
                {PUBLISHING_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status === 'draft' ? '초안' :
                     status === 'review' ? '검토 중' :
                     status === 'published' ? '게시됨' :
                     status === 'archived' ? '보관됨' : status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 공개 여부 필터 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">공개 여부</label>
            <Select
              value={filters.is_public}
              onValueChange={(value) => handleFilterChange('is_public', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="공개 여부 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">전체</SelectItem>
                <SelectItem value="true">공개</SelectItem>
                <SelectItem value="false">비공개</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 검색어 필터 */}
          <div className="space-y-2 md:col-span-2 lg:col-span-3">
            <label className="text-sm font-medium">검색어</label>
            <div className="flex space-x-2">
              <Input
                placeholder="이름 또는 파일명으로 검색"
                value={filters.search_term}
                onChange={(e) => handleFilterChange('search_term', e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleApplyFilters()}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-2 mt-4">
          <Button variant="outline" onClick={handleResetFilters}>
            초기화
          </Button>
          <Button onClick={handleApplyFilters}>
            필터 적용
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
