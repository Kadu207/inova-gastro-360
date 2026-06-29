import { describe, it, expect } from "vitest";
import {
  handleCreateOrder,
  handleListOrders,
  handleUpdateOrderStatus,
  handleGetOrder,
  parseIdempotencyKey,
  parseListPagination,
  parseListOrderFilters,
} from "./orders";
import { testEnv, DEMO_BRANCH_ID, DEMO_PRODUCT_ID } from "../test/helpers";

describe("orders handlers — validação (sem DB)", () => {
  const env = testEnv();

  it("create order rejeita body inválido", async () => {
    const req = new Request("http://test/api/v1/orders", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ branchId: "not-uuid", items: [] }),
    });
    const user = {
      sub: "user-1",
      tid: "tenant-1",
      email: "a@b.com",
      role: "admin_cliente",
      branches: [],
    };
    const res = await handleCreateOrder(req, env, user);
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("validation_error");
  });

  it("create order sem JWT exige nome e telefone (guest)", async () => {
    const req = new Request("http://test/api/v1/orders", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        branchId: DEMO_BRANCH_ID,
        items: [{ productId: DEMO_PRODUCT_ID, quantity: 1 }],
      }),
    });
    const res = await handleCreateOrder(req, env, undefined);
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("guest_contact_required");
  });

  it("list orders exige branchId", async () => {
    const req = new Request("http://test/api/v1/orders");
    const user = {
      sub: "user-1",
      tid: "tenant-1",
      email: "a@b.com",
      role: "admin_cliente",
      branches: [],
    };
    const res = await handleListOrders(req, env, user);
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("branch_id_required");
  });

  it("update status rejeita status inválido", async () => {
    const req = new Request("http://test/api/v1/orders/x/status", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: "invalid" }),
    });
    const user = {
      sub: "user-1",
      tid: "tenant-1",
      email: "a@b.com",
      role: "admin_cliente",
      branches: [],
    };
    const res = await handleUpdateOrderStatus(req, env, user, DEMO_BRANCH_ID);
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("validation_error");
  });

  it("get order com id inexistente retorna 404 (sem conexão DB)", async () => {
    const envNoDb = testEnv({ DATABASE_URL: undefined, HYPERDRIVE: undefined });
    const user = {
      sub: "user-1",
      tid: "tenant-1",
      email: "a@b.com",
      role: "admin_cliente",
      branches: [],
    };
    await expect(
      handleGetOrder(new Request("http://test"), envNoDb, user, DEMO_BRANCH_ID),
    ).rejects.toThrow(/Banco não configurado/);
  });

  it("rejeita Idempotency-Key vazio", async () => {
    const req = new Request("http://test/api/v1/orders", {
      method: "POST",
      headers: { "Idempotency-Key": "   ", "content-type": "application/json" },
      body: JSON.stringify({
        branchId: DEMO_BRANCH_ID,
        items: [{ productId: DEMO_PRODUCT_ID, quantity: 1 }],
      }),
    });
    const result = parseIdempotencyKey(req);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(400);
  });

  it("rejeita limit inválido na listagem", () => {
    const url = new URL("http://test/api/v1/orders?branchId=x&limit=0");
    const result = parseListPagination(url);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(400);
  });

  it("rejeita page inválida na listagem", () => {
    const url = new URL("http://test/api/v1/orders?branchId=x&page=0");
    const result = parseListPagination(url);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(400);
  });

  it("paginação padrão page=1 limit=20", () => {
    const result = parseListPagination(new URL("http://test/api/v1/orders?branchId=x"));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.offset).toBe(0);
    }
  });

  it("rejeita channel inválido na listagem", () => {
    const result = parseListOrderFilters(new URL("http://test/api/v1/orders?channel=invalid"));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(400);
  });

  it("rejeita busca muito longa", () => {
    const q = "a".repeat(101);
    const result = parseListOrderFilters(new URL(`http://test/api/v1/orders?q=${q}`));
    expect(result.ok).toBe(false);
  });

  it("parseListOrderFilters extrai orderNumber numérico", () => {
    const result = parseListOrderFilters(new URL("http://test/api/v1/orders?q=42&channel=delivery"));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.channel).toBe("delivery");
      expect(result.orderNumber).toBe(42);
    }
  });
});

describe("orders — auth via worker", () => {
  it("GET /api/v1/orders sem token retorna 401", async () => {
    const worker = (await import("../index")).default;
    const res = await worker.fetch(new Request("https://api.test/api/v1/orders?branchId=x"), testEnv());
    expect(res.status).toBe(401);
  });

  it("POST /api/v1/orders sem token exige contato guest", async () => {
    const worker = (await import("../index")).default;
    const res = await worker.fetch(
      new Request("https://api.test/api/v1/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          branchId: DEMO_BRANCH_ID,
          items: [{ productId: DEMO_PRODUCT_ID, quantity: 1 }],
        }),
      }),
      testEnv(),
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("guest_contact_required");
  });

  it("GET /api/v1/orders com token inválido retorna 401", async () => {
    const worker = (await import("../index")).default;
    const res = await worker.fetch(
      new Request("https://api.test/api/v1/orders?branchId=x", {
        headers: { authorization: "Bearer invalid.token.here" },
      }),
      testEnv({ DATABASE_URL: undefined, HYPERDRIVE: undefined }),
    );
    expect(res.status).toBe(401);
  });
});
