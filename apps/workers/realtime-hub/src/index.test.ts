import { describe, it, expect } from "vitest";
import { healthHandler } from "./lib";

describe("realtime-hub", () => {
  it("health ok", async () => {
    const body = (await (await healthHandler("realtime-hub")).json()) as { status: string };
    expect(body.status).toBe("ok");
  });

  it("DO rejeita fetch sem auth interna", async () => {
    const { BranchRealtimeHub } = await import("./lib");
    const hub = new BranchRealtimeHub({} as DurableObjectState);
    const res = await hub.fetch(new Request("http://do/broadcast", { method: "POST", body: "{}" }));
    expect(res.status).toBe(403);
  });
});
