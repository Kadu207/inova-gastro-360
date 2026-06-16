import { describe, it, expect } from "vitest";
import { APP_NAME } from "@inova-gastro-360/config";

describe("web config", () => {
  it("uses correct product name", () => {
    expect(APP_NAME).toBe("Inova Gastro 360");
  });
});
