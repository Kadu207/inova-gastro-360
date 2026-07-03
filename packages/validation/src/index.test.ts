import { describe, it, expect } from "vitest";
import { CreateTenantSchema } from "./index";

describe("validation", () => {
  const validAdmin = { name: "Dono", email: "dono@x.com", password: "senha-forte-123" };

  it("rejects invalid tenant slug", () => {
    const result = CreateTenantSchema.safeParse({
      name: "Test",
      slug: "Invalid Slug!",
      admin: validAdmin,
    });
    expect(result.success).toBe(false);
  });

  it("accepts valid tenant with admin", () => {
    const result = CreateTenantSchema.safeParse({
      name: "Burger House",
      slug: "burger-house",
      admin: validAdmin,
    });
    expect(result.success).toBe(true);
  });

  it("rejects tenant without admin", () => {
    const result = CreateTenantSchema.safeParse({ name: "Burger House", slug: "burger-house" });
    expect(result.success).toBe(false);
  });
});
