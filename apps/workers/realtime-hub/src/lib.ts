export function healthHandler(service: string): Response {
  return new Response(
    JSON.stringify({
      status: "ok",
      service,
      version: "0.1.0",
      timestamp: new Date().toISOString(),
    }),
    { headers: { "content-type": "application/json" } },
  );
}

export class BranchRealtimeHub {
  constructor(private state: DurableObjectState) {}

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return healthHandler("realtime-hub-do");
    }

    if (url.pathname === "/broadcast" && request.method === "POST") {
      const event = (await request.json()) as { type: string; payload: unknown };
      const delivered = this.broadcast(JSON.stringify(event));
      return new Response(JSON.stringify({ ok: true, delivered }), {
        headers: { "content-type": "application/json" },
      });
    }

    if (request.headers.get("Upgrade")?.toLowerCase() === "websocket") {
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);
      this.state.acceptWebSocket(server);
      return new Response(null, { status: 101, webSocket: client });
    }

    return new Response(JSON.stringify({ error: "not_found" }), {
      status: 404,
      headers: { "content-type": "application/json" },
    });
  }

  private broadcast(message: string): number {
    let delivered = 0;
    for (const ws of this.state.getWebSockets()) {
      try {
        ws.send(message);
        delivered++;
      } catch {
        /* socket closed */
      }
    }
    return delivered;
  }

  webSocketClose(ws: WebSocket): void {
    ws.close(1000, "closed");
  }
}
