# Feature Specification: 001-auth-multitenant

**Status**: Approved — Onda 1  
**Product**: Inova Gastro 360

## Escopo Onda 1

- Login JWT (access + refresh)
- Contexto tenant/branch no token
- RLS PostgreSQL por `tenant_id`
- Seed demo tenant
- **Fora do escopo Onda 1:** financeiro (fase 4)

## User Story 1 - Login seguro (P1)

**Given** usuário válido do tenant, **When** POST `/api/v1/auth/login`, **Then** recebe accessToken com `tid`, `role`, `branches`.

## User Story 2 - Isolamento tenant (P1)

**Given** tenant A ativo, **When** consulta com RLS, **Then** não retorna dados do tenant B.

## Acceptance

- [x] Rotas login + me no api-gateway
- [x] Package `@inova-gastro-360/auth`
- [x] Schema sessions + user_branch_access
- [x] RLS SQL em `prisma/sql/rls.sql`
- [x] Página `/login` no Next.js
