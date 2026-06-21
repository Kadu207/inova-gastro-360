# Progresso — Inova Gastro 360

## Onda 0 — Fundação ✅
## Onda 1 — Auth multitenant ✅
## Onda 2 — Cardápio, pedidos, painéis, outbox ✅
## Onda 3 — Realtime, messaging, impressão, integrações ✅ (core)

## Runtime VPS (2026-06-20) — spec 013
- [x] Decisão: VPS first, Cloudflare Workers no go-live comercial
- [x] Spec 013-vps-runtime (spec + plan + tasks)
- [x] Spec 010 reclassificada (edge futuro)
- [ ] Docker compose app + Nginx na VPS
- [ ] Node adapter (substituir wrangler em prod)
- [ ] Cutover DNS → VPS

## Spec 003 — pedidos ✅ (fase 2)
- [x] TDD rotas + cross-tenant (PR #9)
- [x] Idempotência checkout + paginação painéis (PR #10)

## Infra engenharia — Cursor / Spec Kit / TDD ✅
- [x] Spec 012, rules, vitest, plan/tasks 002–011

## Próximo — spec 006 print-agent
- [ ] Scaffold `apps/print-agent`
- [ ] Poll `print_jobs` via api-gateway (dev :8792 → VPS depois)
- [ ] Driver impressão cozinha/balcão

## Onda 4 — Financeiro
Adiado (spec 005)

## Cloudflare edge (futuro)
Adiado até go-live comercial (spec 010 fase 2)
