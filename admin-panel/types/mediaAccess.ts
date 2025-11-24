// types/mediaAccess.ts
import * as z from 'zod';

// 미디어 접근 요청 기본 스키마
export const mediaAccessRequestBaseSchema = z.object({
  mediaId: z.number(),
  userId: z.number().nullable().optional(),
  deviceId: z.string().nullable().optional(),
  requestReason: z.string().nullable().optional(),
});

// 생성 스키마
export const mediaAccessRequestCreateSchema = mediaAccessRequestBaseSchema;

// 업데이트 스키마
export const mediaAccessRequestUpdateSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  adminId: z.number(),
  adminNotes: z.string().nullable().optional(),
  expiryDate: z.string().nullable().optional(), // ISO 날짜 문자열
});

// 응답 스키마
export const mediaAccessRequestResponseSchema = mediaAccessRequestBaseSchema.extend({
  id: z.number(),
  status: z.string(),
  adminId: z.number().nullable().optional(),
  adminNotes: z.string().nullable().optional(),
  expiryDate: z.string().nullable().optional(), // ISO 날짜 문자열
  createdAt: z.string(), // ISO 날짜 문자열
  updatedAt: z.string(), // ISO 날짜 문자열
});

// 접근 권한 확인 응답 스키마
export const accessPermissionResponseSchema = z.object({
  hasAccess: z.boolean(),
  reason: z.string(),
  expiresAt: z.string().nullable().optional(),
  requestId: z.number().nullable().optional(),
});

// TypeScript 타입 정의
export type MediaAccessRequestBase = z.infer<typeof mediaAccessRequestBaseSchema>;
export type MediaAccessRequestCreate = z.infer<typeof mediaAccessRequestCreateSchema>;
export type MediaAccessRequestUpdate = z.infer<typeof mediaAccessRequestUpdateSchema>;
export type MediaAccessRequestResponse = z.infer<typeof mediaAccessRequestResponseSchema>;
export type AccessPermissionResponse = z.infer<typeof accessPermissionResponseSchema>;
