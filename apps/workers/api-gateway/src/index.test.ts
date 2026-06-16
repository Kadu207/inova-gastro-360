import { describe, it, expect } from "vitest";
import { healthHandler } from "./lib";

describe("api-gateway", () => {
  it("returns health ok", async () => {
    const res = healthHandler("api-gateway");
    const body = (await res.json()) as { status: string; service: string };
    expect(body.status).toBe("ok");
    expect(body.service).toBe("api-gateway");
  });
});
