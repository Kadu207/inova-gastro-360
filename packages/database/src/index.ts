import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import pg from "pg";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

function getConnectionString(databaseUrl?: string): string {
  const connectionString = databaseUrl ?? process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required");
  }
  return connectionString;
}

function normalizePgConnectionString(connectionString: string): string {
  return connectionString
    .replace(/([?&])sslmode=[^&]*/g, "")
    .replace(/([?&])uselibpqcompat=[^&]*/g, "")
    .replace(/([?&])schema=[^&]*/g, "")
    .replace(/\?&/, "?")
    .replace(/\?$/, "");
}

export function createPrismaClient(databaseUrl?: string): PrismaClient {
  const connectionString = normalizePgConnectionString(getConnectionString(databaseUrl));
  const insecureSsl =
    process.env.DATABASE_SSL_INSECURE === "1" || process.env.DATABASE_SSL_INSECURE === "true";

  const adapter = insecureSsl
    ? new PrismaPg(
        new pg.Pool({
          connectionString,
          ssl: { rejectUnauthorized: false },
        }),
      )
    : new PrismaPg({ connectionString });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

/** Define tenant context para RLS na sessão atual */
export async function withTenantContext<T>(
  client: PrismaClient,
  tenantId: string,
  fn: (tx: PrismaClient) => Promise<T>,
): Promise<T> {
  await client.$executeRawUnsafe(`SET LOCAL app.current_tenant_id = '${tenantId}'`);
  return fn(client);
}

export * from "@prisma/client";
