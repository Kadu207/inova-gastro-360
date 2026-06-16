import { describe, it, expect } from "vitest";
import { CreateTenantSchema } from "./index";

describe("validation", () => {
  it("rejects invalid tenant slug", () => {
    const result = CreateTenantSchema.safeParse({ name: "Test", slug: "Invalid Slug!" });
    expect(result.success).toBe(false);
  });

  it("accepts valid tenant", () => {
    const result = CreateTenantSchema.safeParse({ name: "Burger House", slug: "burger-house" });
    expect(result.success).toBe(true);
  });
});
