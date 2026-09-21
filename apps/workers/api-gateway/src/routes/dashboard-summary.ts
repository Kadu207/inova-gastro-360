import type { JwtPayload } from "@inova-gastro-360/auth";
import { jsonResponse } from "../lib";
import { getSql, withTenant } from "../lib/db";
import { assertBranchOpsAccess } from "../lib/branch-ops-access";
import type { GatewayEnv } from "../types/env";

export function avgTicketCents(salesCents: number, ordersToday: number): number {
  if (ordersToday <= 0) return 0;
  return Math.floor(salesCents / ordersToday);
}

export function assertIanaTimezone(raw: string | null | undefined): string {
  const tz = (raw ?? "UTC").trim() || "UTC";
  if (!/^[A-Za-z0-9_+\-\/]+$/.test(tz) || tz.length > 64) return "UTC";
  return tz;
}

type DayAgg = { sales_cents: string | number | null; orders_count: string | number | null };
type SeriesRow = { day: string; sales_cents: string | number | null; orders_count: string | number | null };

function toInt(v: string | number | null | undefined): number {
  if (v === null || v === undefined) return 0;
  const n = typeof v === "number" ? v : Number.parseInt(String(v), 10);
  return Number.isFinite(n) ? n : 0;
}

/**
 * GET /api/v1/branches/:branchId/dashboard/summary
 *
 * Dia civil agregado em **UTC** (`date_trunc` da sessão). O campo `timezone`
 * devolve o IANA da filial para a UI; conversão local fina fica para onda futura.
 */
export async function handleDashboardSummary(
  _request: Request,
  env: GatewayEnv,
  user: JwtPayload,
  branchIdParam: string,
): Promise<Response> {
  const access = assertBranchOpsAccess(user, branchIdParam);
  if (!access.ok) return access.response;

  const branchId = access.branchId;
  const sql = getSql(env);

  try {
    return await withTenant(sql, user.tid, async (tx) => {
      const branches = await tx<{ id: string; timezone: string }[]>`
        SELECT id, timezone FROM branches
        WHERE id = ${branchId}::uuid AND tenant_id = ${user.tid}::uuid
        LIMIT 1
      `;
      if (branches.length === 0) {
        return jsonResponse({ error: "branch_not_found" }, 404);
      }

      const timezone = assertIanaTimezone(branches[0].timezone);

      const todayRows = await tx<DayAgg[]>`
        SELECT
          COALESCE(SUM(total_cents), 0) AS sales_cents,
          COUNT(*)::int AS orders_count
        FROM orders
        WHERE tenant_id = ${user.tid}::uuid
          AND branch_id = ${branchId}::uuid
          AND status::text <> 'cancelled'
          AND created_at >= date_trunc('day', NOW())
          AND created_at < date_trunc('day', NOW()) + INTERVAL '1 day'
      `;

      const salesCentsToday = toInt(todayRows[0]?.sales_cents);
      const ordersToday = toInt(todayRows[0]?.orders_count);

      const seriesRows = await tx<SeriesRow[]>`
        SELECT
          to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS day,
          COALESCE(SUM(total_cents), 0) AS sales_cents,
          COUNT(*)::int AS orders_count
        FROM orders
        WHERE tenant_id = ${user.tid}::uuid
          AND branch_id = ${branchId}::uuid
          AND status::text <> 'cancelled'
          AND created_at >= date_trunc('day', NOW()) - INTERVAL '6 days'
        GROUP BY 1
        ORDER BY 1 ASC
      `;

      const byDay = new Map(
        seriesRows.map((r) => [
          r.day,
          { salesCents: toInt(r.sales_cents), orders: toInt(r.orders_count) },
        ]),
      );

      const fill = await tx<{ d: string }[]>`
        SELECT to_char(d, 'YYYY-MM-DD') AS d
        FROM generate_series(
          date_trunc('day', NOW()) - INTERVAL '6 days',
          date_trunc('day', NOW()),
          INTERVAL '1 day'
        ) AS d
      `;

      const salesLast7Days = fill.map((row) => {
        const hit = byDay.get(row.d);
        return {
          date: row.d,
          salesCents: hit?.salesCents ?? 0,
          orders: hit?.orders ?? 0,
        };
      });

      return jsonResponse({
        branchId,
        timezone,
        dayBasis: "utc",
        asOf: new Date().toISOString(),
        kpis: {
          salesCentsToday,
          ordersToday,
          avgTicketCentsToday: avgTicketCents(salesCentsToday, ordersToday),
        },
        series: { salesLast7Days },
      });
    });
  } finally {
    await sql.end({ timeout: 1 });
  }
}
