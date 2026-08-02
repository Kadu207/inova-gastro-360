export interface GatewayEnv {
  ENVIRONMENT?: string;
  DATABASE_URL?: string;
  /** VPS Postgres com cert autoassinado — ssl rejectUnauthorized: false */
  DATABASE_SSL_INSECURE?: string;
  JWT_SECRET?: string;
  OUTBOX_FLUSH_SECRET?: string;
  /** Segredo compartilhado para autenticar rotas internas entre workers */
  INTERNAL_SHARED_SECRET?: string;
  /** Lista CSV de origens permitidas em CORS (produção) */
  CORS_ALLOWED_ORIGINS?: string;
  /** Redis — rate limit compartilhado entre réplicas (VPS) */
  REDIS_URL?: string;
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
  /** Asaas — gateway oficial BR (PIX/cartão pedidos + SaaS) */
  ASAAS_API_KEY?: string;
  ASAAS_WEBHOOK_TOKEN?: string;
  /** true = sandbox.asaas.com */
  ASAAS_SANDBOX?: string;
  /** asaas (default BR) | stripe (fallback/internacional) */
  BILLING_PROVIDER?: string;
  /** asaas (default) | mercadopago (legado/rollback) */
  ORDER_PAYMENT_PROVIDER?: string;
  /** Mercado Pago — legado / rollback */
  MERCADOPAGO_ACCESS_TOKEN?: string;
  MERCADOPAGO_WEBHOOK_SECRET?: string;
  /** Stripe Billing — fallback SaaS */
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  /** Força modo sandbox nos gateways de pagamento */
  PAYMENTS_SANDBOX?: string;
  /** TTL do QR PIX em minutos (default 30) */
  PIX_EXPIRATION_MINUTES?: string;
  /** false = infra pronta, credenciais inseridas após venda do produto */
  PAYMENTS_ENABLED?: string;
  /** Base pública para URLs de webhook (default: CORS_ALLOWED_ORIGINS) */
  PAYMENTS_PUBLIC_BASE_URL?: string;
}

interface Hyperdrive {
  connectionString: string;
}
