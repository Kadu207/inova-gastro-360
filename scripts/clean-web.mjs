import { rmSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const nextDir = resolve(root, "apps/web/.next");

if (existsSync(nextDir)) {
  rmSync(nextDir, { recursive: true, force: true });
  console.log("Removed apps/web/.next");
}

if (process.platform === "win32") {
  try {
    const out = execSync('netstat -ano | findstr ":3102" | findstr LISTENING', { encoding: "utf8" });
    const pid = out.trim().split(/\s+/).pop();
    if (pid && pid !== "0") {
      execSync(`taskkill /F /PID ${pid}`, { stdio: "ignore" });
      console.log(`Freed port 3102 (PID ${pid})`);
    }
  } catch {
    /* port free */
  }
}
