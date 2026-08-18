import {
  WS_PROTOCOL_MARKER,
  canAccessBranch,
  extractAccessToken,
  verifyAccessToken,
} from "@inova-gastro-360/auth";
import { BranchRealtimeHub, healthHandler } from "./lib";

export interface Env {
  BRANCH_HUB: DurableObjectNamespace;
  JWT_SECRET?: string;
  INTERNAL_SHARED_SECRET?: string;
  ENVIRONMENT?: string;
}

export { BranchRealtimeHub };

function unauthorized(): Response {
  return new Response(JSON.stringify({ error: "unauthorized" }), {
    status: 401,
    headers: { "content-type": "application/json" },
  });
}

function forbidden(): Response {
  return new Response(JSON.stringify({ error: "forbidden" }), {
    status: 403,
    headers: { "content-type": "application/json" },
  });
}

function requireSecret(value: string | undefined, name: string): string {
  if (!value || value.length < 16) {
    throw new Error(`${name} ausente ou fraco no realtime-hub`);
  }
  return value;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return healthHandler("realtime-hub");
    }

    if (url.pathname === "/" && request.method === "GET") {
      return Response.json({
        service: "realtime-hub",
        app: "Inova Gastro 360",
        health: "/health",
        websocket: "/ws?branchId=<uuid> (cookie ou Sec-WebSocket-Protocol)",
        broadcast: "POST /broadcast?branchId=<uuid> (x-internal-secret)",
      });
    }

    const branchId = url.searchParams.get("branchId") ?? "";
    const isBroadcast = url.pathname === "/broadcast" && request.method === "POST";
    const isWs = url.pathname === "/ws";

    if (isBroadcast) {
      const internal = requireSecret(env.INTERNAL_SHARED_SECRET, "INTERNAL_SHARED_SECRET");
      if (request.headers.get("x-internal-secret") !== internal) {
        return forbidden();
      }
      if (!branchId || branchId === "default") {
        return new Response(JSON.stringify({ error: "branch_id_required" }), {
          status: 400,
          headers: { "content-type": "application/json" },
        });
      }
    } else if (isWs) {
      const jwtSecret = requireSecret(env.JWT_SECRET, "JWT_SECRET");
      const token = extractAccessToken(request.headers);
      const payload = token ? await verifyAccessToken(token, jwtSecret) : null;
      if (!payload || !canAccessBranch(payload, branchId)) {
        return unauthorized();
      }
    } else {
      return new Response(JSON.stringify({ error: "not_found" }), {
        status: 404,
        headers: { "content-type": "application/json" },
      });
    }

    const id = env.BRANCH_HUB.idFromName(branchId);
    const stub = env.BRANCH_HUB.get(id);

    const targetUrl = new URL(request.url);
    targetUrl.pathname = isWs ? "/ws" : url.pathname;

    const headers = new Headers(request.headers);
    headers.set("x-inova-internal-auth", "1");
    if (isWs && request.headers.get("sec-websocket-protocol")?.includes(WS_PROTOCOL_MARKER)) {
      headers.set("sec-websocket-protocol", WS_PROTOCOL_MARKER);
    }

    return stub.fetch(
      new Request(targetUrl.toString(), {
        method: request.method,
        headers,
        body: request.body,
        // Required by undici/Node when forwarding a ReadableStream body
        duplex: "half",
      } as RequestInit),
    );
  },
};
