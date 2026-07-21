# Print Agent

Poll de `print_jobs` na API, impressão ESC/POS (cozinha/balcão) e marcação `printed`.

## Dev (sem impressora)

```bash
docker compose up -d
cp apps/workers/api-gateway/.dev.vars.example apps/workers/api-gateway/.dev.vars
npm run dev:api          # terminal 1 — porta 8792
export PRINT_AGENT_PASSWORD='<senha do admin — mesma do seed (SEED_ADMIN_PASSWORD)>'
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

## VPS / LAN filial (API pública)

```bash
cp apps/print-agent/.env.example apps/print-agent/.env
# PRINT_AGENT_API_BASE=https://inovagastro360.inovatitech.com.br
# PRINT_AGENT_PASSWORD=<senha admin VPS — ver apps/print-agent/.env no servidor>
```

Checklist LAN com impressora:

1. Copiar `.env` da VPS (`~/inova-gastro-360/apps/print-agent/.env`) ou preencher example
2. Remover `PRINT_AGENT_DRY_RUN=1`
3. `PRINTER_TYPE=network` + `PRINTER_HOST` / `PRINTER_PORT`
4. `npm run print-agent:start` (ou serviço Windows/Linux)
5. Criar pedido de teste → job `pending` → impressão → status `printed`

Dry-run na VPS (Docker):

```bash
docker run --rm --network host -v "$PWD:/app" -w /app --env-file apps/print-agent/.env \
  node:20-alpine npm run start -w @inova-gastro-360/print-agent
```
