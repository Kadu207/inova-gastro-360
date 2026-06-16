import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

function getConnectionString(databaseUrl?: string): string {
  return (
    databaseUrl ??
    process.env.DATABASE_URL ??
    "postgresql://inova_gastro:inova_gastro_dev@127.0.0.1:5440/inova_gastro_360"
  );
}

export function createPrismaClient(databaseUrl?: string): PrismaClient {
  const adapter = new PrismaPg({ connectionString: getConnectionString(databaseUrl) });
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
