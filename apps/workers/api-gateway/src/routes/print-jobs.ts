import { z } from "zod";
import { jsonResponse, parseJsonBody } from "../lib";
import { getSql } from "../lib/db";
import type { GatewayEnv } from "../types/env";
import type { JwtPayload } from "@inova-gastro-360/auth";

const UpdatePrintJobStatusSchema = z.object({
  status: z.enum(["printed", "failed", "pending"]),
});

const VALID_LIST_STATUSES = ["pending", "printed", "failed"] as const;

export async function handleListPrintJobs(
  request: Request,
  env: GatewayEnv,
  user: JwtPayload,
): Promise<Response> {
  const url = new URL(request.url);
  const branchId = url.searchParams.get("branchId");
  const sector = url.searchParams.get("sector");
  const status = url.searchParams.get("status") ?? "pending";

  if (!branchId) return jsonResponse({ error: "branch_id_required" }, 400);
  if (!VALID_LIST_STATUSES.includes(status as (typeof VALID_LIST_STATUSES)[number])) {
    return jsonResponse({ error: "invalid_status" }, 400);
  }

  const sql = getSql(env);
  try {
    const jobs = sector
      ? await sql`
          SELECT id, branch_id, order_id, sector, status, payload, created_at, updated_at
          FROM print_jobs
          WHERE tenant_id = ${user.tid}::uuid
            AND branch_id = ${branchId}::uuid
            AND sector = ${sector}
            AND status = ${status}
          ORDER BY created_at ASC
          LIMIT 50
        `
      : await sql`
          SELECT id, branch_id, order_id, sector, status, payload, created_at, updated_at
          FROM print_jobs
          WHERE tenant_id = ${user.tid}::uuid
            AND branch_id = ${branchId}::uuid
            AND status = ${status}
          ORDER BY created_at ASC
          LIMIT 50
        `;

    return jsonResponse({ printJobs: jobs });
  } finally {
    await sql.end();
  }
}

export async function handleUpdatePrintJobStatus(
  request: Request,
  env: GatewayEnv,
  user: JwtPayload,
  jobId: string,
): Promise<Response> {
  const raw = await parseJsonBody(request);
  const parsed = UpdatePrintJobStatusSchema.safeParse(raw);
  if (!parsed.success) {
    return jsonResponse({ error: "validation_error", details: parsed.error.flatten() }, 400);
  }

  const sql = getSql(env);
  try {
    const updated = await sql<{ id: string; status: string; sector: string; order_id: string }[]>`
      UPDATE print_jobs
      SET status = ${parsed.data.status}, updated_at = NOW()
      WHERE id = ${jobId}::uuid AND tenant_id = ${user.tid}::uuid
      RETURNING id, status, sector, order_id
    `;

    if (!updated[0]) return jsonResponse({ error: "not_found" }, 404);

    return jsonResponse({ printJob: updated[0] });
  } finally {
    await sql.end();
  }
}
