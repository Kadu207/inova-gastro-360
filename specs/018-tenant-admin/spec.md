# Feature Specification: 018-tenant-admin

**Feature Branch**: `feat/018-tenant-admin`  
**Created**: 2026-08-03  
**Status**: Draft  
**Input**: Tenants definitivos + Configurações (loja, filiais, usuários) + seletor de filial; UI super_admin; Onda 1 do plano OS+Asaas (A+B).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Configurações da loja e filiais (Priority: P1)

Como `admin_cliente`, quero ver e editar dados da empresa (nome fantasia, razão social, CNPJ/CPF, telefone) e gerenciar filiais (nome, endereço, ativo), para operar o tenant sem depender de seed/SQL.

**Why this priority**: Sem config UI o produto não fecha “tenant definitivo” no dia a dia.

**Independent Test**: Login demo → `/dashboard/configuracoes` → alterar trade name → refresh mostra valor; criar filial → aparece na lista.

**Acceptance Scenarios**:

1. **Given** admin autenticado, **When** abre Configurações aba Loja, **Then** vê company do próprio `tenant_id` e pode PATCH.
2. **Given** admin, **When** cria/edita filial, **Then** registro fica no mesmo tenant e RLS impede acesso cruzado.
3. **Given** usuário `atendente`, **When** tenta PATCH company, **Then** 403.

---

### User Story 2 - Usuários e acesso por filial (Priority: P1)

Como `admin_cliente`, quero listar usuários do tenant, criar usuário com papel e filiais, e ativar/desativar, para onboarding de equipe.

**Why this priority**: Multiusuário é necessário para balcão/cozinha/delivery.

**Independent Test**: Criar usuário atendente com 1 branch → login com slug → JWT contém só essa branch.

**Acceptance Scenarios**:

1. **Given** admin, **When** POST user com e-mail único no tenant, **Then** 201 e user aparece na lista.
2. **Given** e-mail duplicado no tenant, **When** cria, **Then** 409.
3. **Given** admin, **When** desativa user, **Then** `is_active=false` e login falha (ou sessão inválida).

---

### User Story 3 - Seletor de filial ativa (Priority: P1)

Como usuário com ≥1 filial, quero trocar a filial ativa no header do OS, para que cardápio/pedidos usem o `activeBranchId` correto.

**Why this priority**: Hoje só grava a 1ª branch no login.

**Independent Test**: Usuário com 2 branches → select troca `localStorage.activeBranchId` → request de catálogo usa o novo id.

**Acceptance Scenarios**:

1. **Given** `branchIds` no JWT/me, **When** escolhe filial B, **Then** `getActiveBranchId()` retorna B.
2. **Given** 1 filial, **When** abre header, **Then** seletor mostra a única opção (ou oculto).

---

### User Story 4 - Admin plataforma de tenants (Priority: P2)

Como `super_admin`, quero listar tenants, criar com CNPJ/telefone/endereço da filial, e suspender/reativar, via UI `/dashboard/admin/tenants`.

**Why this priority**: Ops já tem POST API; UI acelera go-live do 2º tenant.

**Independent Test**: super_admin cria tenant `teste-burger` → login com slug → dados isolados de `demo-burger`.

**Acceptance Scenarios**:

1. **Given** super_admin, **When** GET `/api/v1/admin/tenants`, **Then** lista com status.
2. **Given** super_admin, **When** PATCH status `suspended`, **Then** login do tenant retorna erro de conta.
3. **Given** `admin_cliente`, **When** acessa admin tenants API/UI, **Then** 403 / redirect.

---

### Edge Cases

- Slug inválido / conflito no create tenant.
- Tenant suspenso: bloquear login (mensagem clara).
- Usuário sem `user_branch_access`: seletor vazio + aviso.
- Document/CNPJ: aceitar só dígitos (normalizar) até 14 chars.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Extender provisionamento tenant com `documentNumber`, `phone`, `branchAddress` (opcionais).
- **FR-002**: Endpoints settings (tenant-scoped): company GET/PATCH; branches list/create/patch; users list/create/patch (+ branch access).
- **FR-003**: Endpoints admin: GET tenants; PATCH status; POST create (já existe, estendido).
- **FR-004**: UI `/dashboard/configuracoes` (abas Loja | Filiais | Usuários); ativar nav.
- **FR-005**: UI `/dashboard/admin/tenants` só super_admin.
- **FR-006**: Seletor de filial no `TopHeader`.
- **FR-007**: Login rejeita tenant `suspended`/`cancelled`.
- **FR-008**: Testes Vitest RBAC + validação Zod + isolamento tenant (sem DB se mock; com SQL onde já houver padrão).

### Key Entities

- Tenant, Company, Branch, User, UserBranchAccess (existentes); Company.phone (novo campo opcional).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 2º tenant provisionado via UI ou API e isolado do demo.
- **SC-002**: Admin altera loja/filial/user sem SQL.
- **SC-003**: Troca de filial reflete em `getActiveBranchId()` imediatamente.
- **SC-004**: `npm run test` verde no pacote afetado / api-gateway.

## Out of Scope

- Self-service signup público.
- Convite por e-mail (SMTP).
- Marketplace Asaas por tenant (027).
- Clientes/Estoque/Promoções (ondas 4–5).
