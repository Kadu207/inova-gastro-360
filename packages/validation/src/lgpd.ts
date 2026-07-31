import { z } from "zod";

/** Preferências de cookies enviadas pelo banner/modal público. Essencial é sempre true. */
export const ConsentInputSchema = z.object({
  branchId: z.string().uuid().optional(),
  subjectId: z.string().trim().min(8).max(200),
  analytics: z.boolean().optional().default(false),
  marketing: z.boolean().optional().default(false),
});

export type ConsentInput = z.infer<typeof ConsentInputSchema>;

export const ERASURE_SUBJECT_TYPES = ["user", "customer"] as const;
export const ERASURE_STATUSES = ["pending", "in_progress", "completed", "rejected"] as const;

export const ErasureRequestInputSchema = z.object({
  subjectId: z.string().trim().min(3).max(200),
  subjectType: z.enum(ERASURE_SUBJECT_TYPES).default("user"),
  reason: z.string().trim().max(1000).optional(),
});

export type ErasureRequestInput = z.infer<typeof ErasureRequestInputSchema>;

export const ErasureStatusUpdateSchema = z.object({
  status: z.enum(ERASURE_STATUSES),
  reason: z.string().trim().max(1000).optional(),
});

export type ErasureStatusUpdate = z.infer<typeof ErasureStatusUpdateSchema>;
