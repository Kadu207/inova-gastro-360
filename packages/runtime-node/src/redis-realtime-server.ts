import http from "node:http";
import { createClient, type RedisClientType } from "redis";
import { WebSocketServer, type WebSocket } from "ws";
import {
  WS_PROTOCOL_MARKER,
  canAccessBranch,
  extractAccessToken,
  realtimeRoomKey,
  verifyAccessToken,
} from "@inova-gastro-360/auth";
import { resolveBindHost } from "./bind-host.js";
import { assertUsableSecret } from "./secrets.js";

export interface RedisRealtimeServer {
  readonly httpServer: http.Server;
  close(): Promise<void>;
}

function headersFromNodeRequest(req: http.IncomingMessage): Headers {
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value == null) continue;
    if (Array.isArray(value)) {
      for (const v of value) headers.append(key, v);
    } else {
      headers.set(key, value);
    }
  }
  return headers;
}

export async function createRedisRealtimeServer(options: {
  port: number;
  redisUrl: string;
  serviceName?: string;
  /** Segredo interno exigido no POST /broadcast. Obrigatório. */
  internalSecret: string;
  /** Segredo JWT para autenticar conexões WebSocket. Obrigatório. */
  jwtSecret: string;
}): Promise<RedisRealtimeServer> {
  const { port, redisUrl, serviceName = "realtime-hub" } = options;
  const internalSecret = assertUsableSecret(options.internalSecret, "INTERNAL_SHARED_SECRET");
  const jwtSecret = assertUsableSecret(options.jwtSecret, "JWT_SECRET");

  const sockets = new Map<string, Set<WebSocket>>();

  const pub: RedisClientType = createClient({ url: redisUrl });
  const sub: RedisClientType = createClient({ url: redisUrl });
  await pub.connect();
  await sub.connect();

  function deliverLocal(roomKey: string, message: string): number {
    let delivered = 0;
    for (const ws of sockets.get(roomKey) ?? []) {
      if (ws.readyState === ws.OPEN) {
        ws.send(message);
        delivered++;
      }
    }
    return delivered;
  }

  await sub.pSubscribe("branch:*", (message, channel) => {
    const roomKey = channel.replace(/^branch:/, "");
    deliverLocal(roomKey, message);
  });

  function trackSocket(roomKey: string, ws: WebSocket): void {
    if (!sockets.has(roomKey)) sockets.set(roomKey, new Set());
    sockets.get(roomKey)!.add(ws);
    ws.on("close", () => sockets.get(roomKey)?.delete(ws));
  }

  const httpServer = http.createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", `http://127.0.0.1:${port}`);

    if (url.pathname === "/health") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(
        JSON.stringify({
          status: "ok",
          service: serviceName,
          mode: "redis-pubsub",
          version: "0.1.0",
          timestamp: new Date().toISOString(),
        }),
      );
      return;
    }

    if (url.pathname === "/" && req.method === "GET") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(
        JSON.stringify({
          service: serviceName,
          health: "/health",
          websocket: "/ws?branchId=<uuid> (auth: cookie ou Sec-WebSocket-Protocol)",
          broadcast: "POST /broadcast?tenantId=<uuid>&branchId=<uuid> (x-internal-secret)",
        }),
      );
      return;
    }

    if (url.pathname === "/broadcast" && req.method === "POST") {
      if (req.headers["x-internal-secret"] !== internalSecret) {
        res.writeHead(403, { "content-type": "application/json" });
        res.end(JSON.stringify({ error: "forbidden" }));
        return;
      }
      const branchId = url.searchParams.get("branchId") ?? "";
      if (!branchId || branchId === "default") {
        res.writeHead(400, { "content-type": "application/json" });
        res.end(JSON.stringify({ error: "branch_id_required" }));
        return;
      }
      const tenantId = url.searchParams.get("tenantId") ?? "";
      if (!tenantId) {
        res.writeHead(400, { "content-type": "application/json" });
        res.end(JSON.stringify({ error: "tenant_id_required" }));
        return;
      }
      const roomKey = realtimeRoomKey(tenantId, branchId);
      const chunks: Buffer[] = [];
      for await (const chunk of req) chunks.push(chunk as Buffer);
      const body = Buffer.concat(chunks).toString("utf8");
      await pub.publish(`branch:${roomKey}`, body);
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: true, subscribers: sockets.get(roomKey)?.size ?? 0 }));
      return;
    }

    res.writeHead(404, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "not_found" }));
  });

  const wss = new WebSocketServer({
    noServer: true,
    handleProtocols: (protocols) => {
      if (protocols.has(WS_PROTOCOL_MARKER)) return WS_PROTOCOL_MARKER;
      return false;
    },
  });

  httpServer.on("upgrade", (req, socket, head) => {
    const url = new URL(req.url ?? "/", `http://127.0.0.1:${port}`);
    if (url.pathname !== "/ws") {
      socket.destroy();
      return;
    }
    const branchId = url.searchParams.get("branchId") ?? "";

    void (async () => {
      const headers = headersFromNodeRequest(req);
      const token = extractAccessToken(headers);
      const payload = token ? await verifyAccessToken(token, jwtSecret) : null;
      if (!payload || !canAccessBranch(payload, branchId)) {
        socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
        socket.destroy();
        return;
      }
      const roomKey = realtimeRoomKey(payload.tid, branchId);
      wss.handleUpgrade(req, socket, head, (ws) => {
        trackSocket(roomKey, ws);
      });
    })();
  });

  const bindHost = resolveBindHost();
  await new Promise<void>((resolve) => {
    httpServer.listen(port, bindHost, () => {
      console.log(`[${serviceName}] Redis WS http://${bindHost}:${port}`);
      resolve();
    });
  });

  return {
    httpServer,
    async close() {
      wss.close();
      httpServer.close();
      await pub.quit();
      await sub.quit();
    },
  };
}
