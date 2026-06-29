import { describe, it, expect } from "vitest";
import {
  CategoryInputSchema,
  CategoryPatchSchema,
  PresignInputSchema,
  ProductInputSchema,
} from "./catalog";

describe("catalog validation", () => {
  it("aceita categoria válida", () => {
    const r = CategoryInputSchema.safeParse({ name: "Pizzas", sortOrder: 2 });
    expect(r.success).toBe(true);
  });

  it("rejeita categoria sem nome", () => {
    expect(CategoryInputSchema.safeParse({ name: "" }).success).toBe(false);
  });

  it("rejeita patch vazio", () => {
    expect(CategoryPatchSchema.safeParse({}).success).toBe(false);
  });

  it("rejeita produto com preço zero", () => {
    expect(
      ProductInputSchema.safeParse({
        categoryId: "00000000-0000-4000-8000-000000000010",
        name: "Item",
        priceCents: 0,
      }).success,
    ).toBe(false);
  });

  it("rejeita presign com MIME inválido", () => {
    expect(
      PresignInputSchema.safeParse({
        contentType: "application/pdf",
        contentLength: 1000,
      }).success,
    ).toBe(false);
  });

  it("rejeita presign acima de 5MB", () => {
    expect(
      PresignInputSchema.safeParse({
        contentType: "image/jpeg",
        contentLength: 6_000_000,
      }).success,
    ).toBe(false);
  });
});
