import { describe, it, expect, vi, afterEach } from "vitest";
import { createServiceFetcher } from "./http-fetcher";

describe("createServiceFetcher", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("reescreve host internal para base URL", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("ok", { status: 200 }));
    const fetcher = createServiceFetcher("http://127.0.0.1:8789");
    await fetcher.fetch("http://internal/internal/publish", {
      method: "POST",
      body: "{}",
    });
    expect(spy).toHaveBeenCalledOnce();
    const calledUrl = String(spy.mock.calls[0][0]);
    expect(calledUrl).toBe("http://127.0.0.1:8789/internal/publish");
  });

  it("define duplex half em POST com body (Node fetch)", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("ok", { status: 200 }));
    const fetcher = createServiceFetcher("http://127.0.0.1:8789");
    await fetcher.fetch("http://internal/internal/publish", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type: "order.created", payload: {} }),
    });
    const init = spy.mock.calls[0][1] as RequestInit & { duplex?: string };
    expect(init.duplex).toBe("half");
    expect(init.body).toBeTruthy();
  });
});
