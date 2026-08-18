import type { JwtPayload } from "@inova-gastro-360/auth";
import { canAccessBranch, hasOrderOpsRole } from "@inova-gastro-360/auth";
import { jsonResponse } from "../lib";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Autorização de filial + papel operacional (pedidos / impressão).
 * `branches` vazio no JWT = todas as filiais do tenant.
 */
export function assertBranchOpsAccess(
  user: JwtPayload,
  branchId: string | null | undefined,
): { ok: true; branchId: string } | { ok: false; response: Response } {
  if (!branchId) {
    return { ok: false, response: jsonResponse({ error: "branch_id_required" }, 400) };
  }
  if (!UUID_RE.test(branchId)) {
    return { ok: false, response: jsonResponse({ error: "invalid_branch_id" }, 400) };
  }
  if (!hasOrderOpsRole(user.role)) {
    return {
      ok: false,
      response: jsonResponse({ error: "forbidden", message: "Permissão insuficiente" }, 403),
    };
  }
  if (!canAccessBranch(user, branchId)) {
    return { ok: false, response: jsonResponse({ error: "forbidden" }, 403) };
  }
  return { ok: true, branchId };
}
