import { describe, it, expect } from "vitest";
import { getStorageConfig } from "./s3-client";
import { testEnv } from "../../test/helpers";

describe("s3-client config", () => {
  it("retorna null sem variáveis S3", () => {
    expect(getStorageConfig(testEnv())).toBeNull();
  });

  it("monta config MinIO quando env completo", () => {
    const config = getStorageConfig(
      testEnv({
        STORAGE_PROVIDER: "minio",
        S3_ENDPOINT: "http://minio:9000",
        S3_BUCKET: "inova-gastro-360",
        S3_ACCESS_KEY: "key",
        S3_SECRET_KEY: "secret",
        S3_PUBLIC_BASE_URL: "https://cdn.example.com/inova-gastro-360",
      }),
    );
    expect(config?.provider).toBe("minio");
    expect(config?.forcePathStyle).toBe(true);
    expect(config?.bucket).toBe("inova-gastro-360");
  });
});
