// lib/utils/phone.ts

/**
 * 전화번호에서 숫자만 추출
 * @param phone - 전화번호 문자열
 * @returns 숫자만 포함된 문자열
 */
export function cleanPhoneNumber(phone: string): string {
  if (!phone) return '';
  return phone.replace(/\D/g, '');
}

/**
 * 전화번호 포맷팅 (한국 전화번호)
 * @param phone - 전화번호 문자열
 * @returns 포맷팅된 전화번호 (예: 010-1234-5678)
 */
export function formatPhoneNumber(phone: string): string {
  if (!phone) return '';

  // 숫자만 추출
  const cleaned = cleanPhoneNumber(phone);

  // 길이에 따라 다른 포맷 적용
  if (cleaned.length === 11) {
    // 휴대폰 번호: 010-1234-5678
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}-${cleaned.slice(7)}`;
  } else if (cleaned.length === 10) {
    // 서울 지역번호: 02-1234-5678
    if (cleaned.startsWith('02')) {
      return `${cleaned.slice(0, 2)}-${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
    }
    // 기타 지역번호: 031-123-4567
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  } else if (cleaned.length === 9) {
    // 서울 지역번호 (짧은 형식): 02-123-4567
    if (cleaned.startsWith('02')) {
      return `${cleaned.slice(0, 2)}-${cleaned.slice(2, 5)}-${cleaned.slice(5)}`;
    }
    // 기타: 031-12-3456
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 5)}-${cleaned.slice(5)}`;
  } else if (cleaned.length === 8) {
    // 짧은 번호: 1234-5678
    return `${cleaned.slice(0, 4)}-${cleaned.slice(4)}`;
  }

  // 그 외의 경우 원본 반환
  return phone;
}

/**
 * 전화번호 입력 시 자동 포맷팅
 * @param value - 입력된 값
 * @param prevValue - 이전 값 (backspace 감지용)
 * @returns 포맷팅된 전화번호
 */
export function formatPhoneInput(value: string, prevValue?: string): string {
  if (!value) return '';

  const cleaned = cleanPhoneNumber(value);

  // 백스페이스로 하이픈 제거 시 처리
  if (prevValue && value.length < prevValue.length) {
    return formatPhoneNumber(cleaned);
  }

  // 최대 길이 제한 (11자리)
  if (cleaned.length > 11) {
    return formatPhoneNumber(cleaned.slice(0, 11));
  }

  return formatPhoneNumber(cleaned);
}

/**
 * 전화번호 유효성 검사
 * @param phone - 전화번호 문자열
 * @returns 유효한 전화번호인지 여부
 */
export function isValidPhoneNumber(phone: string): boolean {
  if (!phone) return false;

  const cleaned = cleanPhoneNumber(phone);

  // 한국 전화번호는 최소 8자리, 최대 11자리
  if (cleaned.length < 8 || cleaned.length > 11) {
    return false;
  }

  // 휴대폰 번호 (010, 011, 016, 017, 018, 019로 시작)
  if (cleaned.length === 11 && /^01[016789]/.test(cleaned)) {
    return true;
  }

  // 서울 지역번호 (02로 시작)
  if ((cleaned.length === 9 || cleaned.length === 10) && cleaned.startsWith('02')) {
    return true;
  }

  // 기타 지역번호 (0으로 시작하는 3자리)
  if ((cleaned.length === 9 || cleaned.length === 10) && /^0[1-9]\d/.test(cleaned)) {
    return true;
  }

  // 그 외 8자리 번호 (지역 번호 없음)
  if (cleaned.length === 8) {
    return true;
  }

  return false;
}
