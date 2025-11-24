// types/movieSchema.ts
import { z } from "zod";

export const movieFormSchema = z.object({
  title: z.string().min(1, "제목은 필수입니다."),
  visibilityType: z.enum(["hidden", "period", "always"]),
  isPublic: z.boolean(), // optional 제거
  publishingStatus: z.string(),
  publicVersion: z.number().nullable().optional(),
  country: z.string().nullable().optional(),
  director: z.string().nullable().optional(),
  logline: z.string().nullable().optional(),
  supportedOsType: z.enum(["ios", "android"]).nullable().optional(),
  releaseDate: z.string().nullable().optional(),
  startAt: z.string().nullable().optional(),
  endAt: z.string().nullable().optional(),
  runningTime: z.number().nullable().optional(),
  filmGenre: z.string().nullable().optional(),
  filmRating: z.string().nullable().optional(),
  distributorId: z.number().nullable().optional(),
  adminMemo: z.string().nullable().optional(),
  posterFileId: z.number().nullable().optional(),
  posterOriginalRenditionId: z.number().nullable().optional(),
  featureCode: z.string().nullable().optional(),
  signatureS3Directory: z.string().nullable().optional(),
  signatureS3Filename: z.string().nullable().optional(),
  originalSignatureFilename: z.string().nullable().optional(),
  signatureUploadTime: z.string().nullable().optional(),
  signatureFileSize: z.number().nullable().optional(),
});

// Zod 스키마로부터 타입 추론
export type MovieFormValues = z.infer<typeof movieFormSchema>;
