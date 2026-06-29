#!/usr/bin/env node
/**
 * Smoke pós-deploy — spec 013 T013
 * Uso: npm run smoke:health
 */
const apiBase = process.env.API_BASE ?? "http://127.0.0.1:8792";

const res = await fetch(`${apiBase}/health/stack`, { signal: AbortSignal.timeout(10000) });
const body = await res.json().catch(() => ({}));

console.log(JSON.stringify(body, null, 2));

if (!res.ok || body.status !== "ok") {
  console.error("[smoke:health] stack degradado ou indisponível");
  process.exit(1);
}

console.log("[smoke:health] OK");
