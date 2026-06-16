export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
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
