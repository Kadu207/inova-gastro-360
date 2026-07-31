import { z } from "zod";

export {
  CategoryInputSchema,
  CategoryPatchSchema,
  ProductInputSchema,
  ProductPatchSchema,
  PresignInputSchema,
  ALLOWED_IMAGE_CONTENT_TYPES,
  type CategoryInput,
  type CategoryPatch,
  type ProductInput,
  type ProductPatch,
  type PresignInput,
} from "./catalog";

export {
  ConsentInputSchema,
  ErasureRequestInputSchema,
  ErasureStatusUpdateSchema,
  ERASURE_SUBJECT_TYPES,
  ERASURE_STATUSES,
  type ConsentInput,
  type ErasureRequestInput,
  type ErasureStatusUpdate,
} from "./lgpd";

export const TenantContextSchema = z.object({
  tenantId: z.string().uuid(),
  companyId: z.string().uuid().optional(),
  branchId: z.string().uuid().optional(),
});

export type TenantContext = z.infer<typeof TenantContextSchema>;

export const CreateTenantSchema = z.object({
  name: z.string().min(2).max(255),
  slug: z
    .string()
    .min(2)
    .max(100)
    .regex(/^[a-z0-9-]+$/, "Slug deve conter apenas letras minúsculas, números e hífens"),
  tradeName: z.string().min(2).max(255).optional(),
  branchName: z.string().min(2).max(255).default("Filial Principal"),
  admin: z.object({
    name: z.string().min(2).max(255),
    email: z.string().email(),
    password: z.string().min(8).max(200),
  }),
  planCode: z.string().min(2).max(50).default("starter"),
});

export type CreateTenantInput = z.infer<typeof CreateTenantSchema>;
