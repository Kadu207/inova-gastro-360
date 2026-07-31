import { serveFetchWorker } from "@inova-gastro-360/runtime-node";
import worker from "./index";
import type { Env } from "./index";

function buildEnv(): Env {
  return {
    ENVIRONMENT: process.env.ENVIRONMENT ?? "production",
    N8N_WEBHOOK_URL: process.env.N8N_WEBHOOK_URL,
    CHATWOOT_WEBHOOK_URL: process.env.CHATWOOT_WEBHOOK_URL,
    INTERNAL_SHARED_SECRET: process.env.INTERNAL_SHARED_SECRET,
    ASAAS_API_KEY: process.env.ASAAS_API_KEY,
    ASAAS_WEBHOOK_TOKEN: process.env.ASAAS_WEBHOOK_TOKEN,
    ASAAS_SANDBOX: process.env.ASAAS_SANDBOX,
    PAYMENTS_SANDBOX: process.env.PAYMENTS_SANDBOX,
    MERCADOPAGO_ACCESS_TOKEN: process.env.MERCADOPAGO_ACCESS_TOKEN,
    MERCADOPAGO_WEBHOOK_SECRET: process.env.MERCADOPAGO_WEBHOOK_SECRET,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    API_GATEWAY_URL: process.env.API_GATEWAY_URL ?? "http://127.0.0.1:8792",
  };
}

const port = Number.parseInt(process.env.PORT ?? "8791", 10);
serveFetchWorker(worker, buildEnv(), port, "integrations");
