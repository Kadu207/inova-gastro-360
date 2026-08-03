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

const documentNumberSchema = z
  .string()
  .max(14)
  .regex(/^\d*$/, "Documento deve conter apenas dígitos")
  .optional();

export const CreateTenantSchema = z.object({
  name: z.string().min(2).max(255),
  slug: z
    .string()
    .min(2)
    .max(100)
    .regex(/^[a-z0-9-]+$/, "Slug deve conter apenas letras minúsculas, números e hífens"),
  tradeName: z.string().min(2).max(255).optional(),
  branchName: z.string().min(2).max(255).default("Filial Principal"),
  documentNumber: documentNumberSchema,
  phone: z.string().min(8).max(32).optional(),
  branchAddress: z.string().min(2).max(500).optional(),
  admin: z.object({
    name: z.string().min(2).max(255),
    email: z.string().email(),
    password: z.string().min(8).max(200),
  }),
  planCode: z.string().min(2).max(50).default("starter"),
});

export type CreateTenantInput = z.infer<typeof CreateTenantSchema>;

export const PatchTenantStatusSchema = z.object({
  status: z.enum(["active", "suspended", "cancelled"]),
});

export type PatchTenantStatusInput = z.infer<typeof PatchTenantStatusSchema>;

export const PatchCompanySchema = z.object({
  tradeName: z.string().min(2).max(255).optional(),
  legalName: z.string().min(2).max(255).optional(),
  documentNumber: documentNumberSchema,
  phone: z.string().min(8).max(32).nullable().optional(),
});

export type PatchCompanyInput = z.infer<typeof PatchCompanySchema>;

export const CreateBranchSchema = z.object({
  name: z.string().min(2).max(255),
  address: z.string().max(500).optional(),
  timezone: z.string().min(2).max(64).default("America/Sao_Paulo"),
});

export type CreateBranchInput = z.infer<typeof CreateBranchSchema>;

export const PatchBranchSchema = z.object({
  name: z.string().min(2).max(255).optional(),
  address: z.string().max(500).nullable().optional(),
  timezone: z.string().min(2).max(64).optional(),
  isActive: z.boolean().optional(),
});

export type PatchBranchInput = z.infer<typeof PatchBranchSchema>;

export const SETTINGS_USER_ROLES = [
  "admin_cliente",
  "gerente",
  "atendente",
  "cozinha",
  "entregador",
] as const;

export const CreateSettingsUserSchema = z.object({
  name: z.string().min(2).max(255),
  email: z.string().email(),
  password: z.string().min(8).max(200),
  role: z.enum(SETTINGS_USER_ROLES).default("atendente"),
  branchIds: z.array(z.string().uuid()).min(1),
});

export type CreateSettingsUserInput = z.infer<typeof CreateSettingsUserSchema>;

export const PatchSettingsUserSchema = z.object({
  name: z.string().min(2).max(255).optional(),
  role: z.enum(SETTINGS_USER_ROLES).optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(8).max(200).optional(),
  branchIds: z.array(z.string().uuid()).min(1).optional(),
});

export type PatchSettingsUserInput = z.infer<typeof PatchSettingsUserSchema>;
