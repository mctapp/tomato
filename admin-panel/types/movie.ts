// types/movie.ts
export interface DistributorSimple {
  id: number;
  name: string;
  isActive: boolean;
}

// 파일 정보 인터페이스 추가
export interface FileInfo {
  id: number;
  originalFilename: string;
  contentType: string;
  fileSize: number;
  s3Key?: string;
  s3Bucket?: string;
  isPublic: boolean;
  supportedOsType?: 'ios' | 'android' | null;
}

export interface MovieBase {
  title: string;
  director?: string | null;
  releaseDate?: string | null;
  filmGenre?: string | null;
  filmRating?: string | null;
  runningTime?: number | null;
  country?: string | null;
  logline?: string | null;
  visibilityType: 'hidden' | 'period' | 'always';
  startAt?: string | null;
  endAt?: string | null;
  featureCode?: string | null;
  adminMemo?: string | null;
  distributorId?: number | null;
  isPublic: boolean;
  publicVersion?: number | null;
  publishingStatus: string;
  posterFileId?: number | null;
  posterUrl?: string | null;
  posterOriginalRenditionId?: number | null;
  supportedOsType?: 'ios' | 'android' | null;
  signatureS3Directory?: string | null;
  signatureS3Filename?: string | null;
  originalSignatureFilename?: string | null;
  signatureUploadTime?: string | null;
  signatureFileSize?: number | null;
}

export interface MovieCreate extends MovieBase {}

export interface MovieUpdate {
  title?: string;
  director?: string | null;
  releaseDate?: string | null;
  filmGenre?: string | null;
  filmRating?: string | null;
  runningTime?: number | null;
  country?: string | null;
  logline?: string | null;
  visibilityType?: 'hidden' | 'period' | 'always';
  startAt?: string | null;
  endAt?: string | null;
  featureCode?: string | null;
  adminMemo?: string | null;
  distributorId?: number | null;
  isPublic?: boolean;
  publicVersion?: number | null;
  publishingStatus?: string;
  posterFileId?: number | null;
  posterUrl?: string | null;
  posterOriginalRenditionId?: number | null;
  supportedOsType?: 'ios' | 'android' | null;
  signatureS3Directory?: string | null;
  signatureS3Filename?: string | null;
  originalSignatureFilename?: string | null;
  signatureUploadTime?: string | null;
  signatureFileSize?: number | null;
}

export interface MovieResponse extends MovieBase {
  id: number;
  createdAt: string;
  updatedAt: string;
  distributor?: DistributorSimple | null;
  posterFile?: FileInfo | null;
  signatureFile?: FileInfo | null;
}

export type Movie = MovieResponse;
