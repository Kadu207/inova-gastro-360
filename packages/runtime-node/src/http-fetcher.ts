/** Substitui Service Bindings Cloudflare por HTTP interno (VPS / Node). */
export function createServiceFetcher(baseUrl: string): Fetcher {
  const base = baseUrl.replace(/\/$/, "");

  return {
    fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
      const req = input instanceof Request ? input : new Request(input, init);
      const parsed = new URL(req.url);
      const target = `${base}${parsed.pathname}${parsed.search}`;
      const forward: RequestInit & { duplex?: "half" } = {
        method: req.method,
        headers: req.headers,
      };
      if (req.body) {
        forward.body = req.body;
        // Node fetch exige duplex ao reenviar ReadableStream (Service Binding shim).
        forward.duplex = "half";
      }
      return fetch(target, forward);
    },
  } as Fetcher;
}
