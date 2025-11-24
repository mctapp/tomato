// hooks/useGuidelines.ts
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/utils/api-client';

// 가이드라인 요약 인터페이스 정의
export interface AccessGuidelineSummary {
  id: number;
  name: string;
  type: string; // 'AD' | 'CC' | 'SL'
  field: string; // 'movie' | 'exhibition' | 'theater' | 'musical' | 'concert' | 'other'
  fieldOther?: string;
  version: string;
  attachment?: string;
  createdAt: string;
}

// 가이드라인 상세 인터페이스 정의
export interface AccessGuidelineContent {
  id: number;
  guidelineId: number;
  category: string;
  content: string;
  sequenceNumber: number;
  createdAt: string;
}

export interface AccessGuidelineFeedback {
  id: number;
  guidelineId: number;
  feedbackType: string; // 'non_disabled' | 'visually_impaired' | 'hearing_impaired'
  content: string;
  sequenceNumber: number;
  createdAt: string;
}

export interface AccessGuidelineMemo {
  id: number;
  guidelineId: number;
  content: string;
  createdAt: string;
}

export interface AccessGuideline extends AccessGuidelineSummary {
  updatedAt: string;
  contents: AccessGuidelineContent[];
  feedbacks: AccessGuidelineFeedback[];
  memos: AccessGuidelineMemo[];
}

interface GuidelinesQueryParams {
  skip?: number;
  limit?: number;
  keyword?: string;
  type?: 'AD' | 'CC' | 'SL';
}

async function fetchGuidelines(params: GuidelinesQueryParams = {}): Promise<AccessGuidelineSummary[]> {
  // URLSearchParams를 사용하여 쿼리 문자열 생성
  const queryParams = new URLSearchParams();
  
  // 존재하는 파라미터만 추가
  if (params.skip !== undefined) queryParams.append('skip', params.skip.toString());
  if (params.limit !== undefined) queryParams.append('limit', params.limit.toString());
  if (params.keyword) queryParams.append('keyword', params.keyword);
  if (params.type) queryParams.append('type', params.type);
  
  const queryString = queryParams.toString();
  const url = `/admin/api/access-guidelines${queryString ? `?${queryString}` : ''}`;
  
  const data = await apiClient.get<any[]>(url);
  
  // 스네이크 케이스에서 카멜 케이스로 변환
  return data.map((item: any) => ({
    id: item.id,
    name: item.name,
    type: item.type,
    field: item.field,
    fieldOther: item.field_other,
    version: item.version,
    attachment: item.attachment,
    createdAt: item.created_at
  }));
}

export function useGuidelines(params: GuidelinesQueryParams = {}, options = {}) {
  return useQuery({
    queryKey: ['guidelines', params],
    queryFn: () => fetchGuidelines(params),
    ...options
  });
}

// 단일 가이드라인 조회 함수
async function fetchGuideline(id: number): Promise<AccessGuideline> {
  const data = await apiClient.get<any>(`/admin/api/access-guidelines/${id}`);
  
  // 스네이크 케이스에서 카멜 케이스로 변환
  return {
    id: data.id,
    name: data.name,
    type: data.type,
    field: data.field,
    fieldOther: data.field_other,
    version: data.version,
    attachment: data.attachment,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    contents: data.contents.map((content: any) => ({
      id: content.id,
      guidelineId: content.guideline_id,
      category: content.category,
      content: content.content,
      sequenceNumber: content.sequence_number,
      createdAt: content.created_at
    })),
    feedbacks: data.feedbacks.map((feedback: any) => ({
      id: feedback.id,
      guidelineId: feedback.guideline_id,
      feedbackType: feedback.feedback_type,
      content: feedback.content,
      sequenceNumber: feedback.sequence_number,
      createdAt: feedback.created_at
    })),
    memos: data.memos.map((memo: any) => ({
      id: memo.id,
      guidelineId: memo.guideline_id,
      content: memo.content,
      createdAt: memo.created_at
    }))
  };
}

export function useGuideline(id: number, options = {}) {
  return useQuery({
    queryKey: ['guideline', id],
    queryFn: () => fetchGuideline(id),
    enabled: !!id, // id가 있을 때만 쿼리 실행
    ...options
  });
}
