// types/accessAsset.ts
import * as z from 'zod';

// 상수 정의
export const MEDIA_TYPES = ['AD', 'CC', 'SL', 'IA', 'IC', 'IS', 'RA', 'RC', 'RS'] as const;
export const LANGUAGES = ['ko', 'en', 'ja', 'zh', 'vi', 'fr', 'es', 'de', 'ru', 'ar', 'th'] as const;
export const ASSET_TYPES = ['description', 'introduction', 'review'] as const;
export const PUBLISHING_STATUSES = ['draft', 'review', 'published', 'archived'] as const;
export const PRODUCTION_STATUSES = ['planning', 'in_progress', 'completed', 'delayed', 'cancelled'] as const;
export const ACCESS_POLICIES = ['private', 'public', 'restricted', 'educational', 'commercial'] as const;

// 기본 스키마
export const accessAssetBaseSchema = z.object({
  movieId: z.number(),
  mediaType: z.enum(MEDIA_TYPES),
  language: z.enum(LANGUAGES),
  assetType: z.enum(ASSET_TYPES),
  name: z.string().min(1, '미디어 이름은 필수입니다'),
  
  // 선택적 필드
  guidelineId: z.number().nullable().optional(),
  productionYear: z.number()
    .min(1900, '제작 연도는 1900년 이후여야 합니다')
    .max(new Date().getFullYear() + 5, `제작 연도는 ${new Date().getFullYear() + 5}년 이전이어야 합니다`)
    .nullable()
    .optional(),
  supportedOs: z.array(z.string()).nullable().optional(),
  isPublic: z.boolean().default(false),
  isLocked: z.boolean().default(true),
  publishingStatus: z.enum(PUBLISHING_STATUSES).default('draft'),
  accessPolicy: z.enum(ACCESS_POLICIES).default('private'),
  productionStatus: z.enum(PRODUCTION_STATUSES).default('planning'),
});

// 생성 스키마
export const accessAssetCreateSchema = accessAssetBaseSchema.extend({
  // 파일 정보 (직접 업로드 시)
  originalFilename: z.string().optional(),
  s3Filename: z.string().optional(),
  s3Directory: z.string().optional(),
  fileSize: z.number().optional(),
  fileType: z.string().optional(),
  uploadedAt: z.string().optional(), // ISO 8601 형식의 문자열
  
  // 또는 FileAsset 참조 (중앙화된 파일 관리 사용 시)
  mediaFileId: z.number().optional(),
}).refine(
  data => !!data.mediaFileId || (!!data.originalFilename && !!data.s3Filename && !!data.s3Directory),
  {
    message: "파일 정보(originalFilename, s3Filename, s3Directory) 또는 mediaFileId가 필요합니다",
    path: ["mediaFileId"]
  }
);

// 업데이트 스키마
export const accessAssetUpdateSchema = z.object({
  movieId: z.number().optional(),
  mediaType: z.enum(MEDIA_TYPES).optional(),
  language: z.enum(LANGUAGES).optional(),
  assetType: z.enum(ASSET_TYPES).optional(),
  name: z.string().min(1, '미디어 이름은 필수입니다').optional(),
  guidelineId: z.number().nullable().optional(),
  productionYear: z.number()
    .min(1900, '제작 연도는 1900년 이후여야 합니다')
    .max(new Date().getFullYear() + 5, `제작 연도는 ${new Date().getFullYear() + 5}년 이전이어야 합니다`)
    .nullable()
    .optional(),
  supportedOs: z.array(z.string()).nullable().optional(),
  isPublic: z.boolean().optional(),
  isLocked: z.boolean().optional(),
  publishingStatus: z.enum(PUBLISHING_STATUSES).optional(),
  accessPolicy: z.enum(ACCESS_POLICIES).optional(),
  productionStatus: z.enum(PRODUCTION_STATUSES).optional(),
  mediaFileId: z.number().nullable().optional(),
});

// 파일 자산 응답 스키마
export const fileAssetResponseSchema = z.object({
  id: z.number(),
  s3Key: z.string(),
  s3Bucket: z.string(),
  originalFilename: z.string(),
  contentType: z.string(),
  fileSize: z.number(),
  isPublic: z.boolean(),
  entityType: z.string(),
  entityId: z.number(),
  usageType: z.string(),
  createdAt: z.string(), // ISO 8601 형식의 문자열
  updatedAt: z.string(), // ISO 8601 형식의 문자열
  width: z.number().nullable().optional(),
  height: z.number().nullable().optional(),
  status: z.string(),
  supportedOsType: z.string().nullable().optional(),
  
  // 동적으로 생성되는 URL
  presignedUrl: z.string().nullable().optional(),
  publicUrl: z.string().nullable().optional(),
});

// 제작진 기본 스키마
export const accessAssetCreditBaseSchema = z.object({
  personType: z.enum(['translator', 'voice_artist', 'staff']),
  personId: z.number(),
  role: z.string(),
  sequenceNumber: z.number().min(1).max(100),
});

// 제작진 생성 스키마
export const accessAssetCreditCreateSchema = accessAssetCreditBaseSchema;

// 제작진 업데이트 스키마
export const accessAssetCreditUpdateSchema = z.object({
  personType: z.enum(['translator', 'voice_artist', 'staff']).optional(),
  personId: z.number().optional(),
  role: z.string().optional(),
  sequenceNumber: z.number().min(1).max(100).optional(),
});

// 제작진 응답 스키마
export const accessAssetCreditResponseSchema = accessAssetCreditBaseSchema.extend({
  id: z.number(),
  accessAssetId: z.number(),
  createdAt: z.string(), // ISO 8601 형식의 문자열
  
  // 동적으로 추가될 수 있는 인물 정보
  personName: z.string().nullable().optional(),
  personProfileImage: z.string().nullable().optional(),
});

// 메모 기본 스키마
export const accessAssetMemoBaseSchema = z.object({
  content: z.string(),
});

// 메모 생성 스키마
export const accessAssetMemoCreateSchema = accessAssetMemoBaseSchema.extend({
  createdBy: z.number().nullable().optional(),
});

// 메모 응답 스키마
export const accessAssetMemoResponseSchema = accessAssetMemoBaseSchema.extend({
  id: z.number(),
  accessAssetId: z.number(),
  createdBy: z.number().nullable().optional(),
  createdAt: z.string(), // ISO 8601 형식의 문자열
  
  // 동적으로 추가될 수 있는 작성자 정보
  creatorName: z.string().nullable().optional(),
});

// 접근성 미디어 자산 응답 스키마
export const accessAssetResponseSchema = accessAssetBaseSchema.extend({
  id: z.number(),
  createdAt: z.string(), // ISO 8601 형식의 문자열
  updatedAt: z.string(), // ISO 8601 형식의 문자열
  
  // 파일 정보
  originalFilename: z.string().nullable().optional(),
  s3Filename: z.string().nullable().optional(),
  s3Directory: z.string().nullable().optional(),
  fileSize: z.number().nullable().optional(),
  fileType: z.string().nullable().optional(),
  uploadedAt: z.string().nullable().optional(), // ISO 8601 형식의 문자열
  
  // 관계 데이터
  movieTitle: z.string().nullable().optional(),
  guidelineName: z.string().nullable().optional(),
  mediaFile: fileAssetResponseSchema.nullable().optional(),
  
  // 동적으로 생성되는 URL
  downloadUrl: z.string().nullable().optional(),
});

// 접근성 미디어 자산 상세 응답 스키마
export const accessAssetDetailResponseSchema = accessAssetResponseSchema.extend({
  credits: z.array(accessAssetCreditResponseSchema).default([]),
  memos: z.array(accessAssetMemoResponseSchema).default([]),
});

// Presigned URL 응답 스키마
export const presignedUrlResponseSchema = z.object({
  url: z.string(),
  expiresIn: z.number(),
});

// TypeScript 타입 정의
export type AccessAssetBase = z.infer<typeof accessAssetBaseSchema>;
export type AccessAssetCreate = z.infer<typeof accessAssetCreateSchema>;
export type AccessAssetUpdate = z.infer<typeof accessAssetUpdateSchema>;
export type FileAssetResponse = z.infer<typeof fileAssetResponseSchema>;
export type AccessAssetCreditBase = z.infer<typeof accessAssetCreditBaseSchema>;
export type AccessAssetCreditCreate = z.infer<typeof accessAssetCreditCreateSchema>;
export type AccessAssetCreditUpdate = z.infer<typeof accessAssetCreditUpdateSchema>;
export type AccessAssetCreditResponse = z.infer<typeof accessAssetCreditResponseSchema>;
export type AccessAssetMemoBase = z.infer<typeof accessAssetMemoBaseSchema>;
export type AccessAssetMemoCreate = z.infer<typeof accessAssetMemoCreateSchema>;
export type AccessAssetMemoResponse = z.infer<typeof accessAssetMemoResponseSchema>;
export type AccessAssetResponse = z.infer<typeof accessAssetResponseSchema>;
export type AccessAssetDetailResponse = z.infer<typeof accessAssetDetailResponseSchema>;
export type PresignedUrlResponse = z.infer<typeof presignedUrlResponseSchema>;
