# Contexto ativo — Inova Gastro 360

**Última atualização:** 2026-07-02

## Spec 015 — Security hardening (em curso, branch `feat/015-security-hardening`)

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

### Pós-merge (operacional na VPS — obrigatório)

1. Definir em `.env.production`: `JWT_SECRET`, `OUTBOX_FLUSH_SECRET`, `INTERNAL_SHARED_SECRET`,
   `CORS_ALLOWED_ORIGINS`, `SEED_ADMIN_PASSWORD` (novos) — API não sobe autenticação sem JWT_SECRET.
2. `npx prisma migrate deploy` (RLS + billing).
3. **Rotacionar a senha do admin demo** (a antiga está no histórico do git):
   `bash infra/hetzner/scripts/rotate-admin-password-vps.sh`.
4. Recriar containers; smoke com `SMOKE_PASSWORD` exportado.

## Estratégia infoproduto (decidida 2026-07-02)

Sequência D → A → B: build in public agora → curso/mentoria "SaaS multitenant com agentes de IA"
com audiência (~300 e-mails) → boilerplate premium após P0/P1. Docs em `docs/infoproduto/`
(estrategia.md, calendario-conteudo.md, ementa-curso.md). Canvas: `analise-inova-gastro-360`.

## Produção VPS (master)

- Spec 014 catálogo + fotos OK; spec 003 pedidos no ar; smoke `smoke-orders-vps.sh`
- Demo: `https://inovagastro360.inovatitech.com.br` — `admin@inovagastro360.local`
  (senha: via `SEED_ADMIN_PASSWORD`; não versionar)
- T027 R2 (prep): `infra/hetzner/docs/R2-STORAGE.md`, `configure-r2-env-vps.sh`
