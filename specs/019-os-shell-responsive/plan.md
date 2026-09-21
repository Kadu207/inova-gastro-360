# Implementation Plan: 019-os-shell-responsive

**Branch**: `feat/019-os-shell-responsive` | **Date**: 2026-09-20 | **Spec**: [spec.md](./spec.md)

## Summary

Tornar o shell do OS usável em mobile (drawer) e substituir KPIs mock do `/dashboard` por agregações reais de pedidos da filial ativa. Polish de títulos/a11y. Sem migrations Prisma.

## Technical Context

**Language/Version**: TypeScript 5 / Node 20 / Next.js 15 (static export)  
**Primary Dependencies**: api-gateway handlers, postgres.js + RLS, Vitest, CSS existente (`globals.css`)  
**Storage**: PostgreSQL `orders` (leitura agregada); sem schema novo  
**Testing**: Vitest (api-gateway); smoke manual R-12 mobile  
**Target Platform**: VPS Docker + `apps/web/out`  
**Project Type**: monorepo SaaS  
**Constraints**: multitenant/`branch_id`; sem secrets no Git; nav ondas 4–6 continua disabled  
**Scale/Scope**: 1 endpoint summary + shell drawer + dashboard page

## Constitution Check

- SDD: spec/plan/tasks/contracts neste diretório — PASS  
- TDD: testes de agregação + RBAC antes/junto do handler — PASS  
- Multitenant: summary sempre `tenant_id` do JWT + `branch_id` autorizado — PASS  
- Event-first: N/A (somente leitura) — PASS  
- Simplicity: agregação SQL simples; charts avançados fora — PASS  

## Project Structure

### Documentation

```text
specs/019-os-shell-responsive/
├── spec.md
├── plan.md
├── tasks.md
└── contracts/dashboard-summary-api.md
```

### Source Code (previsto)

```text
apps/workers/api-gateway/src/routes/dashboard-summary.ts   # GET summary
apps/workers/api-gateway/src/routes/dashboard-summary.test.ts
apps/workers/api-gateway/src/index.ts                      # wire route
packages/validation/src/…                                 # query/params Zod se necessário
apps/web/src/components/dashboard/DashboardShell.tsx       # estado drawer
apps/web/src/components/dashboard/Sidebar.tsx               # modo drawer / a11y
apps/web/src/components/dashboard/TopHeader.tsx             # botão menu + títulos
apps/web/src/app/dashboard/page.tsx                        # KPIs reais
apps/web/src/app/globals.css                               # drawer overlay / breakpoints
apps/web/src/lib/api.ts                                    # fetchDashboardSummary
```

## Complexity Tracking

Nenhuma violação. Charts mock restantes devem ser rotulados ou ocultos (FR explícito no spec).
