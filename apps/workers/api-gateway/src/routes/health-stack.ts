import type { GatewayEnv } from "../types/env";

const DEFAULTS = {
  messaging: "http://127.0.0.1:8789",
  realtime: "http://127.0.0.1:8790",
  integrations: "http://127.0.0.1:8791",
  web: "http://127.0.0.1:3102",
} as const;

export interface StackHealthResult {
  status: "ok" | "degraded";
  timestamp: string;
  services: Array<{ name: string; url: string; ok: boolean; status?: number }>;
}

export async function checkStackHealth(env: GatewayEnv): Promise<StackHealthResult> {
  const messaging = process.env.MESSAGING_URL ?? DEFAULTS.messaging;
  const webHealthUrl = process.env.WEB_HEALTH_URL ?? `${DEFAULTS.web}/login`;

  const targets = [
    { name: "api-gateway", url: process.env.API_SELF_HEALTH_URL ?? "http://127.0.0.1:8792/health" },
    { name: "messaging-bus", url: `${messaging.replace(/\/$/, "")}/health` },
    { name: "realtime-hub", url: `${(process.env.REALTIME_URL ?? DEFAULTS.realtime).replace(/\/$/, "")}/health` },
    {
      name: "integrations",
      url: `${(process.env.INTEGRATIONS_URL ?? DEFAULTS.integrations).replace(/\/$/, "")}/health`,
    },
    { name: "web", url: webHealthUrl },
  ];

  const services = await Promise.all(
    targets.map(async (target) => {
      try {
        const res = await fetch(target.url, { signal: AbortSignal.timeout(3000) });
        return { name: target.name, url: target.url, ok: res.ok, status: res.status };
      } catch {
        return { name: target.name, url: target.url, ok: false };
      }
    }),
  );

  const ok = services.every((s) => s.ok);
  return {
    status: ok ? "ok" : "degraded",
    timestamp: new Date().toISOString(),
    services,
  };
}
