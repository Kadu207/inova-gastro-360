import { createServiceFetcher, serveFetchWorker } from "@inova-gastro-360/runtime-node";
import worker from "./index";
import type { Env } from "./index";
import { flushPendingOutbox } from "./lib/outbox-replay";
import { runOrderStateGuardian, runSessionSweeper, runTrialExpiryNotifier, runPastDueNotifier } from "./lib/agents";
import { runPaymentExpiryJob } from "./lib/payment-expiry";
import { configureRateLimitRedis } from "./lib/rate-limit";

async function connectRateLimitRedis(redisUrl: string | undefined): Promise<void> {
  if (!redisUrl) return;
  try {
    const { createClient } = await import("redis");
    const client = createClient({ url: redisUrl });
    client.on("error", (err) => console.error("[api-gateway] redis rate-limit error", err));
    await client.connect();
    configureRateLimitRedis({
      incr: (key) => client.incr(key),
      pExpire: (key, ms) => client.pExpire(key, ms),
      pTTL: (key) => client.pTTL(key),
      del: (key) => client.del(key),
    });
    console.log("[api-gateway] rate-limit Redis connected");
  } catch (err) {
    console.warn("[api-gateway] rate-limit Redis indisponível — fallback memória", err);
  }
}

function buildEnv(): Env {
  const messagingUrl = process.env.MESSAGING_URL ?? "http://127.0.0.1:8789";
  return {
    ENVIRONMENT: process.env.ENVIRONMENT ?? "production",
    DATABASE_URL: process.env.DATABASE_URL,
    DATABASE_SSL_INSECURE: process.env.DATABASE_SSL_INSECURE,
    JWT_SECRET: process.env.JWT_SECRET,
    OUTBOX_FLUSH_SECRET: process.env.OUTBOX_FLUSH_SECRET,
    INTERNAL_SHARED_SECRET: process.env.INTERNAL_SHARED_SECRET,
    CORS_ALLOWED_ORIGINS: process.env.CORS_ALLOWED_ORIGINS,
    REDIS_URL: process.env.REDIS_URL,
    MESSAGING_SERVICE: createServiceFetcher(messagingUrl),
    STORAGE_PROVIDER: process.env.STORAGE_PROVIDER as Env["STORAGE_PROVIDER"],
    S3_ENDPOINT: process.env.S3_ENDPOINT,
    S3_REGION: process.env.S3_REGION,
    S3_BUCKET: process.env.S3_BUCKET,
    S3_ACCESS_KEY: process.env.S3_ACCESS_KEY,
    S3_SECRET_KEY: process.env.S3_SECRET_KEY,
    S3_PUBLIC_BASE_URL: process.env.S3_PUBLIC_BASE_URL,
    MERCADOPAGO_ACCESS_TOKEN: process.env.MERCADOPAGO_ACCESS_TOKEN,
    MERCADOPAGO_WEBHOOK_SECRET: process.env.MERCADOPAGO_WEBHOOK_SECRET,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    PAYMENTS_SANDBOX: process.env.PAYMENTS_SANDBOX,
    PIX_EXPIRATION_MINUTES: process.env.PIX_EXPIRATION_MINUTES,
    PAYMENTS_ENABLED: process.env.PAYMENTS_ENABLED,
    PAYMENTS_PUBLIC_BASE_URL: process.env.PAYMENTS_PUBLIC_BASE_URL,
  };
}

async function main(): Promise<void> {
  const port = Number.parseInt(process.env.PORT ?? "8792", 10);
  const env = buildEnv();

  await connectRateLimitRedis(env.REDIS_URL);
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

  // Agentes runtime embarcados (EMB). Desligar com AGENTS_ENABLED=0.
  const agentsEnabled = process.env.AGENTS_ENABLED !== "0";
  const agentsIntervalMs = Number.parseInt(process.env.AGENTS_INTERVAL_MS ?? "300000", 10);
  if (agentsEnabled && agentsIntervalMs > 0) {
    setInterval(() => {
      void runOrderStateGuardian(env).then((r) => {
        if (r.flagged > 0) console.log(`[EMB-01] order-state-guardian flagged=${r.flagged}`);
      });
      void runSessionSweeper(env).then((r) => {
        if (r.removed > 0) console.log(`[EMB-02] session-sweeper removed=${r.removed}`);
      });
      void runTrialExpiryNotifier(env).then((r) => {
        if (r.notified > 0) console.log(`[EMB-03] trial-expiry-notifier notified=${r.notified}`);
      });
      void runPastDueNotifier(env).then((r) => {
        if (r.notified > 0) console.log(`[EMB-03] past-due-notifier notified=${r.notified}`);
      });
      void runPaymentExpiryJob(env).then((r) => {
        if (r.expired > 0) console.log(`[payments] expiry expired=${r.expired}`);
      });
    }, agentsIntervalMs);
  }
}

main().catch((err) => {
  console.error("[api-gateway] fatal", err);
  process.exit(1);
});
