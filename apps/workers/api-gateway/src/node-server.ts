import { createServiceFetcher, serveFetchWorker } from "@inova-gastro-360/runtime-node";
import worker from "./index";
import type { Env } from "./index";
import { flushPendingOutbox } from "./lib/outbox-replay";

function buildEnv(): Env {
  const messagingUrl = process.env.MESSAGING_URL ?? "http://127.0.0.1:8789";
  return {
    ENVIRONMENT: process.env.ENVIRONMENT ?? "production",
    DATABASE_URL: process.env.DATABASE_URL,
    JWT_SECRET: process.env.JWT_SECRET,
    OUTBOX_FLUSH_SECRET: process.env.OUTBOX_FLUSH_SECRET,
    MESSAGING_SERVICE: createServiceFetcher(messagingUrl),
    STORAGE_PROVIDER: process.env.STORAGE_PROVIDER as Env["STORAGE_PROVIDER"],
    S3_ENDPOINT: process.env.S3_ENDPOINT,
    S3_REGION: process.env.S3_REGION,
    S3_BUCKET: process.env.S3_BUCKET,
    S3_ACCESS_KEY: process.env.S3_ACCESS_KEY,
    S3_SECRET_KEY: process.env.S3_SECRET_KEY,
    S3_PUBLIC_BASE_URL: process.env.S3_PUBLIC_BASE_URL,
  };
}

const port = Number.parseInt(process.env.PORT ?? "8792", 10);
const env = buildEnv();
serveFetchWorker(worker, env, port, "api-gateway");

const flushMs = Number.parseInt(process.env.OUTBOX_FLUSH_INTERVAL_MS ?? "60000", 10);
if (flushMs > 0) {
  setInterval(() => {
    void flushPendingOutbox(env).then((r) => {
      if (r.published > 0) {
        console.log(`[outbox] replay published=${r.published} pending=${r.pending}`);
      }
    });
  }, flushMs);
}
