import { describe, it, expect, vi, beforeEach } from "vitest";

const mockEnd = vi.fn();
const tag = vi.fn().mockResolvedValue(undefined);
const mockSql = Object.assign(tag, {
  end: mockEnd,
  json: vi.fn((value: unknown) => value),
});

vi.mock("./db", () => ({
  hasDatabase: vi.fn(() => true),
  getSql: vi.fn(() => mockSql),
}));

import { writeCatalogAuditLog } from "./audit-log";

describe("writeCatalogAuditLog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("insere registro com tenant, user e resource", async () => {
    const env = { DATABASE_URL: "postgres://test" } as never;

    await writeCatalogAuditLog(env, {
      tenantId: "00000000-0000-4000-8000-000000000001",
      userId: "00000000-0000-4000-8000-000000000002",
      action: "catalog.category.create",
      resource: "product_category:00000000-0000-4000-8000-000000000003",
      metadata: { branchId: "00000000-0000-4000-8000-000000000004" },
    });

    expect(tag).toHaveBeenCalled();
    expect(mockEnd).toHaveBeenCalled();
  });
});
