// lib/constants/scriptwriter.ts

export const LANGUAGE_OPTIONS = [
  { value: 'ko', label: '한국어' },
  { value: 'en', label: '영어' },
  { value: 'ja', label: '일본어' },
  { value: 'zh', label: '중국어' },
  { value: 'es', label: '스페인어' },
  { value: 'fr', label: '프랑스어' },
  { value: 'de', label: '독일어' },
  { value: 'vi', label: '베트남어' },
  { value: 'th', label: '태국어' },
  { value: 'ru', label: '러시아어' },
] as const;

export const LANGUAGE_DISPLAY: Record<string, string> = {
  ko: '한국어',
  en: '영어',
  ja: '일본어',
  zh: '중국어',
  es: '스페인어',
  fr: '프랑스어',
  de: '독일어',
  vi: '베트남어',
  th: '태국어',
  ru: '러시아어',
};

export const SPECIALTY_OPTIONS = [
  { value: 'AD', label: '화면해설 (AD)' },
  { value: 'CC', label: '폐쇄자막 (CC)' },
] as const;

export const SPECIALTY_DISPLAY: Record<string, string> = {
  AD: '화면해설',
  CC: '폐쇄자막',
};

export const SPECIALTY_COLORS: Record<string, string> = {
  AD: 'bg-orange-100 text-orange-800 border-orange-300',
  CC: 'bg-indigo-100 text-indigo-800 border-indigo-300',
};
