import { z } from "zod";

export const CategoryInputSchema = z.object({
  name: z.string().trim().min(1, "Nome obrigatório").max(120),
  sortOrder: z.number().int().min(0).max(9999).optional().default(0),
  isActive: z.boolean().optional().default(true),
});

export const CategoryPatchSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    sortOrder: z.number().int().min(0).max(9999).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: "Nenhum campo para atualizar" });

export const ProductInputSchema = z.object({
  categoryId: z.string().uuid(),
  name: z.string().trim().min(1).max(200),
  description: z.string().max(2000).optional(),
  priceCents: z.number().int().positive("Preço deve ser maior que zero"),
  isAvailable: z.boolean().optional().default(true),
});

export const ProductPatchSchema = z
  .object({
    categoryId: z.string().uuid().optional(),
    name: z.string().trim().min(1).max(200).optional(),
    description: z.string().max(2000).nullable().optional(),
    priceCents: z.number().int().positive().optional(),
    isAvailable: z.boolean().optional(),
    imageUrl: z.string().url().nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: "Nenhum campo para atualizar" });

export const ALLOWED_IMAGE_CONTENT_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export const PresignInputSchema = z.object({
  contentType: z.enum(ALLOWED_IMAGE_CONTENT_TYPES),
  contentLength: z.number().int().positive().max(5_242_880),
});

export type CategoryInput = z.infer<typeof CategoryInputSchema>;
export type CategoryPatch = z.infer<typeof CategoryPatchSchema>;
export type ProductInput = z.infer<typeof ProductInputSchema>;
export type ProductPatch = z.infer<typeof ProductPatchSchema>;
export type PresignInput = z.infer<typeof PresignInputSchema>;
