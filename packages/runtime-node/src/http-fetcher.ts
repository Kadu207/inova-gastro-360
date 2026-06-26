/** Substitui Service Bindings Cloudflare por HTTP interno (VPS / Node). */
export function createServiceFetcher(baseUrl: string): Fetcher {
  const base = baseUrl.replace(/\/$/, "");

  return {
    fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
      const req = input instanceof Request ? input : new Request(input, init);
      const parsed = new URL(req.url);
      const target = `${base}${parsed.pathname}${parsed.search}`;
      return fetch(target, {
        method: req.method,
        headers: req.headers,
        body: req.body,
      });
    },
  } as Fetcher;
}
