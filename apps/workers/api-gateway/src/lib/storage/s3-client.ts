import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { GatewayEnv } from "../../types/env";
import {
  buildProductImageObjectKey,
  buildPublicObjectUrl,
  type AllowedImageContentType,
} from "./image-policy";

export interface StorageConfig {
  provider: "minio" | "r2";
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicBaseUrl: string;
  forcePathStyle: boolean;
}

export interface PresignUploadResult {
  uploadUrl: string;
  publicUrl: string;
  method: "PUT";
  headers: Record<string, string>;
  objectKey: string;
}

export function getStorageConfig(env: GatewayEnv): StorageConfig | null {
  const endpoint = env.S3_ENDPOINT?.trim();
  const bucket = env.S3_BUCKET?.trim();
  const accessKeyId = env.S3_ACCESS_KEY?.trim();
  const secretAccessKey = env.S3_SECRET_KEY?.trim();
  const publicBaseUrl = env.S3_PUBLIC_BASE_URL?.trim();

  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey || !publicBaseUrl) {
    return null;
  }

  const provider = env.STORAGE_PROVIDER === "r2" ? "r2" : "minio";

  return {
    provider,
    endpoint,
    region: env.S3_REGION?.trim() || "auto",
    bucket,
    accessKeyId,
    secretAccessKey,
    publicBaseUrl,
    forcePathStyle: provider === "minio",
  };
}

export function createS3Client(config: StorageConfig): S3Client {
  return new S3Client({
    endpoint: config.endpoint,
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    forcePathStyle: config.forcePathStyle,
  });
}

export async function uploadProductImage(
  env: GatewayEnv,
  params: {
    tenantId: string;
    branchId: string;
    productId: string;
    contentType: AllowedImageContentType;
    body: Uint8Array;
  },
): Promise<{ publicUrl: string; objectKey: string } | null> {
  const config = getStorageConfig(env);
  if (!config) return null;

  const objectKey = buildProductImageObjectKey(
    params.tenantId,
    params.branchId,
    params.productId,
    params.contentType,
  );

  const client = createS3Client(config);
  await client.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: objectKey,
      Body: params.body,
      ContentType: params.contentType,
    }),
  );

  return {
    publicUrl: buildPublicObjectUrl(config.publicBaseUrl, objectKey),
    objectKey,
  };
}

export async function presignProductImageUpload(
  env: GatewayEnv,
  params: {
    tenantId: string;
    branchId: string;
    productId: string;
    contentType: AllowedImageContentType;
  },
): Promise<PresignUploadResult | null> {
  const config = getStorageConfig(env);
  if (!config) return null;

  const objectKey = buildProductImageObjectKey(
    params.tenantId,
    params.branchId,
    params.productId,
    params.contentType,
  );

  const client = createS3Client(config);
  const command = new PutObjectCommand({
    Bucket: config.bucket,
    Key: objectKey,
    ContentType: params.contentType,
  });

  const uploadUrl = await getSignedUrl(client, command, { expiresIn: 900 });

  return {
    uploadUrl,
    publicUrl: buildPublicObjectUrl(config.publicBaseUrl, objectKey),
    method: "PUT",
    headers: { "Content-Type": params.contentType },
    objectKey,
  };
}

export async function getCatalogMediaObject(
  env: GatewayEnv,
  objectKey: string,
): Promise<{ body: Uint8Array; contentType: string } | null> {
  const config = getStorageConfig(env);
  if (!config) return null;

  const client = createS3Client(config);
  try {
    const res = await client.send(
      new GetObjectCommand({
        Bucket: config.bucket,
        Key: objectKey,
      }),
    );
    if (!res.Body) return null;
    const body = new Uint8Array(await res.Body.transformToByteArray());
    return {
      body,
      contentType: res.ContentType ?? "application/octet-stream",
    };
  } catch {
    return null;
  }
}
