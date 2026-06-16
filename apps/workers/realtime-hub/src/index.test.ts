import { describe, it, expect } from "vitest";
import { healthHandler } from "./lib";

describe("realtime-hub", () => {
  it("health ok", async () => {
    const body = (await (await healthHandler("realtime-hub")).json()) as { status: string };
    expect(body.status).toBe("ok");
  });
});
