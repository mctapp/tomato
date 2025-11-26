// lib/utils/personnel.ts

/**
 * Validates if a skill level is within valid range (1-9)
 */
export function isValidSkillLevel(level: number): boolean {
  return Number.isInteger(level) && level >= 1 && level <= 9;
}

/**
 * Validates email format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
}

/**
 * Returns badge color class based on skill level
 */
export function getSkillLevelBadgeColor(level: number | undefined): string {
  if (!level) return 'bg-gray-100 text-gray-800';

  if (level >= 8) {
    return 'bg-purple-100 text-purple-800 border-purple-300';
  } else if (level >= 6) {
    return 'bg-blue-100 text-blue-800 border-blue-300';
  } else if (level >= 4) {
    return 'bg-green-100 text-green-800 border-green-300';
  } else if (level >= 2) {
    return 'bg-yellow-100 text-yellow-800 border-yellow-300';
  }
  return 'bg-gray-100 text-gray-800 border-gray-300';
}

/**
 * Formats phone number to Korean format
 */
export function formatPhoneNumber(phone: string | undefined): string {
  if (!phone) return '-';

  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');

  // Format as Korean phone number
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  } else if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  return phone;
}

/**
 * Validates phone number format
 */
export function isValidPhoneNumber(phone: string): boolean {
  const phoneRegex = /^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/;
  return phoneRegex.test(phone.replace(/\D/g, ''));
}

/**
 * Get personnel paths based on type
 */
export function getPersonnelPaths(personnelType: string): {
  basePath: string;
  apiPath: string;
  list: string;
  create: string;
  detail: (id: number) => string;
  edit: (id: number) => string;
} {
  const paths: Record<string, { basePath: string; apiPath: string }> = {
    'voice-artist': { basePath: '/voiceartists', apiPath: '/api/voice-artists' },
    'scriptwriter': { basePath: '/scriptwriters', apiPath: '/api/scriptwriters' },
    'sl-interpreter': { basePath: '/slinterpreters', apiPath: '/api/sl-interpreters' },
    'staff': { basePath: '/staffs', apiPath: '/api/staffs' },
  };
  const { basePath, apiPath } = paths[personnelType] || { basePath: '/', apiPath: '/api' };

  return {
    basePath,
    apiPath,
    list: basePath,
    create: `${basePath}/create`,
    detail: (id: number) => `${basePath}/${id}`,
    edit: (id: number) => `${basePath}/${id}/edit`,
  };
}

/**
 * Safely convert any value to array
 */
export function safeArray<T>(value: T[] | undefined | null): T[] {
  if (!value) return [];
  if (!Array.isArray(value)) return [];
  return value;
}

/**
 * Safely convert any value to string
 */
export function safeString(value: string | undefined | null, defaultValue: string = ''): string {
  if (value === null || value === undefined) return defaultValue;
  return String(value);
}

/**
 * Check if value is a valid array
 */
export function isValidArray(value: unknown): value is unknown[] {
  return Array.isArray(value) && value.length > 0;
}

/**
 * Check if file is a valid image
 */
export function isValidImageFile(file: File): boolean {
  const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  return validTypes.includes(file.type);
}

/**
 * Format file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
