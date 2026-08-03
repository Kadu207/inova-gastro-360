# Tasks: 018-tenant-admin

**Input**: spec.md, plan.md, data-model.md, contracts/  
**Tests**: Vitest obrigatório (constitution)

## Phase 1: Foundational

- [ ] T001 Extender `CreateTenantSchema` + schemas Settings* em `packages/validation/src/index.ts` + testes Zod
- [ ] T002 Prisma: `Company.phone` + migration SQL `packages/database/prisma/migrations/*_company_phone/`
- [ ] T003 [P] Atualizar `.specify/feature.json` → `specs/018-tenant-admin`

## Phase 2: US1 — Settings company/branches

- [ ] T010 Testes RBAC settings (403 atendente) em `settings.test.ts`
- [ ] T011 Implementar `apps/workers/api-gateway/src/routes/settings.ts` (company + branches)
- [ ] T012 Wire rotas em `index.ts`
- [ ] T013 UI `/dashboard/configuracoes` abas Loja + Filiais; ativar nav

## Phase 3: US2 — Users

- [ ] T020 Settings users CRUD + branch access em `settings.ts` + testes
- [ ] T021 Aba Usuários na UI configuracoes

## Phase 4: US3 — Branch switcher

- [ ] T030 TopHeader seletor + persist `setActiveBranchId`; carregar branches via settings ou me
- [ ] T031 Login: rejeitar tenant suspended em `auth.ts` + teste

## Phase 5: US4 — Admin tenants

- [ ] T040 GET/PATCH admin tenants + create fields em `admin-tenants.ts` + testes
- [ ] T041 UI `/dashboard/admin/tenants` (super_admin)
- [ ] T042 Wire admin GET/PATCH em `index.ts`

## Phase 6: Polish

- [ ] T050 `npm run test` api-gateway + validation
- [ ] T051 Atualizar `memory.md` / `docs/agents.md` / activeContext (Onda 1)
