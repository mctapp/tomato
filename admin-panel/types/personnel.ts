// types/personnel.ts
export type Gender = 'male' | 'female' | 'other' | 'prefer_not_to_say';
export type ExpertiseField = 'movie' | 'video' | 'theater' | 'performance' | 'other';
export type SignLanguageCode = 'KSL' | 'ASL' | 'VSL' | 'JSL' | 'CSL' | 'BSL' | 'FSL' | 'GSL' | 'ISL' | 'SSL' | 'RSL';
export type TranslatorSpecialty = 'AD' | 'CC' | 'SL';
export type PersonnelType = 'voice-artist' | 'translator' | 'sl-interpreter';
export type SampleType = 'video' | 'image' | 'audio';

// 기본 개인 정보
export interface BasePersonInfo {
  id: number;
  name: string;
  gender?: Gender;
  location?: string;
  skillLevel?: number;
  phone?: string;
  email?: string;
  memo?: string;
  profileImage?: string;
  createdAt: string;
  updatedAt: string;
}

// 전문 영역
export interface Expertise {
  expertiseField: ExpertiseField;
  expertiseFieldOther?: string;
  skillGrade: number;
}

// 사용 수어
export interface SignLanguage {
  signLanguageCode: SignLanguageCode;
  proficiencyLevel: number;
}

// 번역가 전문 능력
export interface TranslatorSpecialtyInfo {
  specialtyType: TranslatorSpecialty;
}

// 샘플 기본 정보
export interface BaseSample {
  id: number;
  title: string;
  sampleType: SampleType;
  sequenceNumber: number;
  filePath?: string;
  fileSize?: number;
  fileType?: string;
  createdAt: string;
  updatedAt: string;
}

// 통합된 인력 요약 정보
export interface PersonnelSummary extends BasePersonInfo {
  // 공통 필드
  samplesCount?: number;  // optional로 변경
  
  // SL 통역사 전용
  signLanguages?: string[];
  videoSamplesCount?: number;
  imageSamplesCount?: number;
  
  // 번역가 전용
  specialties?: string[];
  
  // 성우 전용
  audioSamplesCount?: number;
}

// 폼 데이터 타입
export interface PersonnelFormData {
  name: string;
  gender?: Gender;
  location?: string;
  skillLevel?: number;
  phone?: string;
  email?: string;
  memo?: string;
  uploadedImage?: File;
  
  // 타입별 특화 데이터
  expertise?: Expertise[];
  signLanguages?: SignLanguage[];
  specialties?: TranslatorSpecialtyInfo[];
}

// 테이블 컬럼 정의
export interface PersonnelTableColumn {
  key: string;
  label: string;
  width?: string;
  sortable?: boolean;
}

// 필터 조건
export interface PersonnelFilters {
  search?: string;
  skillLevel?: number;
  gender?: Gender;
  location?: string;
  specialty?: TranslatorSpecialty;
  signLanguage?: SignLanguageCode;
  page?: number;
  limit?: number;
}

// 타입 가드 함수들
export const isPersonnelSummary = (data: unknown): data is PersonnelSummary => {
  return typeof data === 'object' && 
         data !== null && 
         'id' in data && 
         'name' in data &&
         typeof (data as any).id === 'number' &&
         typeof (data as any).name === 'string' &&
         (typeof (data as any).samplesCount === 'number' || (data as any).samplesCount === undefined);
};

export const isValidGender = (value: string): value is Gender => {
  return ['male', 'female', 'other', 'prefer_not_to_say'].includes(value);
};

export const isValidSignLanguage = (value: string): value is SignLanguageCode => {
  return ['KSL', 'ASL', 'VSL', 'JSL', 'CSL', 'BSL', 'FSL', 'GSL', 'ISL', 'SSL', 'RSL'].includes(value);
};

export const isValidExpertiseField = (value: string): value is ExpertiseField => {
  return ['movie', 'video', 'theater', 'performance', 'other'].includes(value);
};
