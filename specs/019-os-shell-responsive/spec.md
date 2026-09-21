# Feature Specification: 019-os-shell-responsive

**Feature Branch**: `feat/019-os-shell-responsive`  
**Created**: 2026-09-20  
**Status**: Draft  
**Input**: Onda 2 do plano OS+Asaas — shell responsivo (drawer mobile), KPIs reais no dashboard, polish de rotas/títulos (R-12 UX/a11y).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Navegação mobile com drawer (Priority: P1)

Como operador no celular/tablet, quero abrir o menu lateral sob demanda (hambúrguer + drawer), para acessar Dashboard, Cardápio, Painéis e Configurações sem perder a navegação (hoje o sidebar some em `<1100px`).

**Why this priority**: Sem menu mobile o OS é inutilizável em viewport estreita; bloqueia R-12.

**Independent Test**: Viewport ≤1100px → botão menu visível → abre drawer com mesmos itens do sidebar → link navega e fecha drawer; Escape/overlay fecha.

**Acceptance Scenarios**:

1. **Given** viewport ≤1100px e sessão autenticada, **When** a página carrega, **Then** sidebar fixo não ocupa layout e há controle acessível “Abrir menu”.
2. **Given** drawer aberto, **When** escolho um item de nav, **Then** navega para a rota e o drawer fecha.
3. **Given** drawer aberto, **When** pressiono Escape ou toco no overlay, **Then** drawer fecha e o foco retorna ao botão menu.
4. **Given** viewport >1100px, **When** uso o OS, **Then** sidebar permanente permanece (sem regressão desktop).

---

### User Story 2 - KPIs reais no Dashboard Geral (Priority: P1)

Como `admin_cliente` / gestor, quero ver no `/dashboard` indicadores calculados a partir dos pedidos da filial ativa (não números mock), para confiar no “Dashboard Geral”.

**Why this priority**: KPIs hardcoded (`R$ 4.280`, `86` pedidos, etc.) invalidam o valor do dashboard.

**Independent Test**: Com filial ativa e pedidos do dia no demo → GET summary → UI mostra vendas/pedidos/ticket alinhados à API; filial sem pedidos → zeros (não mock).

**Acceptance Scenarios**:

1. **Given** usuário autenticado com `activeBranchId`, **When** abre `/dashboard`, **Then** os 3 KPIs principais (vendas hoje, pedidos hoje, ticket médio) vêm da API da filial.
2. **Given** pedidos criados hoje na filial, **When** consulta summary, **Then** `salesCentsToday` = soma de `total_cents` dos pedidos do dia (timezone da filial ou UTC documentado) e `ordersToday` = contagem.
3. **Given** `ordersToday = 0`, **When** calcula ticket, **Then** ticket médio é `0` (não divisão por zero / não valor fictício).
4. **Given** usuário sem permissão de leitura de pedidos da filial, **When** GET summary, **Then** 403.
5. **Given** `branchId` de outro tenant, **When** GET summary, **Then** 404/403 (sem vazamento).

---

### User Story 3 - Polish de títulos, rotas e a11y do shell (Priority: P2)

Como usuário do OS, quero títulos corretos no header para todas as rotas do shell e foco/labels acessíveis no menu mobile, para orientação e smoke R-12.

**Why this priority**: Completa a Onda 2 após drawer + KPIs; baixo risco.

**Independent Test**: Abrir `/dashboard/configuracoes`, `/dashboard/admin/tenants`, `/dashboard/financeiro`, etc. → `TopHeader` mostra título coerente; botão menu tem `aria-expanded` / `aria-controls`.

**Acceptance Scenarios**:

1. **Given** cada rota listada no shell (dashboard, catálogo, billing, financeiro, LGPD, impressão, configurações, admin tenants, painéis), **When** navego, **Then** o título do header não fica genérico “Inova Gastro OS” sem necessidade.
2. **Given** drawer, **When** inspeciono a11y básica, **Then** botão menu tem nome acessível e estado expandido refletido.
3. **Given** nav disabled (Clientes, Relatórios, etc.), **When** vejo no drawer, **Then** permanecem desabilitados “Em breve” (sem ativar ondas futuras).

---

### Edge Cases

- Filial ativa inválida / vazia: summary 400 ou UI com estado vazio + CTA para escolher filial.
- Timezone: documentar uso de dia civil da filial (`branches.timezone`) se existir; senão UTC com nota no contrato.
- Pico de pedidos: agregação SQL indexada por `(tenant_id, branch_id, created_at)` — sem carregar lista completa no browser.
- Charts secundários (semana / canal / top produtos / pagamento): fora do MVP desta spec se não houver dados confiáveis — UI pode ocultar, marcar “Em breve” ou manter placeholder **explicitamente** rotulado (não apresentar como real).
- KPI “Novos clientes”: fora de escopo até spec 022 (Clientes); remover do row ou mostrar “—” desabilitado.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Drawer/off-canvas mobile no `DashboardShell` / `Sidebar` / `TopHeader` para viewport estreita; overlay + teclado Escape.
- **FR-002**: Endpoint tenant/branch-scoped de resumo do dashboard (KPIs do dia + opcional série 7 dias se trivial).
- **FR-003**: `/dashboard` consome API real para KPIs P1; remove valores mock dos três KPIs principais.
- **FR-004**: Mapear títulos de página para rotas existentes do shell (incl. configurações e admin tenants da 018).
- **FR-005**: Testes Vitest: agregação KPI (casos zero/com pedidos) + RBAC/isolamento; teste UI mínimo do drawer se houver harness, senão checklist manual R-12.
- **FR-006**: Não ativar itens de nav das ondas 4–6.

### Key Entities

- `Order` (existente): fonte dos KPIs (`total_cents`, `created_at`, `channel`, `branch_id`, `tenant_id`).
- `Branch` (existente): escopo + timezone se disponível.
- Sem nova tabela Prisma obrigatória nesta onda.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Em viewport mobile, todas as rotas autenticadas do OS alcançáveis via drawer.
- **SC-002**: KPIs principais no dashboard batem com query SQL/API na filial demo (tolerância 0 centavos).
- **SC-003**: Zero regressão desktop do sidebar.
- **SC-004**: `npm run test` verde nos pacotes afetados (api-gateway + web se aplicável).
- **SC-005**: Smoke R-12 documentado (login → dashboard → abrir menu mobile → navegar).

## Out of Scope

- Módulo Relatórios completo (023).
- Módulo Clientes / “Novos clientes” real (022).
- BI avançado, exportação, filtros de período customizados.
- Redesign visual completo / dark mode.
- Asaas E2E (020/021).
- Ativar nav Estoque/Promoções/Atendimento.
