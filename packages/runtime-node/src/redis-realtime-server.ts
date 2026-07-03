import http from "node:http";
import { createClient, type RedisClientType } from "redis";
import { WebSocketServer, type WebSocket } from "ws";
import { verifyAccessToken } from "@inova-gastro-360/auth";
import { resolveBindHost } from "./bind-host.js";

export interface RedisRealtimeServer {
  readonly httpServer: http.Server;
  close(): Promise<void>;
}

export async function createRedisRealtimeServer(options: {
  port: number;
  redisUrl: string;
  serviceName?: string;
  /** Segredo interno exigido no POST /broadcast (quando definido). */
  internalSecret?: string;
  /** Segredo JWT para autenticar conexões WebSocket (quando definido). */
  jwtSecret?: string;
}): Promise<RedisRealtimeServer> {
  const { port, redisUrl, serviceName = "realtime-hub", internalSecret, jwtSecret } = options;
  const sockets = new Map<string, Set<WebSocket>>();

  const pub: RedisClientType = createClient({ url: redisUrl });
  const sub: RedisClientType = createClient({ url: redisUrl });
  await pub.connect();
  await sub.connect();

  function deliverLocal(branchId: string, message: string): number {
    let delivered = 0;
    for (const ws of sockets.get(branchId) ?? []) {
      if (ws.readyState === ws.OPEN) {
        ws.send(message);
        delivered++;
      }
    }
    return delivered;
  }

  await sub.pSubscribe("branch:*", (message, channel) => {
    const branchId = channel.replace(/^branch:/, "");
    deliverLocal(branchId, message);
  });

  function trackSocket(branchId: string, ws: WebSocket): void {
    if (!sockets.has(branchId)) sockets.set(branchId, new Set());
    sockets.get(branchId)!.add(ws);
    ws.on("close", () => sockets.get(branchId)?.delete(ws));
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
          websocket: "/ws?branchId=<uuid>",
          broadcast: "POST /broadcast?branchId=<uuid>",
        }),
      );
      return;
    }

    if (url.pathname === "/broadcast" && req.method === "POST") {
      if (internalSecret && req.headers["x-internal-secret"] !== internalSecret) {
        res.writeHead(403, { "content-type": "application/json" });
        res.end(JSON.stringify({ error: "forbidden" }));
        return;
      }
      const branchId = url.searchParams.get("branchId") ?? "default";
      const chunks: Buffer[] = [];
      for await (const chunk of req) chunks.push(chunk as Buffer);
      const body = Buffer.concat(chunks).toString("utf8");
      await pub.publish(`branch:${branchId}`, body);
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: true, subscribers: sockets.get(branchId)?.size ?? 0 }));
      return;
    }

    res.writeHead(404, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "not_found" }));
  });

  const wss = new WebSocketServer({ noServer: true });
  httpServer.on("upgrade", (req, socket, head) => {
    const url = new URL(req.url ?? "/", `http://127.0.0.1:${port}`);
    if (url.pathname !== "/ws") {
      socket.destroy();
      return;
    }
    const branchId = url.searchParams.get("branchId") ?? "default";

    const authorizeAndTrack = async () => {
      if (jwtSecret) {
        const token = url.searchParams.get("token") ?? "";
        const payload = token ? await verifyAccessToken(token, jwtSecret) : null;
        if (!payload || !payload.branches.includes(branchId)) {
          socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
          socket.destroy();
          return;
        }
      }
      wss.handleUpgrade(req, socket, head, (ws) => {
        trackSocket(branchId, ws);
      });
    };

    void authorizeAndTrack();
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
