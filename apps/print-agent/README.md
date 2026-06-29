# Print Agent

Poll de `print_jobs` na API, impressão ESC/POS (cozinha/balcão) e marcação `printed`.

## Dev (sem impressora)

```bash
docker compose up -d
cp apps/workers/api-gateway/.dev.vars.example apps/workers/api-gateway/.dev.vars
npm run dev:api          # terminal 1 — porta 8792
export PRINT_AGENT_PASSWORD='InovaGastro360!'
npm run print-agent:dev  # terminal 2 — modo log (PRINTER_TYPE=none)
```

Variáveis: `apps/print-agent/.env.example`

## Impressora ESC/POS (rede TCP :9100)

```bash
export PRINTER_TYPE=network
export PRINTER_HOST=192.168.0.50
export PRINTER_PORT=9100
npm run print-agent:dev
```

## Impressora USB/device (Linux)

```bash
export PRINTER_TYPE=file
export PRINTER_DEVICE=/dev/usb/lp0
npm run print-agent:dev
```

Comportamento:
- **Sem impressora** (`PRINTER_TYPE=none`): log do payload JSON + `PATCH printed`
- **Com impressora**: envia ticket ESC/POS; em falha o job permanece `pending` para retry
- **`PRINT_AGENT_DRY_RUN=1`**: não imprime nem marca printed

Setores: `cozinha`, `balcao` (via `PRINT_AGENT_SECTOR`)

## VPS (spec 013)

Altere `PRINT_AGENT_API_BASE` para URL interna da API na Hetzner.
