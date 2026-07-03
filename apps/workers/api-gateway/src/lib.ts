export interface WorkerEnv {
  ENVIRONMENT?: string;
  MESSAGING_SERVICE?: Fetcher;
  REALTIME_SERVICE?: Fetcher;
  INTEGRATIONS_SERVICE?: Fetcher;
}

export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "x-inova-gastro-service": "inova-gastro-360",
    },
  });
}

export function healthHandler(service: string, version = "0.1.0"): Response {
  return jsonResponse({
    status: "ok",
    service,
    version,
    timestamp: new Date().toISOString(),
  });
}

/** IP do cliente (Cloudflare ou proxy reverso). */
export function clientIp(request: Request): string {
  return (
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

/** Lê e faz parse de JSON do corpo. Retorna null se vazio ou inválido. */
export async function parseJsonBody(request: Request): Promise<unknown | null> {
  try {
    const text = await request.text();
    if (!text.trim()) return null;
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}
