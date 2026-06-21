# Print Agent

Poll de `print_jobs` na API e marcação `printed` (ESC/POS em T012).

## Dev

```bash
docker compose up -d
cp apps/workers/api-gateway/.dev.vars.example apps/workers/api-gateway/.dev.vars
npm run dev:api          # terminal 1 — porta 8792
npm run print-agent:dev  # terminal 2
```

Variáveis: `apps/print-agent/.env.example`

## VPS (spec 013)

Altere `PRINT_AGENT_API_BASE` para URL interna da API na Hetzner.
