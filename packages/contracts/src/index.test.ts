import { describe, it, expect } from "vitest";
import { HealthResponseSchema, EVENT_TYPES } from "./index";

describe("contracts", () => {
  it("validates health response", () => {
    const result = HealthResponseSchema.safeParse({
      status: "ok",
      service: "api-gateway",
      version: "0.1.0",
      timestamp: new Date().toISOString(),
    });
    expect(result.success).toBe(true);
  });

  it("defines order event types", () => {
    expect(EVENT_TYPES.ORDER_CREATED).toBe("order.created");
  });
});
