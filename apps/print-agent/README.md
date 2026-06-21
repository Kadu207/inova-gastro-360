# Print Agent

Poll de `print_jobs` na API e marcação `printed` (ESC/POS em T012).

## Dev

```bash
docker compose up -d
npm run db:seed
npm run dev:api          # ou dev:stack
npm run print-agent:dev  # outro terminal
```

Variáveis: `apps/print-agent/.env.example`

## VPS (spec 013)

Altere `PRINT_AGENT_API_BASE` para URL interna da API na Hetzner.
