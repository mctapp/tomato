// types/accessAssetCredit.ts

export interface AccessAssetCredit {
  id: number;
  accessAssetId: number;
  personType: 'scriptwriter' | 'voice_artist' | 'sl_interpreter' | 'staff';
  personId: number;
  scriptwriterId?: number | null;
  voiceArtistId?: number | null;
  slInterpreterId?: number | null;
  staffId?: number | null;
  role: string;
  sequenceNumber: number;
  memo?: string | null;
  isPrimary?: boolean;  // 추가
  createdAt: string;
  
  // Relations - populated when fetching credits
  scriptwriter?: {
    id: number;
    name: string;
    profileImage?: string | null;
    specialties?: Array<{
      specialtyType: string;
      skillGrade: number;
    }>;
  };
  voiceArtist?: {
    id: number;
    voiceartistName: string;
    profileImage?: string | null;
    voiceartistLevel?: number | null;
  };
  slInterpreter?: {
    id: number;
    name: string;
    profileImage?: string | null;
    skillLevel?: number | null;
  };
  staff?: {
    id: number;
    name: string;
    profileImage?: string | null;
    roles?: Array<{
      roleType: string;
    }>;
  };
}

export interface AccessAssetCreditCreate {
  personType: 'scriptwriter' | 'voice_artist' | 'sl_interpreter' | 'staff';
  personId: number;
  scriptwriterId?: number | null;
  voiceArtistId?: number | null;
  slInterpreterId?: number | null;
  staffId?: number | null;
  role: string;
  sequenceNumber: number;
  memo?: string;
  isPrimary?: boolean;  // 추가
}

export interface AccessAssetCreditUpdate {
  role?: string;
  memo?: string;
  isPrimary?: boolean;  // 추가
}

export interface AccessAssetCreditReorder {
  creditIds: number[];
}

// Helper type for person selection
export interface PersonOption {
  id: number;
  name: string;
  profileImage?: string | null;
  type: 'scriptwriter' | 'voice_artist' | 'sl_interpreter' | 'staff';
  // Additional info based on type
  specialty?: string; // for scriptwriter (AD/CC)
  level?: number; // for voice artist, sl interpreter
  roles?: string[]; // for staff
}

// Type guards
export function isScriptwriter(personType: string): personType is 'scriptwriter' {
  return personType === 'scriptwriter';
}

export function isVoiceArtist(personType: string): personType is 'voice_artist' {
  return personType === 'voice_artist';
}

export function isSlInterpreter(personType: string): personType is 'sl_interpreter' {
  return personType === 'sl_interpreter';
}

export function isStaff(personType: string): personType is 'staff' {
  return personType === 'staff';
}

// Get available person types based on media type
export function getAvailablePersonTypes(mediaType: string): Array<{
  type: 'scriptwriter' | 'voice_artist' | 'sl_interpreter' | 'staff';
  label: string;
  required: boolean;
  specialty?: 'AD' | 'CC';
}> {
  const voiceTypes = ['AD', 'AI', 'AR'];
  const subtitleTypes = ['CC', 'CI', 'CR'];
  const signTypes = ['SL', 'SI', 'SR'];
  
  if (voiceTypes.includes(mediaType)) {
    return [
      { type: 'scriptwriter', label: '음성해설 작가', required: true, specialty: 'AD' },
      { type: 'voice_artist', label: '성우', required: true },
      { type: 'staff', label: '스태프', required: false }
    ];
  } else if (subtitleTypes.includes(mediaType)) {
    return [
      { type: 'scriptwriter', label: '자막해설 작가', required: true, specialty: 'CC' },
      { type: 'sl_interpreter', label: '수어통역사', required: false },
      { type: 'staff', label: '스태프', required: false }
    ];
  } else if (signTypes.includes(mediaType)) {
    return [
      { type: 'scriptwriter', label: '자막해설 작가', required: false, specialty: 'CC' },
      { type: 'sl_interpreter', label: '수어통역사', required: true },
      { type: 'staff', label: '스태프', required: false }
    ];
  }
  
  // Default: only staff
  return [
    { type: 'staff', label: '스태프', required: false }
  ];
}

// Get person display name
export function getPersonDisplayName(credit: AccessAssetCredit): string {
  switch (credit.personType) {
    case 'scriptwriter':
      return credit.scriptwriter?.name || '알 수 없음';
    case 'voice_artist':
      return credit.voiceArtist?.voiceartistName || '알 수 없음';
    case 'sl_interpreter':
      return credit.slInterpreter?.name || '알 수 없음';
    case 'staff':
      return credit.staff?.name || '알 수 없음';
    default:
      return '알 수 없음';
  }
}

// Get person type label
export function getPersonTypeLabel(personType: string): string {
  switch (personType) {
    case 'scriptwriter':
      return '해설작가';
    case 'voice_artist':
      return '성우';
    case 'sl_interpreter':
      return '수어통역사';
    case 'staff':
      return '스태프';
    default:
      return personType;
  }
}
