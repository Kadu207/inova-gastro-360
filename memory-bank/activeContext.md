# Contexto ativo — Inova Gastro 360

**Última atualização:** 2026-06-27

## Runtime VPS (spec 013) — deploy Hetzner operacional

- **Stack Docker:** postgres + redis + workers + web — health OK (`/health/stack`)
- **Proxy público:** `nginx-proxy` container `:9088` → web/api/ws (Tunnel Cloudflare)
- **Nginx host:** não usado (`:80` ocupada por outro container na VPS compartilhada)
- **URLs produção:** `NEXT_PUBLIC_*` → `https://inovagastro360.inovatitech.com.br`
- **Login via proxy:** `POST /api/v1/auth/login` retorna `accessToken` na `:9088`

## Comandos

```bash
docker compose up -d
npm run db:seed
npm run dev:stack          # desenvolvimento (Wrangler)
npm run start:stack        # produção Node (VPS)
npm run smoke:health
npm run outbox:flush
npm run print-agent:dev
```

**Demo:** `admin@inovagastro360.local` / `InovaGastro360!`

## Próximo (operação / Fase F)

- Validar login no browser via Tunnel (`https://inovagastro360.inovatitech.com.br/login`)
- Commit/push `nginx-proxy` + `inovagastro360.docker.conf` no PC (se ainda não no remoto)
- Workers Paid + Queues quando go-live comercial (T050–T051)
