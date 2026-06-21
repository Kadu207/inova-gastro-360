import { loadConfig } from "./config";
import { PrintAgentApiClient } from "./api-client";
import { runPollLoop } from "./poller";

async function main(): Promise<void> {
  const config = loadConfig();
  const client = new PrintAgentApiClient(config);
  await runPollLoop(client, config);
}

main().catch((err) => {
  console.error("[print-agent] fatal:", err);
  process.exit(1);
});
