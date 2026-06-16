import { describe, it, expect } from "vitest";
import { healthHandler } from "./lib";

describe("messaging-bus", () => {
  it("health is ok", async () => {
    const body = (await (await healthHandler("messaging-bus")).json()) as { service: string };
    expect(body.service).toBe("messaging-bus");
  });
});
