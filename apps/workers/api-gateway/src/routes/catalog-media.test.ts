import { describe, it, expect } from "vitest";
import { handleServeCatalogMedia } from "./catalog-media";
import { testEnv } from "../test/helpers";

describe("catalog-media", () => {
  const env = testEnv({
    S3_BUCKET: "inova-gastro-360",
    S3_ENDPOINT: undefined,
  });

  it("rejeita path fora do padrão tenants/", async () => {
    const req = new Request(
      "http://test/media/inova-gastro-360/secret/file.png",
      { method: "GET" },
    );
    const res = await handleServeCatalogMedia(req, env);
    expect(res.status).toBe(404);
  });

  it("404 sem storage configurado", async () => {
    const req = new Request(
      "http://test/media/inova-gastro-360/tenants/11111111-1111-4111-8111-111111111111/branches/22222222-2222-4222-8222-222222222222/products/33333333-3333-4333-8333-333333333333/x.png",
      { method: "GET" },
    );
    const res = await handleServeCatalogMedia(req, env);
    expect(res.status).toBe(404);
  });
});
