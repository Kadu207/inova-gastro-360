import { describe, expect, it, vi } from "vitest";
import { getDatabaseUrl, normalizeDatabaseUrl, warnIfDatabaseRoleBypassesRls, withTenant } from "./db";
import type { GatewayEnv } from "../types/env";

describe("getDatabaseUrl", () => {
  it("prefere DATABASE_URL quando ambos existem (wrangler dev + .dev.vars)", () => {
    const env: GatewayEnv = {
      DATABASE_URL: "postgresql://local:5440/db",
      HYPERDRIVE: { connectionString: "postgresql://vps:5440/db" },
    };
    expect(getDatabaseUrl(env)).toBe("postgresql://local:5440/db");
  });

  it("usa Hyperdrive em produção sem DATABASE_URL", () => {
    const env: GatewayEnv = {
      HYPERDRIVE: { connectionString: "postgresql://vps:5440/db" },
    };
    expect(getDatabaseUrl(env)).toBe("postgresql://vps:5440/db");
  });
});

describe("warnIfDatabaseRoleBypassesRls / assertAppDbRoleDoesNotBypassRls", () => {
  it("lança em produção quando URL usa owner inova_gastro", () => {
    expect(() =>
      warnIfDatabaseRoleBypassesRls("postgresql://inova_gastro:x@host/db", {
        ENVIRONMENT: "production",
      } as GatewayEnv),
    ).toThrow(/inova_gastro_app/);
  });

  it("não lança para inova_gastro_app", () => {
    expect(() =>
      warnIfDatabaseRoleBypassesRls("postgresql://inova_gastro_app:x@host/db", {
        ENVIRONMENT: "production",
      } as GatewayEnv),
    ).not.toThrow();
  });
});

describe("withTenant", () => {
  it("rejeita tenantId que não é UUID", async () => {
    const begin = vi.fn();
    const sql = Object.assign(vi.fn(), { begin, end: vi.fn() }) as unknown as ReturnType<
      typeof import("./db").getSql
    >;
    await expect(withTenant(sql, "not-a-uuid", async () => "ok")).rejects.toThrow(
      "tenantId inválido",
    );
    expect(begin).not.toHaveBeenCalled();
  });
});

describe("normalizeDatabaseUrl", () => {
  it("remove schema= do Prisma", () => {
    expect(
      normalizeDatabaseUrl(
        "postgresql://u:p@127.0.0.1:5440/inova_gastro_360?schema=public",
      ),
    ).toBe("postgresql://u:p@127.0.0.1:5440/inova_gastro_360");
  });
});
