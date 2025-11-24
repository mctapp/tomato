// lib/utils/personnel.ts
import { Gender } from '@/types/personnel';

/**
 * 이메일 유효성 검사
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
}

/**
 * 전화번호 유효성 검사 (한국 전화번호 형식)
 */
export function validatePhone(phone: string): boolean {
  const phoneRegex = /^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/;
  return phoneRegex.test(phone);
}

/**
 * 스킬 레벨 유효성 검사 (1-9)
 */
export function isValidSkillLevel(level: number): boolean {
  return Number.isInteger(level) && level >= 1 && level <= 9;
}

/**
 * 전화번호 포맷팅 (010-1234-5678)
 */
export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 11) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}-${cleaned.slice(7)}`;
  } else if (cleaned.length === 10) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
}

/**
 * 성별 표시 이름 반환
 */
export function getGenderLabel(gender?: Gender): string {
  if (!gender) return '미지정';

  const labels: Record<Gender, string> = {
    male: '남성',
    female: '여성',
    other: '기타',
    prefer_not_to_say: '미지정'
  };

  return labels[gender] || '미지정';
}

/**
 * 스킬 레벨 표시 이름 반환
 */
export function getSkillLevelLabel(level?: number): string {
  if (!level || !isValidSkillLevel(level)) return '미지정';

  const labels: Record<number, string> = {
    1: '초급 (1)',
    2: '초급+ (2)',
    3: '중급- (3)',
    4: '중급 (4)',
    5: '중급+ (5)',
    6: '고급- (6)',
    7: '고급 (7)',
    8: '고급+ (8)',
    9: '전문가 (9)'
  };

  return labels[level] || `레벨 ${level}`;
}

/**
 * 스킬 레벨에 따른 뱃지 색상 반환
 */
export function getSkillLevelBadgeColor(level?: number): { bg: string; text: string; border: string } {
  if (!level || !isValidSkillLevel(level)) {
    return { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' };
  }

  if (level >= 7) {
    return { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' };
  } else if (level >= 4) {
    return { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' };
  } else {
    return { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' };
  }
}

/**
 * 안전한 배열 반환 (null/undefined를 빈 배열로 변환)
 */
export function safeArray<T>(arr: T[] | null | undefined): T[] {
  return arr || [];
}
