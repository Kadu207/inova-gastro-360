import { serveFetchWorker } from "@inova-gastro-360/runtime-node";
import worker from "./index";
import type { Env } from "./index";

function buildEnv(): Env {
  return {
    ENVIRONMENT: process.env.ENVIRONMENT ?? "production",
    N8N_WEBHOOK_URL: process.env.N8N_WEBHOOK_URL,
    CHATWOOT_WEBHOOK_URL: process.env.CHATWOOT_WEBHOOK_URL,
  };
}

const port = Number.parseInt(process.env.PORT ?? "8791", 10);
serveFetchWorker(worker, buildEnv(), port, "integrations");
