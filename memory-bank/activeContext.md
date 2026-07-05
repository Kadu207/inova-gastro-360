# Contexto ativo — Inova Gastro 360

**Última atualização:** 2026-07-04

## Spec 007 — Pagamentos ✅ implementado (branch `feat/007-pagamentos`)

**T001–T061 concluídos** — `npm run test` monorepo verde (108 testes api-gateway + integrations + web).

### Entregas
- **US1 PIX:** `POST /pay`, `GET /payment`, cliente MP, webhook integrations, UI cardápio, cron expiração
- **US2 Stripe SaaS:** billing routes, webhook Stripe, subscription-guard, dashboard `/dashboard/billing`
- **US3 Cartão:** Checkout Pro MP + seleção PIX/cartão no cardápio
- **US4 TEF:** stub 501 + research P3
- **Polish:** scripts VPS (`configure-payments-env-vps.sh`, `smoke-payments-vps.sh`), runbook webhooks

### Pendente (pós-deploy VPS 2026-07-04)
1. **Merge PR** `feat/007-pagamentos` → `master` (CI verde + typecheck)
2. Na venda: `configure-payments-env-vps.sh` com credenciais MP + Stripe
3. Cadastrar webhooks nos painéis MP/Stripe (URLs já validadas — HTTP 401)

## Spec 015 — Security hardening ✅ produção VPS

`master` @ `e83ee13` — smokes verdes 2026-07-03.

- Demo: `https://inovagastro360.inovatitech.com.br`
- Admin: `admin@inovagastro360.local` + `tenantSlug: demo-burger`

## Outros focos
- **Infoproduto** — post #1 aprovado; PDF checklist em `docs/infoproduto/checklists/`
- Opcional: cutover R2 (`configure-r2-env-vps.sh`)
