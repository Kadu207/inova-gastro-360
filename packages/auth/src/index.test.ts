import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "./password";
import {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  accessTokenExpiresInSeconds,
} from "./jwt";

describe("auth password", () => {
  it("hashes and verifies", async () => {
    const hash = await hashPassword("uma-senha-de-teste-123");
    expect(await verifyPassword("uma-senha-de-teste-123", hash)).toBe(true);
    expect(await verifyPassword("wrong", hash)).toBe(false);
  });
});

describe("refresh token", () => {
  const secret = "test-secret-min-32-characters-long";

  it("assina e valida refresh token", async () => {
    const token = await signRefreshToken("user-1", secret);
    const decoded = await verifyRefreshToken(token, secret);
    expect(decoded?.sub).toBe("user-1");
  });

  it("rejeita access token no fluxo de refresh", async () => {
    const access = await signAccessToken(
      { sub: "u", tid: "t", email: "a@b.com", role: "admin_cliente", branches: [] },
      secret,
    );
    expect(await verifyRefreshToken(access, secret)).toBeNull();
  });

  it("rejeita refresh token com secret errado", async () => {
    const token = await signRefreshToken("user-1", secret);
    expect(await verifyRefreshToken(token, "outro-secret-com-32-caracteres!!")).toBeNull();
  });
});

describe("auth jwt", () => {
  const secret = "test-secret-min-32-characters-long";
  const payload = {
    sub: "user-1",
    tid: "tenant-1",
    email: "a@b.com",
    role: "admin_cliente",
    branches: ["branch-1"],
  };

  it("signs and verifies access token", async () => {
    const token = await signAccessToken(payload, secret);
    const decoded = await verifyAccessToken(token, secret);
    expect(decoded?.sub).toBe("user-1");
    expect(decoded?.tid).toBe("tenant-1");
  });

  it("returns expiry seconds", () => {
    expect(accessTokenExpiresInSeconds()).toBe(900);
  });

  it("preserva tenant_id no payload (isolamento multitenant)", async () => {
    const token = await signAccessToken({ ...payload, tid: "tenant-A" }, secret);
    const decoded = await verifyAccessToken(token, secret);
    expect(decoded?.tid).toBe("tenant-A");
    expect(decoded?.tid).not.toBe("tenant-B");
  });
});
