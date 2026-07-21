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
- [x] P0–P2 + EMB + ops T050–T053 (VPS revalidado 2026-07-21)

## Spec 016 CodeRabbit + security layers (PR #23)
- [x] `.coderabbit.yaml` + `docs/coderabbit.md` + nota AGENTS.md
- [x] Headers Nginx (CSP, XFO, nosniff, Referrer-Policy, Permissions-Policy)
- [x] Rate-limit Redis com fallback memória + testes
- [x] CI secrets-guard + npm audit high
- [x] Cron `tunnel-connect-inova.sh` */5 (user crontab gestaoti)
- [ ] Merge PR #23 → master
- [ ] Instalar GitHub App CodeRabbit no repo
- [ ] Print-agent LAN com impressora física

## Spec 007 pagamentos — implementado (branch feat/007-pagamentos)
- [x] `/speckit-specify` — `specs/007-pagamentos/spec.md` + checklist
- [x] `/speckit-plan` — Mercado Pago (PIX P1) + Stripe Billing (SaaS P1)
- [x] `/speckit-tasks` — 61 tasks TDD
- [x] `/speckit-implement` — T001–T061 (PIX + Stripe + cartão + polish)
- [x] Testes: 108 api-gateway, integrations webhooks, payment-expiry
- [ ] Deploy VPS: configure-payments-env + webhooks + smoke-payments-vps

## Infoproduto (estratégia D→A→B)
- [x] docs/infoproduto: estrategia.md, calendario-conteudo.md (12 semanas), ementa-curso.md
- [x] Post #1 aprovado (LinkedIn + thread X): `docs/infoproduto/rascunhos/post-01-auditoria-spec015.md`
- [x] Lead magnet PDF: `docs/infoproduto/checklists/checklist-p0-p1-auditoria-saas.pdf`
