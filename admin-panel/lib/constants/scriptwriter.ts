// lib/constants/scriptwriter.ts

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
 * 언어 표시 맵
 */
export const LANGUAGE_DISPLAY: Record<string, string> = {
  ko: '한국어',
  en: '영어',
  ja: '일본어',
  zh: '중국어',
  es: '스페인어',
  fr: '프랑스어',
  de: '독일어',
  ru: '러시아어',
  ar: '아랍어',
  pt: '포르투갈어',
  hi: '힌디어',
  vi: '베트남어',
  th: '태국어',
  it: '이탈리아어'
};

/**
 * 해설 분야 약어
 */
export const SPECIALTY_DISPLAY: Record<string, string> = {
  AD: '음성',
  CC: '자막'
};

/**
 * 해설 분야 전체 이름
 */
export const SPECIALTY_FULL_DISPLAY: Record<string, string> = {
  AD: '음성해설',
  CC: '화면해설 자막'
};

/**
 * 해설 분야별 색상
 */
export const SPECIALTY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  AD: {
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-200'
  },
  CC: {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200'
  }
};

/**
 * 언어 옵션
 */
export const LANGUAGE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'ko', label: '한국어' },
  { value: 'en', label: '영어' },
  { value: 'ja', label: '일본어' },
  { value: 'zh', label: '중국어' },
  { value: 'es', label: '스페인어' },
  { value: 'fr', label: '프랑스어' },
  { value: 'de', label: '독일어' },
  { value: 'ru', label: '러시아어' },
  { value: 'ar', label: '아랍어' },
  { value: 'pt', label: '포르투갈어' },
  { value: 'hi', label: '힌디어' },
  { value: 'vi', label: '베트남어' },
  { value: 'th', label: '태국어' },
  { value: 'it', label: '이탈리아어' }
];

/**
 * 해설 분야 옵션
 */
export const SPECIALTY_OPTIONS: Array<{ value: 'AD' | 'CC'; label: string }> = [
  { value: 'AD', label: '음성해설 (AD)' },
  { value: 'CC', label: '화면해설 자막 (CC)' }
];
