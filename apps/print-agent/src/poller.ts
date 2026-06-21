import type { PrintAgentConfig } from "./config";
import { PrintAgentApiClient, type PrintJobRow } from "./api-client";

export function formatJobLog(job: PrintJobRow): string {
  const payload = job.payload ?? {};
  const orderNumber = payload.orderNumber ?? "?";
  return `[print] job=${job.id.slice(0, 8)}… order=#${orderNumber} sector=${job.sector}`;
}

export async function processPendingJobs(
  client: PrintAgentApiClient,
  config: PrintAgentConfig,
  log: (msg: string) => void = console.log,
): Promise<number> {
  const jobs = await client.fetchPendingJobs();
  if (!jobs.length) return 0;

  for (const job of jobs) {
    log(formatJobLog(job));
    log(JSON.stringify(job.payload));

    if (config.dryRun) {
      log(`[dry-run] skip PATCH printed job=${job.id}`);
      continue;
    }

    await client.markPrinted(job.id);
    log(`[ok] marcado printed job=${job.id}`);
  }

  return jobs.length;
}

export async function runPollLoop(
  client: PrintAgentApiClient,
  config: PrintAgentConfig,
  log: (msg: string) => void = console.log,
): Promise<never> {
  await client.login();
  log(
    `Print-agent iniciado — API ${config.apiBase} branch=${config.branchId} sector=${config.sector} interval=${config.pollIntervalMs}ms`,
  );

  for (;;) {
    try {
      const n = await processPendingJobs(client, config, log);
      if (n > 0) log(`Processados ${n} job(s)`);
    } catch (err) {
      log(`[erro] ${err instanceof Error ? err.message : String(err)}`);
    }
    await new Promise((r) => setTimeout(r, config.pollIntervalMs));
  }
}
