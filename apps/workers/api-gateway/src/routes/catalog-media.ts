import type { GatewayEnv } from "../types/env";
import { jsonResponse } from "../lib";
import { isPublicCatalogObjectKey, parseMediaPath } from "../lib/storage/image-policy";
import { getCatalogMediaObject } from "../lib/storage/s3-client";

/** GET /media/{bucket}/tenants/... — leitura autenticada S3 (objetos privados no MinIO). */
export async function handleServeCatalogMedia(
  request: Request,
  env: GatewayEnv,
): Promise<Response> {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return jsonResponse({ error: "method_not_allowed" }, 405);
  }

  const bucket = env.S3_BUCKET?.trim() ?? "inova-gastro-360";
  const objectKey = parseMediaPath(new URL(request.url).pathname, bucket);
  if (!objectKey || !isPublicCatalogObjectKey(objectKey)) {
    return jsonResponse({ error: "not_found" }, 404);
  }

  const obj = await getCatalogMediaObject(env, objectKey);
  if (!obj) {
    return jsonResponse({ error: "not_found" }, 404);
  }

  const headers = new Headers({
    "Content-Type": obj.contentType,
    "Cache-Control": "public, max-age=86400",
  });

  if (request.method === "HEAD") {
    return new Response(null, { status: 200, headers });
  }

  return new Response(obj.body, { status: 200, headers });
}
