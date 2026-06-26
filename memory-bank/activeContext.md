# Contexto ativo — Inova Gastro 360

**Última atualização:** 2026-06-26

## Runtime VPS (spec 013) — implementado em código

- **Node produção:** `npm run start:stack` (libera portas + int → rt → msg → api → web)
- **Dev Wrangler:** `npm run dev:stack` (parar antes de `start:stack` — ou usar `free-stack-ports.mjs`)
- **Realtime VPS:** Redis pub/sub via `@inova-gastro-360/runtime-node` (`node-server.ts` sem top-level await)
- **Health agregado:** `GET /health/stack` + `npm run smoke:health` (web checa `/login`)
- **VPS deploy:** clonar repo primeiro — ver `infra/hetzner/README.md`
- **Cutover:** `infra/hetzner/CUTOVER.md` (DNS manual pendente)

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

- Cutover DNS real na VPS (`CUTOVER.md`)
- Workers Paid + Queues quando go-live comercial (T050–T051)
