# Progresso — Inova Gastro 360

## Onda 0 — Fundação ✅
## Onda 1 — Auth multitenant ✅
## Onda 2 — Cardápio, pedidos, painéis, outbox ✅
- E2E validado com Docker (2026-06-15)

## Onda 3 — Realtime, messaging, impressão, integrações ✅ (core)
- [x] Realtime hub WebSocket + broadcast (spec 004)
- [x] Messaging-bus → realtime + integrations (spec 011)
- [x] Print jobs na criação de pedido (spec 006)
- [x] Integrations worker `/internal/notify` (spec 008)
- [x] Banner cookies LGPD (spec 009 — básico)
- [x] `dev:stack` com 5 workers
- [x] API porta 8792 (conflito 8788 documentado)
- [x] Deploy Cloudflare + Hyperdrive + Web (2026-06-17)

## Infra engenharia — Cursor / Spec Kit / TDD (2026-06-17)
- [x] Spec 012 cursor-tooling-sdd-tdd (plan + tasks)
- [x] Spec 010 workers retrospectivo (produção)
- [x] Rules specify-rules + cloudflare-workers
- [x] docs/cursor-tooling.md + mcp.json.example
- [x] vitest.config.ts + testes auth/api-gateway

## Onda 4 — Financeiro completo
Adiado conforme decisão do usuário (spec 005)
