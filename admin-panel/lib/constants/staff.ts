// lib/constants/staff.ts

export const ROLE_OPTIONS = [
  { value: 'producer', label: '프로듀서' },
  { value: 'director', label: '연출' },
  { value: 'supervisor', label: '슈퍼바이저' },
  { value: 'monitor_general', label: '모니터 (종합)' },
  { value: 'monitor_visual', label: '모니터 (시각)' },
  { value: 'monitor_hearing', label: '모니터 (청각)' },
  { value: 'pr', label: 'PR' },
  { value: 'marketing', label: '마케팅' },
  { value: 'design', label: '디자인' },
  { value: 'accounting', label: '회계' },
  { value: 'other', label: '기타' },
] as const;

export const ROLE_DISPLAY: Record<string, string> = {
  producer: '프로듀서',
  director: '연출',
  supervisor: '슈퍼바이저',
  monitor_general: '모니터(종합)',
  monitor_visual: '모니터(시각)',
  monitor_hearing: '모니터(청각)',
  pr: 'PR',
  marketing: '마케팅',
  design: '디자인',
  accounting: '회계',
  other: '기타',
};

export const ROLE_COLORS: Record<string, string> = {
  producer: 'bg-red-100 text-red-800 border-red-300',
  director: 'bg-orange-100 text-orange-800 border-orange-300',
  supervisor: 'bg-amber-100 text-amber-800 border-amber-300',
  monitor_general: 'bg-blue-100 text-blue-800 border-blue-300',
  monitor_visual: 'bg-cyan-100 text-cyan-800 border-cyan-300',
  monitor_hearing: 'bg-teal-100 text-teal-800 border-teal-300',
  pr: 'bg-purple-100 text-purple-800 border-purple-300',
  marketing: 'bg-pink-100 text-pink-800 border-pink-300',
  design: 'bg-indigo-100 text-indigo-800 border-indigo-300',
  accounting: 'bg-green-100 text-green-800 border-green-300',
  other: 'bg-gray-100 text-gray-800 border-gray-300',
};
