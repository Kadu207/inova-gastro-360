# Implementation Plan: 013-vps-runtime

**Date**: 2026-06-20 | **Spec**: [spec.md](./spec.md) | **Decisão**: VPS first, CF Workers no go-live

## Summary

Executar os 5 componentes lógicos do Inova Gastro 360 na **VPS Hetzner** (`128.140.77.31`), reutilizando código atual dos `apps/workers/*` com adaptador HTTP Node, Docker Compose e Nginx. Cloudflare permanece só como CDN/proxy DNS até produto pronto para vender.

## Technical Context

**VPS:** Hetzner — Postgres `:5440` (SSL), Redis `:6390`  
**Dev local:** `npm run dev:stack` (Wrangler dev — inalterado)  
**Produção VPS (alvo):** processos Node ou containers; **não** `wrangler deploy`  
**Cloudflare hoje:** DNS + proxy em `inovagastro360.*` (pode apontar para IP VPS)  
**Cloudflare futuro:** Workers + Hyperdrive (spec 010 fase 2)

## Arquitetura VPS (alvo)

```text
Internet → Cloudflare (DNS/proxy SSL, Free)
         → Nginx/Traefik na VPS :443
              ├─ /              → Next.js (apps/web) :3102
              ├─ /api/v1/*      → api-gateway       :8792
              ├─ /ws            → realtime-hub      :8790
              └─ (interno)      → messaging-bus     :8789
                                  integrations      :8791
              ↓
         Postgres :5440   Redis :6390
              ↓
         print-agent (LAN filial) — poll API / print_jobs
         n8n :5680, Chatwoot (opcional)
```

## Mapeamento Worker → VPS

| Componente | Código atual | Runtime VPS |
|------------|--------------|-------------|
| api-gateway | `apps/workers/api-gateway` | Node HTTP + `DATABASE_URL` |
| messaging-bus | `apps/workers/messaging-bus` | Node HTTP interno; ou módulo in-process (MVP) |
| realtime-hub | `apps/workers/realtime-hub` | Node + `ws` + Redis pub/sub |
| integrations | `apps/workers/integrations` | Node HTTP interno |
| web | `apps/web` | `next start` ou export estático + Nginx |

## Substituições vs Cloudflare

| CF | VPS |
|----|-----|
| Hyperdrive | `DATABASE_URL` direto (rede Docker / localhost) |
| Service Bindings | HTTP interno `http://messaging:8789` |
| Durable Objects | Redis pub/sub ou Map in-memory (single instance) |
| Queues | Redis list / BullMQ (spec 011 fase VPS) |
| Worker assets (web) | Next.js ou `/out` servido pelo Nginx |

## Constitution Check

| Princípio | Status |
|-----------|--------|
| Multitenant + RLS | Postgres inalterado |
| Event-first | outbox + messaging (HTTP ou Redis) |
| Simplicity | MVP: forward síncrono msg→rt+int (igual Free CF) |
| Segurança | JWT, UFW, sem segredos no Git |

## Estrutura de entrega (fases)

### Fase A — Documentação e decisão ✅ (esta spec)
- Spec 013 + memory-bank atualizado
- Spec 010 marcada como edge futuro

### Fase B — Infra VPS
- `infra/hetzner/docker-compose.app.yml` (api, msg, rt, int, web, redis)
- `infra/hetzner/nginx/` ou Traefik config
- `.env.example` produção VPS

### Fase C — Node adapter
- `apps/workers/*/src/node-server.ts` ou pacote `@inova-gastro-360/runtime-node`
- Substitui `wrangler dev` em produção; Wrangler permanece opcional em dev

### Fase D — Cutover DNS
- Apontar `inovagastro360*` para IP VPS (ou Tunnel)
- Desativar Workers CF (manter código para go-live)

### Fase E — Go-live comercial → Cloudflare
- Reativar spec 010: Hyperdrive, wrangler deploy, Queues se necessário

## Referências

- `infra/hetzner/docker-compose.prod.yml` — Postgres prod
- `infra/hetzner/PRODUCTION.md`
- `PORT_REGISTRY.md`
- `specs/010-cloudflare-workers/` — edge futuro
- `specs/006-impressao-local/` — print-agent após API na VPS
