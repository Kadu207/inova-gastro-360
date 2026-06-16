import { z } from "zod";

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
});

export type CreateTenantInput = z.infer<typeof CreateTenantSchema>;
