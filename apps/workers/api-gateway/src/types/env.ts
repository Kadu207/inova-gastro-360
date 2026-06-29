export interface GatewayEnv {
  ENVIRONMENT?: string;
  DATABASE_URL?: string;
  /** VPS Postgres com cert autoassinado — ssl rejectUnauthorized: false */
  DATABASE_SSL_INSECURE?: string;
  JWT_SECRET?: string;
  OUTBOX_FLUSH_SECRET?: string;
  MESSAGING_SERVICE?: Fetcher;
  /** Binding Hyperdrive (produção). Local dev usa DATABASE_URL em .dev.vars */
  HYPERDRIVE?: Hyperdrive;
  /** Object storage — MinIO (VPS) ou Cloudflare R2 */
  STORAGE_PROVIDER?: "minio" | "r2";
  S3_ENDPOINT?: string;
  S3_REGION?: string;
  S3_BUCKET?: string;
  S3_ACCESS_KEY?: string;
  S3_SECRET_KEY?: string;
  S3_PUBLIC_BASE_URL?: string;
}

interface Hyperdrive {
  connectionString: string;
}
