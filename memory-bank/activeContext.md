# Contexto ativo — Inova Gastro 360

**Última atualização:** 2026-07-03

## Spec 015 — Security hardening (VPS validada ✅, aguardando merge `master`)

Branch `feat/015-security-hardening` @ `cdadca9` — **deploy VPS concluído 2026-07-03**:
- Migration `20260702160000_security_rls_billing` aplicada
- Senha admin rotacionada (`InovaGastro360!@2026`; antiga `InovaGastro360!` rejeitada)
- Smokes: pedidos (#1003/#1004), upload foto, login JWT+refresh OK
- Fix scripts DB: `lib/db-url-vps.sh` (DATABASE_URL do `.env.production`)

**Pendente pós-merge:** PR → `master`; opcional T053 `setup-app-db-role-vps.sh`;
fix outbox `duplex option is required` no runtime Node (eventos ficam na outbox até flush).

Auditoria de 2026-07-02 (27 achados, 5 críticos) → correções implementadas nesta branch:

- **P0**: JWT_SECRET obrigatório (fail-fast, sem fallback); CORS allowlist via `CORS_ALLOWED_ORIGINS`;
  rate limit em `/auth/login` (10/15min por ip+email); `OUTBOX_FLUSH_SECRET` sempre exigido;
  senha demo removida do repo (seed usa `SEED_ADMIN_PASSWORD`; smoke exige `SMOKE_PASSWORD`).
- **P1**: `POST /auth/refresh` (rotação de sessão) + `/auth/logout`; web com refresh transparente
  (`apiFetch`); RLS aplicado por migration `20260702160000_security_rls_billing` + helper `withTenant`;
  auth interna entre workers (`INTERNAL_SHARED_SECRET`); WebSocket exige JWT + membership da branch.
- **P2**: RBAC (`requireRole`); onboarding `POST /api/v1/admin/tenants` (super_admin, transacional);
  billing foundation (`subscription_plans` + `subscriptions`, planos starter/pro/enterprise, trial 14d);
  `parseJsonBody` unificado em `lib.ts`.
- **P2 extra**: magic bytes em upload; rate limit guest orders; `withTenant` na criação de pedidos
- **Agentes EMB**: EMB-01 pedidos presos, EMB-02 sessões, EMB-03 trial expirando (+ EMB-04 outbox replay)

### VPS spec 015 — executado ✅

1. `configure-security-env-vps.sh` — segredos OK
2. `migrate-deploy-vps.sh` — RLS + billing
3. `rotate-admin-password-vps.sh` — admin demo
4. `deploy-spec015-vps.sh` — smokes verdes

## Estratégia infoproduto (decidida 2026-07-02)

Sequência D → A → B: build in public agora → curso/mentoria "SaaS multitenant com agentes de IA"
com audiência (~300 e-mails) → boilerplate premium após P0/P1. Docs em `docs/infoproduto/`
(estrategia.md, calendario-conteudo.md, ementa-curso.md). Canvas: `analise-inova-gastro-360`.

## Produção VPS (branch feat/015 até merge)

- Spec 015 hardening no ar na VPS (feat branch)
- Spec 014 catálogo + fotos OK; spec 003 pedidos no ar
- Demo: `https://inovagastro360.inovatitech.com.br` — `admin@inovagastro360.local`
  + `tenantSlug: demo-burger` — senha em `SEED_ADMIN_PASSWORD` (não versionar)
- T027 R2 (prep): `infra/hetzner/docs/R2-STORAGE.md`, `configure-r2-env-vps.sh`
