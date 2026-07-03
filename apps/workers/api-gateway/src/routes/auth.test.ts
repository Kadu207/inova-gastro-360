import { describe, it, expect, vi, beforeEach } from "vitest";
import { signRefreshToken, hashPassword } from "@inova-gastro-360/auth";
import { handleLogin, handleRefresh, handleLogout } from "./auth";
import { testEnv, TEST_JWT_SECRET } from "../test/helpers";
import { resetRateLimitStore } from "../lib/rate-limit";

const mockSql = vi.fn();
const mockEnd = vi.fn();

vi.mock("../lib/db", () => ({
  getSql: () => {
    const tag = Object.assign(
      (...args: unknown[]) => mockSql(...args),
      { end: mockEnd },
    );
    return tag;
  },
  withTenant: async (_sql: unknown, _tid: string, fn: (tx: unknown) => Promise<unknown>) =>
    fn(
      Object.assign((...args: unknown[]) => mockSql(...args), { end: mockEnd }),
    ),
}));

describe("auth routes", () => {
  beforeEach(() => {
    mockSql.mockReset();
    mockEnd.mockReset();
    resetRateLimitStore();
  });

  it("handleRefresh rejeita sem refreshToken", async () => {
    const res = await handleRefresh(
      new Request("http://test/api/v1/auth/refresh", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      }),
      testEnv(),
    );
    expect(res.status).toBe(400);
  });

  it("handleRefresh rejeita token inválido", async () => {
    const res = await handleRefresh(
      new Request("http://test/api/v1/auth/refresh", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ refreshToken: "invalid.token.here" }),
      }),
      testEnv(),
    );
    expect(res.status).toBe(401);
  });

  it("handleLogout retorna ok mesmo sem token", async () => {
    const res = await handleLogout(
      new Request("http://test/api/v1/auth/logout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      }),
      testEnv(),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok?: boolean };
    expect(body.ok).toBe(true);
  });

  it("handleLogin retorna 429 após muitas tentativas", async () => {
    const req = () =>
      new Request("http://test/api/v1/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": "203.0.113.50",
        },
        body: JSON.stringify({ email: "a@test.com", password: "wrong-password" }),
      });

    mockSql.mockResolvedValue([]);

    for (let i = 0; i < 10; i++) {
      await handleLogin(req(), testEnv());
    }
    const blocked = await handleLogin(req(), testEnv());
    expect(blocked.status).toBe(429);
  });

  it("handleRefresh rotaciona sessão com token válido", async () => {
    const userId = "00000000-0000-4000-8000-000000000001";
    const refreshToken = await signRefreshToken(userId, TEST_JWT_SECRET);
    const refreshHash = await hashPassword(refreshToken);

    mockSql
      .mockResolvedValueOnce([
        {
          id: userId,
          tenant_id: "00000000-0000-4000-8000-000000000010",
          email: "a@test.com",
          name: "Admin",
          role: "admin_cliente",
          password_hash: "x",
          is_active: true,
        },
      ])
      .mockResolvedValueOnce([{ id: "sess-1", refresh_token_hash: refreshHash }])
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce([{ branch_id: "branch-1" }])
      .mockResolvedValueOnce(undefined);

    const res = await handleRefresh(
      new Request("http://test/api/v1/auth/refresh", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      }),
      testEnv(),
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as { accessToken?: string; refreshToken?: string };
    expect(body.accessToken).toBeTruthy();
    expect(body.refreshToken).toBeTruthy();
  });
});
