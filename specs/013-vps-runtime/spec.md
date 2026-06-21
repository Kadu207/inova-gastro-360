# Feature Specification: 013-vps-runtime

**Status**: Approved — runtime principal até go-live comercial  
**Product**: Inova Gastro 360  
**Decisão:** 2026-06-20 — usuário confirmou VPS Hetzner por custo; Cloudflare Workers apenas quando produto 100% pronto para vender

## Contexto

O monorepo foi implementado inicialmente com **Cloudflare Workers** (spec 010) para edge. Em desenvolvimento e até o **go-live comercial**, o runtime de produção será **self-host na VPS Hetzner**, com Cloudflare limitado a **DNS + proxy SSL + WAF** (plano Free).

Workers Cloudflare, Hyperdrive, Queues e Durable Objects ficam **adiados** para a fase de escala comercial (spec 010 fase 2).

## User Story 1 — Serviços na VPS (P1)

Como operador, quero os mesmos 5 componentes lógicos (api, messaging, realtime, integrations, web) rodando na VPS via Docker/processos Node, para operar sem custo de Workers Paid.

**Critérios de aceite:**
- Postgres + Redis na VPS (já existentes ou docker-compose)
- API conecta via `DATABASE_URL` direto (sem Hyperdrive em runtime VPS)
- Health endpoints acessíveis internamente ou via reverse proxy
- `npm run dev:stack` continua válido para desenvolvimento local

## User Story 2 — Reverse proxy e TLS (P1)

Como cliente, quero acessar `inovagastro360.*` via HTTPS com roteamento estável, sem depender de Workers.

**Critérios de aceite:**
- Nginx ou Traefik na VPS termina TLS (cert Let's Encrypt ou Cloudflare Full)
- Rotas: `/` → web, `/api/*` → api-gateway, `/ws` → realtime-hub
- messaging-bus e integrations **não** expostos publicamente (rede interna Docker)

## User Story 3 — Realtime sem Durable Objects (P1)

Como painel operacional, quero atualização em tempo real (<2s) com WebSocket na VPS.

**Critérios de aceite:**
- WebSocket por `branchId` (mesmo contrato `/ws?branchId=`)
- Broadcast via Redis pub/sub ou processo único (fase 1)
- Sem dependência de Durable Objects em produção VPS

## User Story 4 — Migração futura Cloudflare (P2 — go-live)

Como arquiteto, quero documentar o caminho de volta para Workers quando o produto estiver maduro para venda em escala.

**Critérios de aceite:**
- Spec 010 permanece referência de edge
- Desacoplamento api → messaging → rt/int preservado (facilita cutover)
- Checklist de migração em `plan.md` (Hyperdrive, wrangler deploy, DNS)

## Fora de escopo (013)

- Implementação completa do adapter Node (fase de código — ver `tasks.md`)
- Financeiro Onda 4 (spec 005)
- Cloudflare Queues / Workers Paid

## Relacionadas

| Spec | Relação |
|------|---------|
| 010-cloudflare-workers | Edge **futuro** (go-live comercial) |
| 006-impressao-local | print-agent na LAN/VPS consome API local |
| 011-messaging-bus | Fila Redis/Bull ou forward HTTP na VPS |
