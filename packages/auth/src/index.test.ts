import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "./password";
import { signAccessToken, verifyAccessToken, accessTokenExpiresInSeconds } from "./jwt";

describe("auth password", () => {
  it("hashes and verifies", async () => {
    const hash = await hashPassword("InovaGastro360!");
    expect(await verifyPassword("InovaGastro360!", hash)).toBe(true);
    expect(await verifyPassword("wrong", hash)).toBe(false);
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
