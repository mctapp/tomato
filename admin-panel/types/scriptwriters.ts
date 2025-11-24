// types/scriptwriters.ts
import { 
  BasePersonInfo, 
  PersonnelSummary, 
  BaseSample,
  PersonnelFormData,
  isPersonnelSummary 
} from './personnel';

// 페이지네이션 메타 정보
export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// 크레딧(작업이력) 관련 타입
export interface ScriptwriterCredit {
  accessAssetId: number;
  movieId: number;
  movieTitle: string;
  movieTitleEn?: string;
  releaseYear?: number;
  posterImage?: string;
  accessType: string;
  createdAt: string;
  isPrimary: boolean;
}

export interface ScriptwriterCreditsResponse {
  data: ScriptwriterCredit[];
  pagination: PaginationMeta;
}

// 해설작가 사용언어
export interface ScriptwriterLanguage {
  languageCode: string;
  proficiencyLevel: number;
}

// 해설작가 해설분야
export interface ScriptwriterSpecialty {
  specialtyType: 'AD' | 'CC';
  skillGrade: number;
}

// 해설작가 작업로그
export interface ScriptwriterWorkLog {
  id: number;
  workTitle: string;
  workYearMonth: string; // YYYY-MM 형식
  content: string;
  scriptwriterId: number;
  createdAt: string;
}

// 해설작가 대표해설
export interface ScriptwriterSample {
  id: number;
  workTitle: string;
  directorName?: string;
  workYear?: number;
  hasAd: boolean;
  hasCc: boolean;
  timecodeIn?: string;
  timecodeOut?: string;
  referenceUrl?: string;
  narrationContent?: string;
  narrationMemo?: string;
  posterImage?: string;
  referenceImage?: string;
  sequenceNumber: number;
  scriptwriterId: number;
  createdAt: string;
  updatedAt: string;
}

// 해설작가 상세 정보
export interface Scriptwriter extends BasePersonInfo {
  languages: ScriptwriterLanguage[];
  specialties: ScriptwriterSpecialty[];
  workLogs: ScriptwriterWorkLog[];
  samples: ScriptwriterSample[];
}

// 해설작가 요약 정보 (PersonnelSummary 확장)
export interface ScriptwriterSummary extends PersonnelSummary {
  languages: string[];
  specialties: string[];
  workLogsCount: number;  // ✅ 수정됨: 백엔드 응답과 일치하도록 수정
}

// 해설작가 폼 데이터
export interface ScriptwriterFormData extends PersonnelFormData {
  languages: ScriptwriterLanguage[];
  specialties: ScriptwriterSpecialty[];
}

// 작업로그 폼 데이터
export interface ScriptwriterWorkLogFormData {
  workTitle: string;
  workYearMonth: string;
  content: string;
}

// 대표해설 폼 데이터
export interface ScriptwriterSampleFormData {
  workTitle: string;
  directorName?: string;
  workYear?: number;
  hasAd: boolean;
  hasCc: boolean;
  timecodeIn?: string;
  timecodeOut?: string;
  referenceUrl?: string;
  narrationContent?: string;
  narrationMemo?: string;
  sequenceNumber: number;
}

// 타입 가드 함수들
export const isScriptwriter = (data: unknown): data is Scriptwriter => {
  return typeof data === 'object' && 
         data !== null && 
         'id' in data && 
         'name' in data && 
         'languages' in data &&
         'specialties' in data &&
         'workLogs' in data &&
         'samples' in data &&
         typeof (data as any).id === 'number' &&
         typeof (data as any).name === 'string' &&
         Array.isArray((data as any).languages) &&
         Array.isArray((data as any).specialties) &&
         Array.isArray((data as any).workLogs) &&
         Array.isArray((data as any).samples);
};

export const isScriptwriterSummary = (data: unknown): data is ScriptwriterSummary => {
  return isPersonnelSummary(data) &&
         'languages' in data &&
         'specialties' in data &&
         'workLogsCount' in data &&
         Array.isArray((data as any).languages) &&
         Array.isArray((data as any).specialties) &&
         typeof (data as any).workLogsCount === 'number';
};

export const isScriptwriterLanguage = (data: unknown): data is ScriptwriterLanguage => {
  return typeof data === 'object' && 
         data !== null && 
         'languageCode' in data &&
         'proficiencyLevel' in data &&
         typeof (data as any).languageCode === 'string' &&
         typeof (data as any).proficiencyLevel === 'number' &&
         (data as any).proficiencyLevel >= 1 &&
         (data as any).proficiencyLevel <= 9;
};

export const isScriptwriterSpecialty = (data: unknown): data is ScriptwriterSpecialty => {
  return typeof data === 'object' && 
         data !== null && 
         'specialtyType' in data &&
         'skillGrade' in data &&
         ['AD', 'CC'].includes((data as any).specialtyType) &&
         typeof (data as any).skillGrade === 'number' &&
         (data as any).skillGrade >= 1 &&
         (data as any).skillGrade <= 9;
};

export const isScriptwriterWorkLog = (data: unknown): data is ScriptwriterWorkLog => {
  return typeof data === 'object' && 
         data !== null && 
         'id' in data && 
         'workTitle' in data &&
         'workYearMonth' in data &&
         'content' in data &&
         typeof (data as any).id === 'number' &&
         typeof (data as any).workTitle === 'string' &&
         typeof (data as any).workYearMonth === 'string' &&
         typeof (data as any).content === 'string';
};

export const isScriptwriterSample = (data: unknown): data is ScriptwriterSample => {
  return typeof data === 'object' && 
         data !== null && 
         'id' in data && 
         'workTitle' in data &&
         'hasAd' in data &&
         'hasCc' in data &&
         'sequenceNumber' in data &&
         typeof (data as any).id === 'number' &&
         typeof (data as any).workTitle === 'string' &&
         typeof (data as any).hasAd === 'boolean' &&
         typeof (data as any).hasCc === 'boolean' &&
         typeof (data as any).sequenceNumber === 'number';
};
