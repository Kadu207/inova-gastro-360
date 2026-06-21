export interface PrintAgentConfig {
  apiBase: string;
  email: string;
  password: string;
  tenantSlug: string;
  branchId: string;
  sector: string;
  pollIntervalMs: number;
  dryRun: boolean;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): PrintAgentConfig {
  const apiBase = env.PRINT_AGENT_API_BASE ?? "http://127.0.0.1:8792";
  const email = env.PRINT_AGENT_EMAIL ?? "admin@inovagastro360.local";
  const password = env.PRINT_AGENT_PASSWORD ?? "InovaGastro360!";
  const tenantSlug = env.PRINT_AGENT_TENANT_SLUG ?? "demo-burger";
  const branchId = env.PRINT_AGENT_BRANCH_ID ?? "00000000-0000-4000-8000-000000000002";
  const sector = env.PRINT_AGENT_SECTOR ?? "cozinha";
  const pollIntervalMs = Number.parseInt(env.PRINT_AGENT_POLL_MS ?? "5000", 10);
  const dryRun = env.PRINT_AGENT_DRY_RUN === "1" || env.PRINT_AGENT_DRY_RUN === "true";

  if (!Number.isFinite(pollIntervalMs) || pollIntervalMs < 1000) {
    throw new Error("PRINT_AGENT_POLL_MS inválido (mínimo 1000)");
  }

  return {
    apiBase: apiBase.replace(/\/$/, ""),
    email,
    password,
    tenantSlug,
    branchId,
    sector,
    pollIntervalMs,
    dryRun,
  };
}
