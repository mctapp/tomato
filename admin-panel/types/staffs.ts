// types/staffs.ts
import { 
  BasePersonInfo, 
  PersonnelSummary, 
  PersonnelFormData,
  isPersonnelSummary 
} from './personnel';

// 스태프 역할
export interface StaffRole {
  roleType: 'producer' | 'director' | 'supervisor' | 'monitor_general' | 'monitor_visual' | 'monitor_hearing' | 'pr' | 'marketing' | 'design' | 'accounting' | 'other';
  roleOther?: string;
}

// 스태프 전문분야
export interface StaffExpertise {
  expertiseField: 'movie' | 'video' | 'theater' | 'performance' | 'other';
  expertiseFieldOther?: string;
  skillGrade: number;
}

// 스태프 작업로그
export interface StaffWorkLog {
  id: number;
  workTitle: string;
  workYearMonth: string; // YYYY-MM 형식
  content: string;
  staffId: number;
  createdAt: string;
}

// 스태프 대표작
export interface StaffPortfolio {
  id: number;
  workTitle: string;
  directorName?: string;
  workYear?: number;
  hasAd: boolean;
  hasCc: boolean;
  hasSl?: boolean;  // 기존 데이터 호환성을 위해 optional
  referenceUrl?: string;
  participationContent?: string;
  posterImage?: string;
  creditImage?: string;
  sequenceNumber: number;
  staffId: number;
  createdAt: string;
  updatedAt: string;
}

// 스태프 상세 정보
export interface Staff extends BasePersonInfo {
  roles: StaffRole[];
  expertise: StaffExpertise[];
  workLogs: StaffWorkLog[];
  portfolios: StaffPortfolio[];
}

// 스태프 요약 정보 (PersonnelSummary 확장)
export interface StaffSummary extends PersonnelSummary {
  roles: string[];
  portfoliosCount: number;
  workLogsCount: number;
}

// 스태프 폼 데이터
export interface StaffFormData extends PersonnelFormData {
  roles: StaffRole[];
  expertise: StaffExpertise[];
}

// 작업로그 폼 데이터
export interface StaffWorkLogFormData {
  workTitle: string;
  workYearMonth: string;
  content: string;
}

// 대표작 폼 데이터
export interface StaffPortfolioFormData {
  workTitle: string;
  directorName?: string;
  workYear?: number;
  hasAd: boolean;
  hasCc: boolean;
  hasSl: boolean;
  referenceUrl?: string;
  participationContent?: string;
  sequenceNumber: number;
}

// 타입 가드 함수들
export const isStaff = (data: unknown): data is Staff => {
  return typeof data === 'object' && 
         data !== null && 
         'id' in data && 
         'name' in data && 
         'roles' in data &&
         'expertise' in data &&
         'workLogs' in data &&
         'portfolios' in data &&
         typeof (data as any).id === 'number' &&
         typeof (data as any).name === 'string' &&
         Array.isArray((data as any).roles) &&
         Array.isArray((data as any).expertise) &&
         Array.isArray((data as any).workLogs) &&
         Array.isArray((data as any).portfolios);
};

export const isStaffSummary = (data: unknown): data is StaffSummary => {
  return isPersonnelSummary(data) &&
         'roles' in data &&
         'portfoliosCount' in data &&
         'workLogsCount' in data &&
         Array.isArray((data as any).roles) &&
         typeof (data as any).portfoliosCount === 'number' &&
         typeof (data as any).workLogsCount === 'number';
};

export const isStaffRole = (data: unknown): data is StaffRole => {
  return typeof data === 'object' && 
         data !== null && 
         'roleType' in data &&
         typeof (data as any).roleType === 'string' &&
         ['producer', 'director', 'supervisor', 'monitor_general', 'monitor_visual', 'monitor_hearing', 'pr', 'marketing', 'design', 'accounting', 'other'].includes((data as any).roleType);
};

export const isStaffExpertise = (data: unknown): data is StaffExpertise => {
  return typeof data === 'object' && 
         data !== null && 
         'expertiseField' in data &&
         'skillGrade' in data &&
         ['movie', 'video', 'theater', 'performance', 'other'].includes((data as any).expertiseField) &&
         typeof (data as any).skillGrade === 'number' &&
         (data as any).skillGrade >= 1 &&
         (data as any).skillGrade <= 9;
};

export const isStaffWorkLog = (data: unknown): data is StaffWorkLog => {
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

export const isStaffPortfolio = (data: unknown): data is StaffPortfolio => {
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
         (typeof (data as any).hasSl === 'boolean' || (data as any).hasSl === undefined) &&
         typeof (data as any).sequenceNumber === 'number';
};

// 스태프가 참여한 접근성 미디어 자산 타입
export interface StaffAccessAsset {
  id: number;
  name: string;
  mediaType: string;
  language: string;
  assetType: string;
  productionYear?: number;
  productionStatus: string;
  publishingStatus: string;
  createdAt: string;
  movie?: {
    id: number;
    title: string;
    director?: string;
    releaseDate?: string;
  };
  credit?: {
    role: string;
    isPrimary: boolean;
    sequenceNumber: number;
    memo?: string;
  };
}
