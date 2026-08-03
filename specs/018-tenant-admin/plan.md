# Implementation Plan: 018-tenant-admin

**Branch**: `feat/018-tenant-admin` | **Date**: 2026-08-03 | **Spec**: [spec.md](./spec.md)

## Summary

Completar ciclo de vida operacional do tenant: settings (company/branches/users), seletor de filial, admin UI/API (list/suspend), campos comerciais no create. Reusa Prisma/RLS existentes; adiciona `companies.phone`.

## Technical Context

**Language/Version**: TypeScript 5 / Node 20 / Next.js 15  
**Primary Dependencies**: Hono-less fetch handlers api-gateway, Zod, postgres.js, Next static export  
**Storage**: PostgreSQL + RLS `app.current_tenant_id`  
**Testing**: Vitest  
**Target Platform**: VPS Docker + web `out/`  
**Project Type**: monorepo SaaS  
**Constraints**: multitenant obrigatório; sem secrets no Git  
**Scale/Scope**: 1 UI config + 1 UI admin + ~8 endpoints

## Constitution Check

- SDD: spec/plan/tasks neste diretório — PASS  
- TDD: testes RBAC/Zod antes ou junto dos handlers — PASS  
- Multitenant: settings sempre filtrados por `user.tid` — PASS  
- Event-first: mudanças de status tenant sem outbox nesta onda (ops sync) — OK (sem evento obrigatório)

## Project Structure

### Documentation

```text
specs/018-tenant-admin/
├── spec.md
├── plan.md
├── data-model.md
├── tasks.md
└── contracts/settings-api.md
```

### Source Code

```text
packages/validation/src/index.ts          # schemas CreateTenant + Settings*
packages/database/prisma/schema.prisma    # Company.phone
packages/database/prisma/migrations/...   # phone column
apps/workers/api-gateway/src/routes/
  admin-tenants.ts                        # GET/PATCH + create extend
  settings.ts                             # company/branches/users
  auth.ts                                 # reject suspended tenant
apps/workers/api-gateway/src/index.ts     # wire routes
apps/web/src/app/dashboard/configuracoes/page.tsx
apps/web/src/app/dashboard/admin/tenants/page.tsx
apps/web/src/components/dashboard/TopHeader.tsx
apps/web/src/lib/nav.ts
apps/web/src/lib/api.ts                   # helpers settings
```

## Complexity Tracking

Nenhuma violação; escopo contido na Onda 1.
