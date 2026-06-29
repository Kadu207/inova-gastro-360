# Progresso — Inova Gastro 360

## Onda 0–3 ✅

## Runtime VPS (spec 013) — Fases B–E ✅ (código)
- [x] docker-compose.app.yml + deploy-vps.sh + .env.production.example
- [x] `@inova-gastro-360/runtime-node` + `npm run start:stack`
- [x] Realtime Redis pub/sub (sem DO em Node)
- [x] `/health/stack` + `npm run smoke:health`
- [x] Nginx Docker `:9088` + Tunnel Cloudflare (VPS compartilhada, spec 013)
- [x] Login API via proxy confirmado na VPS
- [ ] Validar acesso HTTPS público no browser (smoke final)

## Spec 006 print-agent ✅

## Resiliência outbox ✅
- [x] EMB-15 replay + cron + `outbox:flush`

## Fase F — Cloudflare go-live comercial
- [ ] Workers Paid + Queues (T050–T051)

## Onda 4 — Financeiro
Adiado (spec 005)

## Spec 002 cardápio online — Fase 2 ✅ (código local)
- [x] Cardápio público + guest checkout (nome/telefone)
- [x] Categorias, busca, canal delivery/retirada
- [x] `cardapio.ts` + testes vitest
- [x] API guest checkout via branchId
- [ ] Deploy VPS + smoke `/cardapio` anônimo
- [ ] T009 imagens | T010 combos (backlog)
