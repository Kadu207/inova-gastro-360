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
