import { createRedisRealtimeServer } from "@inova-gastro-360/runtime-node";

async function main(): Promise<void> {
  const port = Number.parseInt(process.env.PORT ?? "8790", 10);
  const redisUrl = process.env.REDIS_URL ?? "redis://127.0.0.1:6390";
  const internalSecret = process.env.INTERNAL_SHARED_SECRET;
  const jwtSecret = process.env.JWT_SECRET;

  if (!internalSecret || !jwtSecret) {
    throw new Error("JWT_SECRET e INTERNAL_SHARED_SECRET são obrigatórios no realtime-hub");
  }

  await createRedisRealtimeServer({
    port,
    redisUrl,
    serviceName: "realtime-hub",
    internalSecret,
    jwtSecret,
  });
}

main().catch((err) => {
  console.error("[realtime-hub] fatal:", err);
  process.exit(1);
});
