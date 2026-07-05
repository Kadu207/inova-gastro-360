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

### Pendente (somente deploy VPS)
1. Merge/push `feat/007-pagamentos` → `master`
2. `configure-payments-env-vps.sh` com credenciais MP + Stripe (sandbox ou prod)
3. `migrate-deploy-vps.sh` + rebuild stack
4. Registrar webhooks MP/Stripe → worker integrations (ver `docs/runbooks/payments-webhooks.md`)
5. `smoke-payments-vps.sh`

## Spec 015 — Security hardening ✅ produção VPS

`master` @ `e83ee13` — smokes verdes 2026-07-03.

- Demo: `https://inovagastro360.inovatitech.com.br`
- Admin: `admin@inovagastro360.local` + `tenantSlug: demo-burger`

## Outros focos
- **Infoproduto** — post #1 aprovado; PDF checklist em `docs/infoproduto/checklists/`
- Opcional: cutover R2 (`configure-r2-env-vps.sh`)
