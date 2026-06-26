import { writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const base = process.env.OUTBOX_FLUSH_API_BASE ?? "http://127.0.0.1:8792";
const secret = process.env.OUTBOX_FLUSH_SECRET;

const headers = { "content-type": "application/json" };
if (secret) {
  Object.assign(headers, { "x-outbox-flush-secret": secret });
}

const res = await fetch(`${base}/internal/outbox/flush`, { method: "POST", headers });
const body = await res.json().catch(() => ({}));

if (!res.ok) {
  console.error(`[outbox:flush] HTTP ${res.status}`, body);
  process.exit(1);
}

console.log("[outbox:flush]", JSON.stringify(body));
