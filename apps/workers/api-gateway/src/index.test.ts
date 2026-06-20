import { describe, it, expect } from "vitest";
import { healthHandler, jsonResponse } from "./lib";
import worker from "./index";

describe("api-gateway", () => {
  it("returns health ok", async () => {
    const res = healthHandler("api-gateway");
    const body = (await res.json()) as { status: string; service: string };
    expect(body.status).toBe("ok");
    expect(body.service).toBe("api-gateway");
  });

  it("GET / retorna metadados do serviço", async () => {
    const res = await worker.fetch(new Request("https://api.test/"), {} as never);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { service: string; health: string };
    expect(body.service).toBe("api-gateway");
    expect(body.health).toBe("/health");
  });

  it("jsonResponse inclui header de serviço", () => {
    const res = jsonResponse({ ok: true });
    expect(res.headers.get("x-inova-gastro-service")).toBe("inova-gastro-360");
  });
});
