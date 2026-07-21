# Tasks: 015-security-hardening

## Fase P0 — Segredos e superfícies expostas

- [x] T001 `getJwtSecret(env)` fail-fast em `middleware/auth.ts` + `routes/auth.ts` (sem fallback) + testes
- [x] T002 `isOutboxFlushAuthorized` exige secret sempre + testes
- [x] T003 CORS allowlist via `CORS_ALLOWED_ORIGINS` + testes
- [x] T004 Rate limit login (janela 15min, 10 tentativas por ip+email) + testes
- [x] T005 Seed: `SEED_ADMIN_PASSWORD` env (fallback aleatório impresso); scripts smoke exigem `SMOKE_PASSWORD`; docs com placeholder
- [x] T006 print-agent: remover senha default do config (obrigatória fora de dry-run)

## Fase P1 — Auth completa, RLS, comunicação interna

- [x] T010 `POST /api/v1/auth/refresh` com rotação de sessão + testes (verifyRefreshToken)
- [x] T011 `POST /api/v1/auth/logout` revoga sessão
- [x] T012 Web: armazenar refreshToken, `apiFetch` com refresh transparente em 401
- [x] T013 Migration RLS (`20260702160000_security_rls_billing`) + helper `withTenant` (UUID validado, set_config parametrizado)
- [x] T014 Auth interna: `INTERNAL_SHARED_SECRET` em messaging-bus, integrations, realtime `/broadcast`; api-gateway envia header
- [x] T015 WebSocket auth: token JWT + branch membership no upgrade; web envia token em `realtimeWsUrl`
- [x] T016 Login exige `tenantSlug` quando e-mail existe em mais de um tenant (`tenant_required`)

## Fase P2 — RBAC, onboarding, billing

- [x] T020 `requireRole` middleware + papéis de gestão no catálogo (`CATALOG_MANAGEMENT_ROLES`)
- [x] T021 Migration billing: `subscription_plans` + `subscriptions` (+ RLS) + planos starter/pro/enterprise
- [x] T022 `POST /api/v1/admin/tenants` (super_admin) transacional com assinatura trial + testes
- [x] T023 Refactor: `parseJsonBody` único em `lib.ts` (5 duplicações removidas)
- [x] T024 Script `rotate-admin-password-vps.sh` + doc de envs novas em `infra/hetzner/README.md` + `.env.production.example`
- [x] T025 Web: `getActiveBranchId()` (branch do usuário logado) substitui hardcode `DEMO_BRANCH_ID` nas páginas
- [x] T026 Upload: validação magic bytes (jpeg/png/webp) além do MIME declarado
- [x] T027 Pedidos guest: rate limit 20/15min por ip+branch
- [x] T028 Criação de pedido usa `withTenant` (RLS em transação)

## Fase EMB — Agentes runtime

- [x] T030 EMB-01 Order State Guardian
- [x] T031 EMB-02 Session Sweeper
- [x] T032 EMB-03 Trial Expiry Notifier
- [x] T033 Documentar agentes EMB em `docs/architecture.md` + `AGENTS.md`

## Infoproduto

- [x] T040 `docs/infoproduto/estrategia.md`, `calendario-conteudo.md`, `ementa-curso.md`, `primeiro-post-build-in-public.md`

## Operacional pós-merge (VPS)

- [x] T050 `bash infra/hetzner/scripts/configure-security-env-vps.sh` (2026-07-21)
- [x] T051 `migrate-deploy-vps.sh` — sem pending (2026-07-21)
- [x] T052 Rotacionar senha admin demo (`rotate-admin-password-vps.sh`)
- [x] T053 `setup-app-db-role-vps.sh` — role `inova_gastro_app` (2026-07-21)
