import { z } from "zod";

export const LoginInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  tenantSlug: z.string().min(2).optional(),
});

export type LoginInput = z.infer<typeof LoginInputSchema>;

export interface AuthUser {
  id: string;
  tenantId: string;
  email: string;
  name: string;
  role: string;
  branchIds: string[];
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface JwtPayload {
  sub: string;
  tid: string;
  email: string;
  role: string;
  branches: string[];
}
