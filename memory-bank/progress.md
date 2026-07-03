# Progresso — Inova Gastro 360

## Onda 0–3 ✅

## Runtime VPS (spec 013) — Fases B–E ✅ (código)
- [x] docker-compose.app.yml + deploy-vps.sh + .env.production.example
- [x] `@inova-gastro-360/runtime-node` + `npm run start:stack`
- [x] Realtime Redis pub/sub (sem DO em Node)
- [x] `/health/stack` + `npm run smoke:health`
- [x] Nginx Docker `:9088` + Tunnel Cloudflare (VPS compartilhada, spec 013)
- [x] Login API via proxy confirmado na VPS
- [x] Validar acesso HTTPS público no browser (smoke final pós PR #13)

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

## Spec 003 pedidos — Fase 3 ✅ (produção)
- [x] Filtros canal + busca API/UI
- [x] Painéis refinados (balcão/cozinha/delivery)
- [x] Deploy VPS: smoke-orders-vps.sh (T016)

## Spec 014 catalog-admin — T001–T024 ✅ (produção)
- [x] CRUD categorias + produtos + upload (código)
- [x] Hardening GET público + scripts deploy VPS
- [x] Upload foto + exibição vitrine (GET /media/ via api-gateway)
- [x] smoke-catalog-upload.sh HTTP 200
- [x] T023 audit_logs em writes catálogo
- [x] T024 memory-bank + tasks entregues
- [x] T027 prep R2 (docs + configure-r2-env-vps.sh; cutover CF pendente)

## Spec 015 security-hardening — implementado (branch feat/015-security-hardening)
- [x] P0: JWT fail-fast, CORS allowlist, rate limit login, OUTBOX_FLUSH_SECRET obrigatório
- [x] P0: senha demo fora do repo (SEED_ADMIN_PASSWORD / SMOKE_PASSWORD / rotate script)
- [x] P1: /auth/refresh com rotação + /auth/logout + refresh transparente no web
- [x] P1: RLS via migration 20260702160000 + withTenant; role inova_gastro_app NOLOGIN
- [x] P1: INTERNAL_SHARED_SECRET entre workers; WebSocket com JWT + branch membership
- [x] P2: RBAC (requireRole + roles de gestão no catálogo); onboarding POST /api/v1/admin/tenants
- [x] P2: billing foundation (subscription_plans/subscriptions + trial 14d no provisioning)
- [x] Web: branch ativa do usuário logado (getActiveBranchId) no lugar do hardcode demo
- [x] EMB-01 Order State Guardian + EMB-02 Session Sweeper + EMB-03 Trial Expiry Notifier
- [x] P2 extra: magic bytes upload, rate limit pedidos guest, withTenant na criação de pedidos
- [x] Testes auth (refresh/logout/rate limit) + configure-security-env-vps.sh + setup-app-db-role-vps.sh
- [x] docs/infoproduto/primeiro-post-build-in-public.md
- [x] Operacional VPS: T050–T052 (configure-security-env, migrate, rotate senha) — 2026-07-03
- [x] PR merge `feat/015-security-hardening` → `master` (PR #17, CI pipeline pass)
- [x] Fix outbox dispatch Node (`duplex` em Service Binding fetch)
- [x] T053 VPS: role `inova_gastro_app` (DATABASE_URL na VPS)

## Infoproduto (estratégia D→A→B)
- [x] docs/infoproduto: estrategia.md, calendario-conteudo.md (12 semanas), ementa-curso.md
