import { copyFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const targetDir = process.argv[2]
  ? resolve(process.cwd(), process.argv[2])
  : resolve(root, "apps/workers/api-gateway");

const dest = join(targetDir, ".dev.vars");
const example = join(targetDir, ".dev.vars.example");

if (!existsSync(example)) {
  console.error(`[ensure-dev-vars] Arquivo não encontrado: ${example}`);
  process.exit(1);
}

if (existsSync(dest)) {
  process.exit(0);
}

copyFileSync(example, dest);
console.log(`[ensure-dev-vars] Criado ${dest} a partir de .dev.vars.example`);
