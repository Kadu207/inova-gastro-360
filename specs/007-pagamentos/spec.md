# Feature Specification: 007 — Pagamentos (Stripe + PIX)

**Feature Branch**: `feat/007-pagamentos`  
**Created**: 2026-07-03  
**Status**: Approved — plan em `plan.md` (2026-07-03)  
**Input**: Pagamentos online para pedidos delivery (PIX prioritário no Brasil) e cobrança de assinatura SaaS (Stripe), com webhooks idempotentes e integração à fundação de billing da spec 015.

**Product**: Inova Gastro 360  
**Depende de**: spec 003 (pedidos), spec 015 (subscriptions, RLS, outbox), spec 002 (cardápio/checkout web)

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Cliente paga pedido delivery via PIX (Priority: P1)

Cliente final no cardápio web confirma o pedido e escolhe pagar com PIX. Recebe QR Code ou código copia-e-cola, paga no app do banco e vê confirmação quando o pagamento for reconhecido. A cozinha só trata o pedido como pago após confirmação.

**Why this priority**: PIX é o meio dominante no delivery BR; sem isso o restaurante opera só com pagamento na entrega ou manual.

**Independent Test**: Criar pedido guest no cardápio demo, gerar cobrança PIX de teste, simular webhook de confirmação e verificar status do pedido + notificação nos painéis.

**Acceptance Scenarios**:

1. **Given** pedido criado com total válido e filial ativa, **When** cliente escolhe PIX, **Then** recebe instruções de pagamento (QR ou copia-e-cola) com valor e prazo de expiração claros.
2. **Given** cobrança PIX pendente, **When** o provedor confirma pagamento via webhook assinado, **Then** o pedido passa a status financeiro "pago" e dispara evento para cozinha/painéis.
3. **Given** cobrança PIX expirada sem pagamento, **When** o prazo acaba, **Then** o pedido permanece identificável como não pago e o cliente pode tentar novamente ou cancelar.
4. **Given** webhook duplicado do provedor, **When** o sistema processa duas vezes o mesmo evento, **Then** o estado do pedido é atualizado apenas uma vez (idempotência).

---

### User Story 2 — Tenant assina plano SaaS após trial (Priority: P1)

Administrador do tenant demo (ou recém-provisionado) cujo trial de 14 dias está próximo do fim acessa área de assinatura, escolhe plano (Starter/Pro/Enterprise) e conclui checkout com cartão recorrente. O tenant continua ativo após o trial.

**Why this priority**: Monetização do SaaS; a spec 015 já criou `subscription_plans` e `subscriptions` — falta o fluxo de pagamento real.

**Independent Test**: Tenant em trial com data de fim simulada; concluir checkout de teste; verificar `subscriptions.status` e bloqueio/desbloqueio de funcionalidades conforme plano.

**Acceptance Scenarios**:

1. **Given** tenant em trial válido, **When** admin inicia upgrade para plano Pro, **Then** é redirecionado a checkout seguro e retorna com assinatura ativa.
2. **Given** checkout concluído, **When** webhook de assinatura ativa chega, **Then** `subscriptions` reflete plano, status `active` e próximo ciclo de cobrança.
3. **Given** pagamento recorrente falhou, **When** webhook de inadimplência chega, **Then** tenant entra em grace period configurável antes de restrições duras.
4. **Given** admin cancela assinatura, **When** fim do período pago, **Then** tenant rebaixa para estado definido (ex.: read-only ou plano starter limitado).

---

### User Story 3 — Cliente paga pedido com cartão (Priority: P2)

Cliente escolhe cartão de crédito/débito no checkout do pedido (além de PIX). Fluxo similar ao PIX com confirmação assíncrona via webhook.

**Why this priority**: Complementa PIX; menor urgência no delivery BR mas necessário para conversão.

**Independent Test**: Pedido + pagamento cartão em modo sandbox; webhook confirma; pedido marcado pago.

**Acceptance Scenarios**:

1. **Given** pedido válido, **When** cliente paga com cartão aprovado, **Then** pedido marcado pago em até 60 segundos após confirmação do provedor.
2. **Given** cartão recusado, **When** provedor retorna falha, **Then** cliente vê mensagem clara e pedido permanece não pago sem duplicar cobrança.

---

### User Story 4 — Pagamento presencial TEF/POS (Priority: P3)

Operador no balcão registra pagamento presencial via terminal (TEF/POS) vinculado ao pedido.

**Why this priority**: Operação de loja física; depende de homologação com adquirente — fora do MVP online.

**Independent Test**: Manual com terminal homologado ou mock de integração P3.

**Acceptance Scenarios**:

1. **Given** pedido balcão aberto, **When** operador confirma pagamento no terminal, **Then** pedido marcado pago com referência da transação presencial.

---

### Edge Cases

- Webhook recebido antes do pedido existir no banco (ordem de eventos): enfileirar ou rejeitar com retry seguro.
- Valor pago diferente do total do pedido: rejeitar confirmação e alertar operador.
- Tenant tenta checkout SaaS sem ser `admin_cliente` ou `super_admin`: negado.
- Pedido guest sem telefone válido: exigir contato antes de gerar PIX (anti-fraude básico).
- Provedor indisponível: mensagem ao usuário; pedido não fica "pago" por timeout local.
- Multitenant: webhook deve resolver tenant/filial corretamente; nunca aplicar pagamento em pedido de outro tenant.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema MUST permitir pagamento PIX de pedidos web com valor igual ao total do pedido e prazo de expiração configurável por tenant/filial.
- **FR-002**: O sistema MUST processar webhooks de pagamento com verificação de assinatura e registro idempotente por evento externo.
- **FR-003**: O sistema MUST atualizar o estado financeiro do pedido apenas após confirmação do provedor (nunca otimista no cliente).
- **FR-004**: O sistema MUST emitir evento de domínio (via outbox) quando pagamento de pedido for confirmado, para painéis e impressão.
- **FR-005**: O sistema MUST oferecer checkout de assinatura SaaS para tenants em trial ou inadimplentes, vinculando plano escolhido à tabela `subscriptions` existente.
- **FR-006**: O sistema MUST suportar cartão para pedidos web (P2) reutilizando a mesma infraestrutura de webhooks e idempotência.
- **FR-007**: O sistema MUST isolar dados de pagamento por `tenant_id` (RLS) e nunca expor segredos de gateway no frontend ou repositório.
- **FR-008**: O sistema MUST registrar histórico auditável de transições de pagamento (criado, pendente, pago, expirado, falhou, estornado) por pedido.
- **FR-009**: O sistema MUST permitir modo sandbox/homologação distinto de produção por variáveis de ambiente (sem chaves no código).
- **FR-010**: Operadores MUST conseguir ver no painel se o pedido está aguardando PIX, pago ou expirado.

### Key Entities

- **PaymentIntent (pedido)**: Tentativa de cobrança ligada a um pedido; valor, método (pix/card), status, id externo do provedor, expira em.
- **PaymentEvent (webhook)**: Evento bruto ou normalizado recebido do provedor; chave de idempotência; resultado do processamento.
- **SubscriptionCheckout**: Sessão de upgrade SaaS ligada a tenant + plano; status; referência externa Stripe.
- **Order (extensão)**: Campos de status financeiro e referência ao pagamento confirmado (sem substituir fluxo operacional `pending → accepted` da cozinha).

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 95% dos pagamentos PIX confirmados pelo provedor refletem status "pago" no pedido em menos de 2 minutos após o webhook.
- **SC-002**: 100% dos webhooks duplicados de teste não alteram o estado do pedido mais de uma vez.
- **SC-003**: Admin de tenant conclui upgrade de trial para plano pago em menos de 5 minutos (fluxo feliz, sandbox).
- **SC-004**: Zero incidentes de pagamento aplicado ao tenant ou pedido errado em testes de isolamento multitenant.
- **SC-005**: 90% dos usuários de teste entendem claramente quando o PIX expirou e como tentar de novo (pesquisa qualitativa beta, ≥5 usuários).

---

## Assumptions

- **Pedidos delivery (PIX/cartão)**: **Mercado Pago** (decisão do plano técnico 2026-07-03). Cartão P2 reutiliza o mesmo provedor; webhooks e idempotência compartilhados.
- **Assinatura SaaS**: Stripe Billing (já listado em `docs/cursor-tooling.md`) para cartão recorrente internacional/BRL; credenciais apenas em ambiente.
- **MVP não inclui**: split de pagamento marketplace, antecipação, conciliação contábil completa (spec 005), TEF/POS (P3), reembolso automático parcial.
- **Spec 015 concluída**: RLS, `subscription_plans`, trial 14d e outbox operacionais em produção.
- **Checkout web** usa fluxo guest existente (spec 003); pagamento é etapa após criação do pedido ou integrada ao confirmar — decisão de UX na fase plan.
- **Grace period** SaaS padrão: 7 dias após falha de cobrança antes de restringir acesso.

---

## Out of Scope (v1)

- Módulo financeiro / DRE (spec 005)
- Pagamento na entrega em dinheiro (registro manual futuro)
- Multi-adquirente por filial
- Apple Pay / Google Pay
- Nota fiscal automática
