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

export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}
