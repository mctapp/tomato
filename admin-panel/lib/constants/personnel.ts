// lib/constants/personnel.ts

export const GENDER_OPTIONS = [
  { value: 'male', label: '남성' },
  { value: 'female', label: '여성' },
  { value: 'other', label: '기타' },
  { value: 'prefer_not_to_say', label: '밝히지 않음' },
] as const;

export const GENDER_DISPLAY: Record<string, string> = {
  male: '남성',
  female: '여성',
  other: '기타',
  prefer_not_to_say: '밝히지 않음',
};

export const SKILL_LEVEL_OPTIONS = [
  { value: 1, label: 'Lv.1 - 입문' },
  { value: 2, label: 'Lv.2 - 초급' },
  { value: 3, label: 'Lv.3 - 초중급' },
  { value: 4, label: 'Lv.4 - 중급' },
  { value: 5, label: 'Lv.5 - 중상급' },
  { value: 6, label: 'Lv.6 - 상급' },
  { value: 7, label: 'Lv.7 - 고급' },
  { value: 8, label: 'Lv.8 - 전문가' },
  { value: 9, label: 'Lv.9 - 마스터' },
] as const;

export const EXPERTISE_FIELD_OPTIONS = [
  { value: 'movie', label: '영화' },
  { value: 'video', label: '영상' },
  { value: 'theater', label: '연극' },
  { value: 'performance', label: '공연' },
  { value: 'other', label: '기타' },
] as const;

export const EXPERTISE_FIELD_DISPLAY: Record<string, string> = {
  movie: '영화',
  video: '영상',
  theater: '연극',
  performance: '공연',
  other: '기타',
};

export const SIGN_LANGUAGE_OPTIONS = [
  { value: 'KSL', label: '한국수어 (KSL)' },
  { value: 'ASL', label: '미국수어 (ASL)' },
  { value: 'VSL', label: '베트남수어 (VSL)' },
  { value: 'JSL', label: '일본수어 (JSL)' },
  { value: 'CSL', label: '중국수어 (CSL)' },
  { value: 'BSL', label: '영국수어 (BSL)' },
  { value: 'FSL', label: '프랑스수어 (FSL)' },
  { value: 'GSL', label: '독일수어 (GSL)' },
  { value: 'ISL', label: '국제수어 (ISL)' },
  { value: 'SSL', label: '스페인수어 (SSL)' },
  { value: 'RSL', label: '러시아수어 (RSL)' },
] as const;

export const SIGN_LANGUAGE_DISPLAY: Record<string, string> = {
  KSL: '한국수어',
  ASL: '미국수어',
  VSL: '베트남수어',
  JSL: '일본수어',
  CSL: '중국수어',
  BSL: '영국수어',
  FSL: '프랑스수어',
  GSL: '독일수어',
  ISL: '국제수어',
  SSL: '스페인수어',
  RSL: '러시아수어',
};
