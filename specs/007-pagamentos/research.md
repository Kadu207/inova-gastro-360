# Research: 007 — Pagamentos

**Data**: 2026-07-03  
**Spec**: `spec.md` | **Plan**: `plan.md`

---

## R1 — Provedor PIX para pedidos delivery

**Decision**: **Mercado Pago** (Checkout API / Payments API com `payment_method_id: pix`).

**Rationale**:
- Dominância no Brasil; documentação em pt-BR; sandbox com credenciais de teste.
- Webhooks com assinatura (`x-signature` + `x-request-id`) e idempotência via `data.id` do pagamento.
- QR Code + copia-e-cola nativos; expiração configurável (`date_of_expiration`).
- Um `access_token` por tenant (OAuth futuro) ou credencial de marketplace — MVP usa credencial por tenant em env criptografada no banco (`tenant_payment_config`).

**Alternatives considered**:
| Provedor | Prós | Contras |
|----------|------|---------|
| Asaas | API simples, PIX nativo | Menor ecossistema para cartão P2 |
| Stripe PIX | Unificar vendor | PIX BR ainda limitado vs MP; Stripe reservado ao SaaS |
| PagSeguro | Tradicional BR | SDK legado; webhooks mais verbosos |

---

## R2 — Assinatura SaaS

**Decision**: **Stripe Billing** (Checkout Session + Customer Portal + webhooks).

**Rationale**:
- Spec 015 já modelou `subscription_plans` / `subscriptions`; Stripe mapeia 1:1 com `price_id` por plano.
- Trial local (14d) continua no Postgres; ao upgrade, Stripe assume cobrança recorrente.
- Webhooks: `checkout.session.completed`, `customer.subscription.updated/deleted`, `invoice.payment_failed`.
- Grace period 7d: estado local `past_due` antes de `restricted`.

**Alternatives considered**: Mercado Pago assinaturas (menos maduro para SaaS B2B internacional); Paddle (overkill para MVP).

---

## R3 — Onde vive a lógica de gateway

**Decision**: Worker **`integrations`** recebe webhooks públicos; **`api-gateway`** expõe APIs autenticadas e persiste estado.

**Rationale**:
- Constitution IV: desacoplamento — webhooks não passam pelo api-gateway pesado.
- `integrations` valida assinatura, normaliza evento, chama api-gateway via `POST /internal/payments/apply` com `x-internal-secret`.
- Idempotência centralizada no Postgres (`payment_events.external_event_id` UNIQUE).

**Alternatives considered**: Webhooks direto no api-gateway (acopla tráfego externo ao worker principal).

---

## R4 — Fluxo UX checkout pedido

**Decision**: Pedido criado primeiro (`status: pending_payment`); depois `POST .../orders/{id}/pay` gera PaymentIntent PIX.

**Rationale**:
- Spec 003 já cria pedido; separar criação de cobrança evita pedidos órfãos se cliente abandona antes do PIX.
- Painéis mostram "aguardando PIX" vs "pago" (FR-010).
- Expiração PIX (ex.: 30 min) alinhada ao TTL do QR MP.

**Alternatives considered**: Cobrança antes do pedido (pior UX se falhar validação de estoque).

---

## R5 — Segredos e sandbox

**Decision**: Variáveis por ambiente; credenciais MP/Stripe **nunca** no repo.

| Env (api-gateway / integrations) | Uso |
|----------------------------------|-----|
| `STRIPE_SECRET_KEY` | SaaS checkout |
| `STRIPE_WEBHOOK_SECRET` | Validação webhook Stripe |
| `MERCADOPAGO_ACCESS_TOKEN` | Sandbox/prod global MVP |
| `MERCADOPAGO_WEBHOOK_SECRET` | Assinatura webhook MP |
| `PAYMENTS_SANDBOX=true` | Força modo teste |

MVP: token MP único por deploy; evolução: `tenant_payment_configs` com token por tenant.

---

## R6 — Eventos de domínio

**Decision**: Após confirmação, outbox publica `order.payment_confirmed` com `{ orderId, tenantId, amountCents, method }`.

**Rationale**: Constitution IV — painéis/impressão consomem evento, não polling do gateway.

---

## R7 — Cartão pedido (P2)

**Decision**: Reutilizar Mercado Pago (`payment_method_id: credit_card` ou Checkout Pro) na mesma tabela `payment_intents`.

**Rationale**: Mesmo webhook pipeline; Stripe reservado exclusivamente à assinatura SaaS (evita confusão contábil).

---

## R8 — TEF/POS (P3)

**Decision**: Fora do MVP v1. Endpoint stub `POST .../pay-in-person` retorna 501.

**Dependências futuras**: homologação adquirente, SDK terminal, spec 005 conciliação.

**Alternatives considered**: Integração Stone/Cielo TEF — adiado até operação presencial prioritária.

---

## R9 — Testes

**Decision**: Vitest + mocks de webhook; testes de idempotência e cross-tenant obrigatórios (constitution II/III).

Fixtures: payloads reais anonimizados de MP/Stripe em `apps/workers/integrations/src/__fixtures__/`.
