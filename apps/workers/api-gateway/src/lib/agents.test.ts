import { describe, it, expect } from "vitest";
import { runOrderStateGuardian, runSessionSweeper, runTrialExpiryNotifier } from "./agents";
import type { GatewayEnv } from "../types/env";

describe("agentes runtime EMB (sem DB)", () => {
  it("EMB-01 retorna zero sem banco configurado", async () => {
    const result = await runOrderStateGuardian({} as GatewayEnv);
    expect(result).toEqual({ flagged: 0 });
  });

  it("EMB-02 retorna zero sem banco configurado", async () => {
    const result = await runSessionSweeper({} as GatewayEnv);
    expect(result).toEqual({ removed: 0 });
  });

  it("EMB-03 retorna zero sem banco configurado", async () => {
    const result = await runTrialExpiryNotifier({} as GatewayEnv);
    expect(result).toEqual({ notified: 0 });
  });
});
