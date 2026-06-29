# Feature Specification: 014-catalog-admin

**Feature Branch**: `feat/014-catalog-admin`  
**Created**: 2026-06-29  
**Status**: Draft — Onda 2 (complemento 002)  
**Product**: Inova Gastro 360  
**Input**: Backoffice multitenant para cada cliente SaaS gerenciar categorias, produtos e fotos do cardápio público (hamburgueria, pizza, porções, bebidas, bomboniere, etc.).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Gestão de categorias (Priority: P1)

Como **administrador da loja** (tenant), quero criar e organizar categorias do meu cardápio (ex.: Burgers, Pizzas, Porções, Bebidas) para estruturar como meus produtos aparecem no cardápio online.

**Why this priority**: Sem categorias configuráveis, o tenant não controla a vitrine — bloqueia o valor SaaS independente de fotos.

**Independent Test**: Login → área de gestão do cardápio → criar categoria "Porções" → aparece na listagem admin e no cardápio público da filial.

**Acceptance Scenarios**:

1. **Given** usuário autenticado com permissão de gestão na filial, **When** cria categoria com nome e ordem, **Then** a categoria fica disponível no backoffice e visível no cardápio público (se ativa).
2. **Given** categoria existente, **When** admin altera nome ou ordem, **Then** o cardápio público reflete a mudança na próxima visualização.
3. **Given** categoria sem produtos, **When** admin desativa ou exclui, **Then** deixa de aparecer no cardápio público.
4. **Given** usuário de outro tenant, **When** tenta alterar categoria alheia, **Then** a operação é negada (dados isolados).

---

### User Story 2 - Gestão de produtos (Priority: P1)

Como **administrador da loja**, quero cadastrar produtos com nome, descrição, preço, categoria e disponibilidade para expor exatamente o que vendo (hambúrguer, pizza, combo, doces, etc.).

**Why this priority**: Core do CMS — sem CRUD de produtos o cardápio permanece fixo no seed demo.

**Independent Test**: Criar produto "Pizza Calabresa" R$ 45,00 na categoria Pizzas → produto listado no admin e no `/cardapio` público com preço correto.

**Acceptance Scenarios**:

1. **Given** categoria ativa, **When** admin cadastra produto com preço em reais, **Then** produto aparece no cardápio com valor formatado corretamente para o cliente final.
2. **Given** produto disponível, **When** admin marca como indisponível, **Then** some do cardápio público mas permanece no histórico admin.
3. **Given** produto existente, **When** admin edita descrição ou preço, **Then** checkout futuro usa o preço atualizado; pedidos já criados não são alterados.
4. **Given** tentativa de preço zero ou negativo, **When** salva, **Then** sistema rejeita com mensagem clara.

---

### User Story 3 - Foto do produto (Priority: P1)

Como **administrador da loja**, quero enviar a foto do meu produto (ou substituí-la) para que meu cardápio online mostre imagens reais da minha operação, não placeholders genéricos.

**Why this priority**: Diferencial visual do cardápio; documentação v1.2 exige "cadastrar produto com foto".

**Independent Test**: Upload de JPEG válido no produto → foto visível no preview admin e no cardápio público (lazy load + fallback se falhar).

**Acceptance Scenarios**:

1. **Given** produto sem foto, **When** admin envia imagem JPEG/PNG/WebP dentro do limite de tamanho, **Then** a foto aparece no cardápio público desse produto.
2. **Given** produto com foto, **When** admin envia nova imagem, **Then** a foto anterior deixa de ser exibida e a nova passa a valer.
3. **Given** admin remove a foto, **When** salva, **Then** cardápio público exibe placeholder com inicial do nome (comportamento atual T009).
4. **Given** arquivo que não é imagem ou excede tamanho máximo, **When** tenta enviar, **Then** operação é rejeitada sem corromper o produto.
5. **Given** tenant A, **When** tenta associar imagem ou editar produto do tenant B, **Then** operação negada.

---

### User Story 4 - Separar gestão e vitrine (Priority: P2)

Como **administrador**, quero acessar a **gestão do cardápio** no painel logado e abrir a **vitrine pública** em link separado, para não confundir operação interna com experiência do cliente.

**Why this priority**: Hoje `/cardapio` é vitrine; falta rota admin dedicada (`/dashboard/catalogo` ou equivalente).

**Independent Test**: Menu lateral distingue "Gestão cardápio" vs link "Ver cardápio público"; gestão exige login.

**Acceptance Scenarios**:

1. **Given** usuário não autenticado, **When** acessa área de gestão, **Then** redireciona para login.
2. **Given** admin logado, **When** clica "Ver cardápio público", **Then** abre vitrine da filial ativa em nova aba ou mesma sessão sem exigir novo login do cliente final.

---

### User Story 5 - Importação em lote (Priority: P3 — fora do MVP)

Como **administrador**, quero importar vários produtos e fotos de uma vez (planilha ou pacote ZIP) para acelerar onboarding.

**Why this priority**: Alto valor comercial, mas depende do CRUD + upload unitário estável.

**Independent Test**: Fora do escopo MVP; registrado para spec futura 014b ou Fase 2.

**Acceptance Scenarios**: *(adiado)*

---

### Edge Cases

- Categoria com produtos ativos: não permitir exclusão dura sem reassign ou confirmação explícita.
- Upload interrompido: produto permanece sem foto ou com foto anterior intacta.
- Nome duplicado na mesma categoria: permitido (SKUs distintos) — tenant decide; opcional aviso não bloqueante.
- Filial com cardápio vazio: cardápio público exibe estado vazio amigável ("Em breve" / "Cardápio sendo atualizado").
- Moeda: MVP assume BRL (centavos), consistente com modelo atual.
- Limite de armazenamento por tenant: fora do MVP; monitorar uso manualmente na VPS.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Sistema MUST permitir CRUD de categorias por filial, escopado a `tenant_id` + `branch_id`.
- **FR-002**: Sistema MUST permitir CRUD de produtos (nome, descrição, preço, categoria, disponível) por filial, escopado ao tenant.
- **FR-003**: Sistema MUST exigir autenticação e permissão de gestão para todas as operações de escrita no catálogo.
- **FR-004**: Sistema MUST permitir upload de **uma foto por produto** (substituir e remover).
- **FR-005**: Sistema MUST validar tipo e tamanho de imagem antes de persistir referência no produto.
- **FR-006**: Sistema MUST armazenar imagens de forma isolada por tenant (paths ou buckets lógicos separados).
- **FR-007**: Cardápio público (`/cardapio`) MUST continuar somente leitura, consumindo dados atualizados via API existente de catálogo.
- **FR-008**: Sistema MUST impedir vazamento cross-tenant em leitura/escrita de catálogo (testes obrigatórios).
- **FR-009**: Área admin MUST oferecer preview consistente com a vitrine pública (mesmo componente visual de produto).
- **FR-010**: Sistema MUST registrar auditoria mínima (quem alterou produto/categoria — user id + timestamp) quando possível reutilizando `audit_logs`.
- **FR-011**: MVP MUST NOT incluir importação CSV/ZIP, galeria multi-foto, combos ou modificadores (escopo T010 / spec futura).

### Key Entities

- **Categoria de produto**: agrupamento configurável por filial; nome, ordem, ativo/inativo; pertence a um tenant e filial.
- **Produto**: item vendável; nome, descrição, preço, categoria, disponibilidade, URL opcional da foto; pertence a tenant e filial.
- **Imagem de produto**: artefato binário associado a um produto; substituível; servida ao cardápio público via URL segura.
- **Filial (branch)**: contexto operacional — cardápio é por filial dentro do tenant.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Administrador cadastra categoria + produto com foto em **menos de 5 minutos** (fluxo guiado, sem suporte técnico).
- **SC-002**: **100%** das alterações de catálogo feitas por tenant A são invisíveis para tenant B (validado por testes automatizados).
- **SC-003**: **95%** dos uploads válidos (JPEG/PNG/WebP ≤ limite) resultam em foto visível no cardápio público em até **1 minuto** após salvar.
- **SC-004**: Cardápio público mantém tempo de carregamento percebido equivalente ao atual (lazy load preservado).
- **SC-005**: Pelo menos **1 tenant demo** opera cardápio completo sem depender do seed estático (produtos criados via admin).

## Assumptions

- Reutiliza autenticação multitenant existente (spec 001) e modelos Prisma `Product` / `ProductCategory`.
- Uma foto por produto no MVP; galeria fica para fase posterior.
- Preços em centavos (BRL), sem multi-moeda no MVP.
- Segmento (burger, pizza, etc.) é escolha do tenant via categorias livres — sem templates obrigatórios no MVP.
- Storage object (MinIO na VPS) no MVP; migração para Cloudflare R2 documentada no plano técnico, sem bloquear MVP.
- Cardápio público continua static export Next.js; admin é área autenticada client-side contra API.

## Dependencies

- **002-cardapio-online**: vitrine pública, `image_url`, lazy load (T009 ✅).
- **001-auth-multitenant**: JWT, roles, branch access.
- **013-vps-runtime**: deploy API + web na VPS; MinIO compartilhado na infra Inovati.

## Out of Scope (MVP)

- Importação CSV/ZIP em massa
- Combos, modificadores, promoções (T010)
- Múltiplas fotos por produto
- Editor de imagem (crop/filtros) no browser
- CDN comercial R2 (fase pós go-live; interface preparada para swap de storage)
