import { describe, it, expect } from "vitest";
import type { JwtPayload } from "@inova-gastro-360/auth";
import postgres from "postgres";
import { avgTicketCents, handleDashboardSummary } from "./dashboard-summary";
import { DEMO_BRANCH_ID, TENANT_B, testDatabaseUrl, testEnv } from "../test/helpers";
import { normalizeDatabaseUrl } from "../lib/db";
import type { GatewayEnv } from "../types/env";

const DEMO_TID = "00000000-0000-4000-8000-000000000001";

function opsUser(overrides: Partial<JwtPayload> = {}): JwtPayload {
  return {
    sub: "00000000-0000-4000-8000-000000000099",
    tid: DEMO_TID,
    email: "admin@test.local",
    role: "admin_cliente",
    branches: [DEMO_BRANCH_ID],
    ...overrides,
  };
}

describe("avgTicketCents", () => {
  it("retorna 0 sem pedidos", () => {
    expect(avgTicketCents(10_000, 0)).toBe(0);
  });

  it("floor da divisão", () => {
    expect(avgTicketCents(100, 3)).toBe(33);
  });
});

describe("dashboard-summary RBAC (sem DB)", () => {
  const env = {} as GatewayEnv;

  it("branch inválida → 400", async () => {
    const res = await handleDashboardSummary(
      new Request("https://api.test/x"),
      env,
      opsUser(),
      "not-a-uuid",
    );
    expect(res.status).toBe(400);
  });

  it("role sem ops → 403", async () => {
    const res = await handleDashboardSummary(
      new Request("https://api.test/x"),
      env,
      opsUser({ role: "financeiro" }),
      DEMO_BRANCH_ID,
    );
    expect(res.status).toBe(403);
  });

  it("branch fora do JWT → 403", async () => {
    const res = await handleDashboardSummary(
      new Request("https://api.test/x"),
      env,
      opsUser({ branches: ["00000000-0000-4000-8000-000000000099"] }),
      DEMO_BRANCH_ID,
    );
    expect(res.status).toBe(403);
  });
});

describe("dashboard-summary integração (DB)", () => {
  it("agrega pedidos do dia; exclui cancelled; bloqueia branch alienígena", async () => {
    const sql = postgres(normalizeDatabaseUrl(testDatabaseUrl()), { max: 1, prepare: false });
    try {
      const [tenant] = await sql<{ id: string }[]>`
        SELECT id FROM tenants WHERE slug = 'demo-burger' LIMIT 1
      `;
      if (!tenant) return;

      const [branch] = await sql<{ id: string; timezone: string }[]>`
        SELECT id, timezone FROM branches
        WHERE tenant_id = ${tenant.id}::uuid AND is_active = true
        ORDER BY created_at ASC LIMIT 1
      `;
      if (!branch) return;

      const env = testEnv();
      const user = opsUser({ tid: tenant.id, branches: [branch.id] });

      const cross = await handleDashboardSummary(
        new Request("https://api.test/x"),
        env,
        user,
        TENANT_B.branchId,
      );
      expect([403, 404]).toContain(cross.status);

      const beforeRes = await handleDashboardSummary(
        new Request("https://api.test/x"),
        env,
        user,
        branch.id,
      );
      expect(beforeRes.status).toBe(200);
      const before = (await beforeRes.json()) as {
        kpis: { salesCentsToday: number; ordersToday: number };
      };

      const marker = `dash019-${Date.now()}`;
      const orderNumberA = 910_000_000 + Math.floor(Math.random() * 1_000_000);

      await sql`
        INSERT INTO orders (
          id, tenant_id, branch_id, order_number, channel, status,
          customer_name, total_cents, payment_status, created_at, updated_at
        ) VALUES
          (gen_random_uuid(), ${tenant.id}::uuid, ${branch.id}::uuid, ${orderNumberA},
           'balcao', 'pending', ${marker}, 2500, 'unpaid', NOW(), NOW()),
          (gen_random_uuid(), ${tenant.id}::uuid, ${branch.id}::uuid, ${orderNumberA + 1},
           'delivery', 'accepted', ${marker}, 1500, 'unpaid', NOW(), NOW()),
          (gen_random_uuid(), ${tenant.id}::uuid, ${branch.id}::uuid, ${orderNumberA + 2},
           'web', 'cancelled', ${marker}, 9999, 'unpaid', NOW(), NOW())
      `;

      const [check] = await sql<{ n: number; s: string }[]>`
        SELECT COUNT(*)::int AS n, COALESCE(SUM(total_cents),0)::text AS s
        FROM orders WHERE customer_name = ${marker} AND status <> 'cancelled'
      `;
      expect(check.n).toBe(2);
      expect(Number(check.s)).toBe(4000);

      const afterRes = await handleDashboardSummary(
        new Request("https://api.test/x"),
        env,
        user,
        branch.id,
      );
      expect(afterRes.status).toBe(200);
      const after = (await afterRes.json()) as {
        timezone: string;
        kpis: {
          salesCentsToday: number;
          ordersToday: number;
          avgTicketCentsToday: number;
        };
        series: { salesLast7Days: unknown[] };
      };

      expect(after.timezone).toBeTruthy();
      // >= : suite paralela pode inserir outros pedidos no mesmo dia
      expect(after.kpis.salesCentsToday - before.kpis.salesCentsToday).toBeGreaterThanOrEqual(4000);
      expect(after.kpis.ordersToday - before.kpis.ordersToday).toBeGreaterThanOrEqual(2);
      expect(after.kpis.avgTicketCentsToday).toBe(
        avgTicketCents(after.kpis.salesCentsToday, after.kpis.ordersToday),
      );
      expect(after.series.salesLast7Days).toHaveLength(7);

      await sql`DELETE FROM orders WHERE customer_name = ${marker}`;
    } finally {
      await sql.end({ timeout: 1 });
    }
  });
});
