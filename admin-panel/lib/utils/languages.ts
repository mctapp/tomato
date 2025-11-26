// lib/utils/languages.ts

export const LANGUAGE_CODES: Record<string, string> = {
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
  pt: '포르투갈어',
  it: '이탈리아어',
  ar: '아랍어',
  hi: '힌디어',
  id: '인도네시아어',
  ms: '말레이어',
};

/**
 * Get display name for a language code
 */
export function getLanguageDisplay(code: string): string {
  return LANGUAGE_CODES[code?.toLowerCase()] || code || 'Unknown';
}

/**
 * Get all available languages
 */
export function getAvailableLanguages(): Array<{ code: string; name: string }> {
  return Object.entries(LANGUAGE_CODES).map(([code, name]) => ({
    code,
    name,
  }));
}

/**
 * Check if a language code is valid
 */
export function isValidLanguageCode(code: string): boolean {
  return code?.toLowerCase() in LANGUAGE_CODES;
}

/**
 * Format language list for display
 */
export function formatLanguageList(codes: string[]): string {
  if (!codes || codes.length === 0) return '-';
  return codes.map(code => getLanguageDisplay(code)).join(', ');
}
