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

## Spec 002 cardápio online — Fase 2 ✅ (produção)
- [x] T009 imagens + lazy load
- [ ] T010 combos (backlog)

## Spec 003 pedidos — Fase 3 ✅ (código)
- [x] Filtros canal + busca API/UI
- [x] Painéis refinados (balcão/cozinha/delivery)
- [ ] Deploy VPS pós-merge

## Spec 014 catalog-admin — T001–T017 ✅ (código local)
- [x] CRUD categorias + produtos (API + UI `/dashboard/catalogo`)
- [x] Storage factory MinIO/R2 + presign + multipart fallback
- [x] ImageUploader + preview thumb
- [ ] T018–T020 nav/hardening
- [ ] T021–T022 MinIO bucket VPS + deploy S3_*
