// lib/utils/languages.ts

/**
 * 언어 코드에서 표시 이름 반환
 */
export function getLanguageDisplay(code: string): string {
  const languages: Record<string, string> = {
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

  return languages[code] || code;
}
