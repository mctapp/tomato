// lib/constants/personnel.ts
import { Gender } from '@/types/personnel';

/**
 * 성별 옵션
 */
export const GENDER_OPTIONS: Array<{ value: Gender; label: string }> = [
  { value: 'male', label: '남성' },
  { value: 'female', label: '여성' },
  { value: 'other', label: '기타' },
  { value: 'prefer_not_to_say', label: '선택 안 함' }
];

/**
 * 스킬 레벨 옵션 (1-9)
 */
export const SKILL_LEVEL_OPTIONS: Array<{ value: number; label: string }> = [
  { value: 1, label: '초급 (1)' },
  { value: 2, label: '초급+ (2)' },
  { value: 3, label: '중급- (3)' },
  { value: 4, label: '중급 (4)' },
  { value: 5, label: '중급+ (5)' },
  { value: 6, label: '고급- (6)' },
  { value: 7, label: '고급 (7)' },
  { value: 8, label: '고급+ (8)' },
  { value: 9, label: '전문가 (9)' }
];

/**
 * 성별 표시 맵
 */
export const GENDER_DISPLAY: Record<string, string> = {
  male: '남성',
  female: '여성',
  other: '기타',
  prefer_not_to_say: '선택 안 함'
};

/**
 * 전문 영역 옵션
 */
export const EXPERTISE_FIELD_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'movie', label: '영화' },
  { value: 'video', label: '영상' },
  { value: 'theater', label: '연극' },
  { value: 'performance', label: '공연' },
  { value: 'other', label: '기타' }
];

/**
 * 전문 영역 표시 맵
 */
export const EXPERTISE_FIELD_DISPLAY: Record<string, string> = {
  movie: '영화',
  video: '영상',
  theater: '연극',
  performance: '공연',
  other: '기타'
};

/**
 * 수어 언어 옵션
 */
export const SIGN_LANGUAGE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'KSL', label: '한국수어 (KSL)' },
  { value: 'ASL', label: '미국수어 (ASL)' },
  { value: 'BSL', label: '영국수어 (BSL)' },
  { value: 'JSL', label: '일본수어 (JSL)' },
  { value: 'CSL', label: '중국수어 (CSL)' },
  { value: 'VSL', label: '베트남수어 (VSL)' },
  { value: 'FSL', label: '프랑스수어 (FSL)' },
  { value: 'GSL', label: '독일수어 (GSL)' },
  { value: 'ISL', label: '국제수어 (ISL)' },
  { value: 'SSL', label: '스페인수어 (SSL)' },
  { value: 'RSL', label: '러시아수어 (RSL)' }
];

/**
 * 수어 언어 표시 맵
 */
export const SIGN_LANGUAGE_DISPLAY: Record<string, string> = {
  KSL: '한국수어',
  ASL: '미국수어',
  BSL: '영국수어',
  JSL: '일본수어',
  CSL: '중국수어',
  VSL: '베트남수어',
  FSL: '프랑스수어',
  GSL: '독일수어',
  ISL: '국제수어',
  SSL: '스페인수어',
  RSL: '러시아수어'
};
