export interface GatewayEnv {
  ENVIRONMENT?: string;
  DATABASE_URL?: string;
  JWT_SECRET?: string;
  OUTBOX_FLUSH_SECRET?: string;
  MESSAGING_SERVICE?: Fetcher;
  /** Binding Hyperdrive (produção). Local dev usa DATABASE_URL em .dev.vars */
  HYPERDRIVE?: Hyperdrive;
}

interface Hyperdrive {
  connectionString: string;
}
