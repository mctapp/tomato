// lib/constants/staff.ts

/**
 * 스태프 역할 표시 맵
 */
export const ROLE_DISPLAY: Record<string, string> = {
  producer: '제작자',
  director: '감독',
  writer: '작가',
  cinematographer: '촬영감독',
  editor: '편집자',
  sound_designer: '사운드 디자이너',
  art_director: '아트 디렉터',
  production_designer: '프로덕션 디자이너',
  costume_designer: '의상 디자이너',
  makeup_artist: '메이크업 아티스트',
  visual_effects: '시각효과',
  music_composer: '음악 작곡가',
  casting_director: '캐스팅 디렉터',
  production_manager: '제작 매니저',
  assistant_director: '조감독',
  script_supervisor: '스크립터',
  gaffer: '조명감독',
  key_grip: '그립 책임자',
  production_assistant: '제작 보조',
  other: '기타'
};

/**
 * 역할별 색상
 */
export const ROLE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  producer: {
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-200'
  },
  director: {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200'
  },
  writer: {
    bg: 'bg-green-50',
    text: 'text-green-700',
    border: 'border-green-200'
  },
  cinematographer: {
    bg: 'bg-orange-50',
    text: 'text-orange-700',
    border: 'border-orange-200'
  },
  editor: {
    bg: 'bg-pink-50',
    text: 'text-pink-700',
    border: 'border-pink-200'
  },
  sound_designer: {
    bg: 'bg-indigo-50',
    text: 'text-indigo-700',
    border: 'border-indigo-200'
  },
  art_director: {
    bg: 'bg-teal-50',
    text: 'text-teal-700',
    border: 'border-teal-200'
  },
  other: {
    bg: 'bg-gray-50',
    text: 'text-gray-700',
    border: 'border-gray-200'
  }
};

/**
 * 역할 옵션
 */
export const ROLE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'producer', label: '제작자' },
  { value: 'director', label: '감독' },
  { value: 'writer', label: '작가' },
  { value: 'cinematographer', label: '촬영감독' },
  { value: 'editor', label: '편집자' },
  { value: 'sound_designer', label: '사운드 디자이너' },
  { value: 'art_director', label: '아트 디렉터' },
  { value: 'production_designer', label: '프로덕션 디자이너' },
  { value: 'costume_designer', label: '의상 디자이너' },
  { value: 'makeup_artist', label: '메이크업 아티스트' },
  { value: 'visual_effects', label: '시각효과' },
  { value: 'music_composer', label: '음악 작곡가' },
  { value: 'casting_director', label: '캐스팅 디렉터' },
  { value: 'production_manager', label: '제작 매니저' },
  { value: 'assistant_director', label: '조감독' },
  { value: 'script_supervisor', label: '스크립터' },
  { value: 'gaffer', label: '조명감독' },
  { value: 'key_grip', label: '그립 책임자' },
  { value: 'production_assistant', label: '제작 보조' },
  { value: 'other', label: '기타' }
];
