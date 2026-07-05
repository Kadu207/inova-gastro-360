import { signAccessToken, type JwtPayload } from "@inova-gastro-360/auth";
import type { GatewayEnv } from "../types/env";

export const TEST_JWT_SECRET = "test-secret-min-32-characters-long";

export const DEMO_BRANCH_ID = "00000000-0000-4000-8000-000000000002";
export const DEMO_PRODUCT_ID = "00000000-0000-4000-8000-000000000020";

export const TENANT_B = {
  tenantId: "00000000-0000-4000-8000-00000000b001",
  companyId: "00000000-0000-4000-8000-00000000b002",
  branchId: "00000000-0000-4000-8000-00000000b003",
  categoryId: "00000000-0000-4000-8000-00000000b010",
  productId: "00000000-0000-4000-8000-00000000b020",
  userId: "00000000-0000-4000-8000-00000000b004",
} as const;

export function testDatabaseUrl(): string {
  return (
    process.env.DATABASE_URL ??
    "postgresql://inova_gastro:inova_gastro_dev@127.0.0.1:5440/inova_gastro_360"
  );
}

export function testEnv(overrides: Partial<GatewayEnv> = {}): GatewayEnv {
  return {
    JWT_SECRET: TEST_JWT_SECRET,
    DATABASE_URL: testDatabaseUrl(),
    ENVIRONMENT: "test",
    INTERNAL_SHARED_SECRET: "test-internal-secret-min-32-chars",
    ...overrides,
  };
}

export async function bearerToken(payload: JwtPayload): Promise<string> {
  return signAccessToken(payload, TEST_JWT_SECRET);
}

export function authRequest(
  url: string,
  token: string,
  init: RequestInit = {},
  extraHeaders?: Record<string, string>,
): Request {
  const headers = new Headers(init.headers);
  headers.set("authorization", `Bearer ${token}`);
  if (extraHeaders) {
    for (const [k, v] of Object.entries(extraHeaders)) headers.set(k, v);
  }
  if (init.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  return new Request(url, { ...init, headers });
}
