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

  it("accepts optional commercial fields", () => {
    const result = CreateTenantSchema.safeParse({
      name: "Burger House",
      slug: "burger-house",
      documentNumber: "12345678000199",
      phone: "11999998888",
      branchAddress: "Rua A, 100",
      admin: validAdmin,
    });
    expect(result.success).toBe(true);
  });

  it("rejects non-digit documentNumber", () => {
    const result = CreateTenantSchema.safeParse({
      name: "Burger House",
      slug: "burger-house",
      documentNumber: "12.345.678/0001-99",
      admin: validAdmin,
    });
    expect(result.success).toBe(false);
  });
});
