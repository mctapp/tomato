// types/slinterpreters.ts
import { 
  BasePersonInfo, 
  PersonnelSummary, 
  SignLanguage, 
  Expertise, 
  BaseSample,
  PersonnelFormData,
  isPersonnelSummary 
} from './personnel';

// SL 통역사 전용 샘플 (video/image만)
export interface SLInterpreterSample extends BaseSample {
  sampleType: 'video' | 'image';
}

// SL 통역사 상세 정보
export interface SLInterpreter extends BasePersonInfo {
  signLanguages: SignLanguage[];
  expertise: Expertise[];
  samples: SLInterpreterSample[];
}

// SL 통역사 요약 정보 (PersonnelSummary 확장)
export interface SLInterpreterSummary extends PersonnelSummary {
  signLanguages: string[];
  videoSamplesCount: number;
  imageSamplesCount: number;
}

// SL 통역사 폼 데이터
export interface SLInterpreterFormData extends PersonnelFormData {
  signLanguages: SignLanguage[];
  expertise: Expertise[];
}

// 샘플 폼 데이터
export interface SLInterpreterSampleFormData {
  title: string;
  sampleType: 'video' | 'image';
  sequenceNumber: number;
}

// 타입 가드 함수들
export const isSLInterpreter = (data: unknown): data is SLInterpreter => {
  return typeof data === 'object' && 
         data !== null && 
         'id' in data && 
         'name' in data && 
         'signLanguages' in data &&
         'expertise' in data &&
         'samples' in data &&
         typeof (data as any).id === 'number' &&
         typeof (data as any).name === 'string' &&
         Array.isArray((data as any).signLanguages) &&
         Array.isArray((data as any).expertise) &&
         Array.isArray((data as any).samples);
};

export const isSLInterpreterSummary = (data: unknown): data is SLInterpreterSummary => {
  return isPersonnelSummary(data) &&
         'signLanguages' in data &&
         'videoSamplesCount' in data &&
         'imageSamplesCount' in data &&
         Array.isArray((data as any).signLanguages) &&
         typeof (data as any).videoSamplesCount === 'number' &&
         typeof (data as any).imageSamplesCount === 'number';
};

export const isSLInterpreterSample = (data: unknown): data is SLInterpreterSample => {
  return typeof data === 'object' && 
         data !== null && 
         'id' in data && 
         'title' in data &&
         'sampleType' in data &&
         'sequenceNumber' in data &&
         typeof (data as any).id === 'number' &&
         typeof (data as any).title === 'string' &&
         ['video', 'image'].includes((data as any).sampleType) &&
         typeof (data as any).sequenceNumber === 'number';
};

// 수어통역사 크레딧 정보
export interface SLInterpreterCredit {
  movieId: number;
  movieTitle: string;
  releaseYear?: string;
  accessAssetId: number;
  accessType: string;
  isPrimary: boolean;
  roleName?: string;
  createdAt?: string;
}

// 수어통역사 크레딧 응답
export interface SLInterpreterCreditsResponse {
  data: SLInterpreterCredit[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}
