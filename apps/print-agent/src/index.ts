import { loadConfig } from "./config";
import { PrintAgentApiClient } from "./api-client";
import { runPollLoop } from "./poller";

async function main(): Promise<void> {
  const config = loadConfig();
  const client = new PrintAgentApiClient(config);

  const maxAttempts = 30;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await client.login();
      break;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (attempt === maxAttempts) {
        console.error(`[print-agent] API indisponível em ${config.apiBase} após ${maxAttempts} tentativas: ${msg}`);
        console.error("[print-agent] Inicie a API: npm run dev:api (e docker compose up -d)");
        process.exit(1);
      }
      console.log(`[print-agent] aguardando API (${attempt}/${maxAttempts})… ${msg}`);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  await runPollLoop(client, config);
}

main().catch((err) => {
  console.error("[print-agent] fatal:", err);
  process.exit(1);
});
