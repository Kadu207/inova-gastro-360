import http from "node:http";
import type { IncomingMessage } from "node:http";
import { resolveBindHost } from "./bind-host.js";

export interface FetchWorkerModule {
  fetch(request: Request, env: unknown, ctx?: ExecutionContext): Promise<Response>;
}

export function createExecutionContext(): ExecutionContext {
  return {
    waitUntil(promise: Promise<unknown>) {
      void promise.catch((err) => console.error("[waitUntil]", err));
    },
    passThroughOnException() {
      /* noop — Node runtime */
    },
  } as ExecutionContext;
}

async function readBody(req: IncomingMessage): Promise<Buffer | undefined> {
  if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") {
    return undefined;
  }
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(chunk as Buffer);
  }
  return chunks.length ? Buffer.concat(chunks) : undefined;
}

export function serveFetchWorker(
  module: FetchWorkerModule,
  env: unknown,
  port: number,
  serviceName: string,
): http.Server {
  const server = http.createServer(async (req, res) => {
    try {
      const host = req.headers.host ?? `127.0.0.1:${port}`;
      const url = `http://${host}${req.url ?? "/"}`;
      const body = await readBody(req);
      const request = new Request(url, {
        method: req.method,
        headers: req.headers as HeadersInit,
        body: body ? new Uint8Array(body) : undefined,
      });
      const response = await module.fetch(request, env, createExecutionContext());
      const headers: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headers[key] = value;
      });
      const payload = Buffer.from(await response.arrayBuffer());
      res.writeHead(response.status, headers);
      res.end(payload);
    } catch (err) {
      console.error(`[${serviceName}] request error`, err);
      res.writeHead(500, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: "internal_error" }));
    }
  });

  const bindHost = resolveBindHost();
  server.listen(port, bindHost, () => {
    console.log(`[${serviceName}] Node runtime http://${bindHost}:${port}`);
  });

  return server;
}
