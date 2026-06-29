import { describe, expect, it } from "vitest";
import { getDatabaseUrl, normalizeDatabaseUrl } from "./db";
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

describe("normalizeDatabaseUrl", () => {
  it("remove schema= do Prisma", () => {
    expect(
      normalizeDatabaseUrl(
        "postgresql://u:p@127.0.0.1:5440/inova_gastro_360?schema=public",
      ),
    ).toBe("postgresql://u:p@127.0.0.1:5440/inova_gastro_360");
  });
});
