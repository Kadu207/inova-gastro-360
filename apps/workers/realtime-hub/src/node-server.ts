import { createRedisRealtimeServer } from "@inova-gastro-360/runtime-node";

async function main(): Promise<void> {
  const port = Number.parseInt(process.env.PORT ?? "8790", 10);
  const redisUrl = process.env.REDIS_URL ?? "redis://127.0.0.1:6390";

  await createRedisRealtimeServer({
    port,
    redisUrl,
    serviceName: "realtime-hub",
  });
}

main().catch((err) => {
  console.error("[realtime-hub] fatal:", err);
  process.exit(1);
});
