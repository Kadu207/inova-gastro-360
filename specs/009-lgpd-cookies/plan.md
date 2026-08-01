# Implementation Plan: 009-lgpd-cookies

**Date**: 2026-06-20 (Onda 3) · **Atualizado**: 2026-07-31 (Onda 4 concluída) | **Spec**: [spec.md](./spec.md)

## Summary

Consentimento de cookies com banner na web. Onda 3 entregou a versão básica (localStorage). Onda 4 entregou preferências granulares, registro de consentimento no backend com RLS multitenant, páginas públicas de privacidade/termos, exportação de dados do titular e workflow de direito ao esquecimento.

## Technical Context

**UI banner/modal**: `apps/web/src/components/CookieBanner.tsx`
**Utilitários front-end**: `apps/web/src/lib/lgpd.ts` (subjectId persistente em `localStorage`, serialização de preferências, chamadas de API)
**Layout**: incluído em `apps/web/src/app/layout.tsx`
**Backend**: `apps/workers/api-gateway/src/routes/lgpd.ts`
**Banco**: tabelas `consent_records` e `erasure_requests` (`packages/database/prisma/schema.prisma`, migração `packages/database/prisma/migrations/20260731160000_lgpd_009`)
**Validação**: `packages/validation/src/lgpd.ts` (Zod: `ConsentInputSchema`, `ErasureRequestInputSchema`, `ErasureStatusUpdateSchema`)
**Auditoria**: `apps/workers/api-gateway/src/lib/audit-log.ts` (`writeLgpdAuditLog`)
**Admin UI**: `apps/web/src/app/(os)/dashboard/lgpd/page.tsx`
**Páginas públicas**: `apps/web/src/app/privacidade/page.tsx`, `apps/web/src/app/termos/page.tsx`

## Níveis de consentimento

| Categoria | Onda 3 | Onda 4 |
|-----------|--------|--------|
| Essenciais | banner accept | sempre on |
| Analytics | — | opt-in, persistido em `consent_records` |
| Marketing | — | opt-in, persistido em `consent_records` |

## Endpoints (Onda 4)

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| POST | `/api/v1/lgpd/consent` | pública (resolve tenant via branch/subdomínio) | Grava preferências de cookies |
| GET | `/api/v1/lgpd/export` | JWT | Exporta dados do titular autenticado (JSON) |
| POST | `/api/v1/lgpd/erasure` | JWT (admin do tenant) | Cria solicitação de esquecimento |
| GET | `/api/v1/lgpd/erasure` | JWT (admin do tenant) | Lista solicitações do tenant |
| PATCH | `/api/v1/lgpd/erasure/:id` | JWT (admin do tenant) | Atualiza status + audit log |

## Constitution Check

| Princípio | Status |
|-----------|--------|
| Segurança/LGPD | Registro auditável via `audit_logs` + `writeLgpdAuditLog`; RLS ativa em `consent_records`/`erasure_requests` |
| Multitenant | `tenant_id` obrigatório em ambas as tabelas; `resolvePublicTenantId` não faz fallback para tenant demo quando `branch_id` inválido é informado (evita vazamento cross-tenant) |
| TDD | `lgpd.test.ts` (API) e `lgpd.test.ts` (web) cobrindo consentimento, export, RBAC e isolamento cross-tenant |

## Referências

- `apps/web/src/components/CookieBanner.tsx`
- `apps/web/src/lib/lgpd.ts`
- `apps/web/src/lib/nav.ts` — "Privacidade / LGPD"
- `apps/workers/api-gateway/src/routes/lgpd.ts`
- `apps/workers/api-gateway/src/routes/lgpd.test.ts`
