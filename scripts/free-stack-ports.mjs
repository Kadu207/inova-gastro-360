/**
 * Libera portas do stack antes de start:stack (evita conflito com dev:stack / Wrangler).
 */
import { execSync } from "node:child_process";

const PORTS = [3102, 8789, 8790, 8791, 8792];

if (process.platform === "win32") {
  for (const port of PORTS) {
    try {
      const out = execSync(`netstat -ano | findstr ":${port}" | findstr LISTENING`, {
        encoding: "utf8",
      });
      const lines = out.trim().split(/\r?\n/).filter(Boolean);
      const pids = new Set(
        lines
          .map((line) => line.trim().split(/\s+/).pop())
          .filter((pid) => pid && pid !== "0"),
      );
      for (const pid of pids) {
        execSync(`taskkill /F /PID ${pid}`, { stdio: "ignore" });
        console.log(`[free-stack-ports] porta ${port} liberada (PID ${pid})`);
      }
    } catch {
      /* porta livre */
    }
  }
} else {
  for (const port of PORTS) {
    try {
      execSync(`fuser -k ${port}/tcp`, { stdio: "ignore" });
      console.log(`[free-stack-ports] porta ${port} liberada`);
    } catch {
      /* porta livre ou fuser indisponível */
    }
  }
}
