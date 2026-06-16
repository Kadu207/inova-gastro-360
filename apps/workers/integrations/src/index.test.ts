import { describe, it, expect } from "vitest";
import { healthHandler } from "./lib";

describe("integrations", () => {
  it("health ok", async () => {
    const body = (await (await healthHandler("integrations")).json()) as { status: string };
    expect(body.status).toBe("ok");
  });
});
