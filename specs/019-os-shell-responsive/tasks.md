# Tasks: 019-os-shell-responsive

**Input**: spec.md, plan.md, contracts/  
**Tests**: Vitest obrigatório (constitution) para agregação/RBAC

## Phase 1: Foundational

- [x] T001 [P] Contrato + feature ativa: `contracts/dashboard-summary-api.md` (já) e `.specify/feature.json` → `specs/019-os-shell-responsive`
- [x] T002 [P] Atualizar `AGENTS.md` / `memory.md` / `activeContext` / `docs/agents.md` (019 em andamento)

## Phase 2: US2 — KPIs reais (API)

- [x] T010 Testes Vitest summary: zero pedidos → zeros; com pedidos → soma/count/ticket; cross-tenant 403/404 em `dashboard-summary.test.ts`
- [x] T011 Implementar `apps/workers/api-gateway/src/routes/dashboard-summary.ts` (SQL agregado por `tenant_id` + `branch_id` + dia)
- [x] T012 Wire `GET /api/v1/branches/:branchId/dashboard/summary` em `index.ts` + Zod params se aplicável

## Phase 3: US2 — Dashboard UI

- [x] T020 `fetchDashboardSummary` em `apps/web/src/lib/api.ts`
- [x] T021 `/dashboard` consome summary; remove mocks dos 3 KPIs; “Novos clientes” removido ou “—”; charts mock rotulados/ocultos

## Phase 4: US1 — Drawer mobile

- [x] T030 Estado open/close + overlay + Escape em `DashboardShell.tsx` / `TopHeader.tsx`
- [x] T031 `Sidebar` em modo drawer (aria, focus); CSS em `globals.css` (≤1100px)
- [x] T032 Garantir desktop sem regressão (sidebar permanente)

## Phase 5: US3 — Polish títulos / a11y

- [x] T040 Completar mapa `TITLES` em `DashboardShell.tsx` (configurações, admin tenants, demais rotas shell)
- [x] T041 Labels `aria-expanded` / `aria-controls` no botão menu

## Phase 6: Polish / gates

- [x] T050 `npm run test` (api-gateway + validation afetados) — api-gateway 148 ✅
- [x] T051 Checklist smoke R-12 (login → dashboard → drawer → navegar) em `progress.md` / nota VPS pós-merge
- [x] T052 Atualizar status 019 em `docs/agents.md` / memory ao concluir implementação
