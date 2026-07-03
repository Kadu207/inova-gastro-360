import { serveFetchWorker } from "@inova-gastro-360/runtime-node";
import worker from "./index";
import type { Env } from "./index";

function buildEnv(): Env {
  return {
    ENVIRONMENT: process.env.ENVIRONMENT ?? "production",
    REALTIME_URL: process.env.REALTIME_URL ?? "http://127.0.0.1:8790",
    INTEGRATIONS_URL: process.env.INTEGRATIONS_URL ?? "http://127.0.0.1:8791",
    INTERNAL_SHARED_SECRET: process.env.INTERNAL_SHARED_SECRET,
  };
}

const port = Number.parseInt(process.env.PORT ?? "8789", 10);
serveFetchWorker(worker, buildEnv(), port, "messaging-bus");
