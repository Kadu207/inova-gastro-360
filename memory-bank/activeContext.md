# Contexto ativo — Inova Gastro 360

**Última atualização:** 2026-07-05

## Spec 007 — Pagamentos ✅ mergeado e em produção VPS

**PR #21 mergeado** — `master` @ `8dfc10f` (2026-07-05).

**VPS:** deploy completo em `master` — 13 rotas web, migration 007 aplicada, webhooks **401** (infra OK).

**Modo pré-venda:** `PAYMENTS_ENABLED=false` via `prepare-payments-vps.sh`. **Não** rodar `configure-payments-env-vps.sh` com tokens de exemplo do runbook.

### Na venda comercial
1. Credenciais reais MP + Stripe no painel de cada provedor
2. `configure-payments-env-vps.sh` (valores reais, não placeholders)
3. Recriar `api-gateway` + `integrations`
4. Cadastrar webhooks: `/webhooks/mercadopago`, `/webhooks/stripe`

**Tunnel:** só Swarm (`cloudflared_cloudflared.*`); nunca `systemctl cloudflared`. Erro **530/1033** = tunnel reconectando — aguardar ou `docker restart` no container Swarm.

## Spec 015 — Security hardening ✅ produção VPS

`master` @ `8dfc10f` — smokes verdes 2026-07-05.

- Demo: `https://inovagastro360.inovatitech.com.br`
- Admin: `admin@inovagastro360.local` + `tenantSlug: demo-burger`

## Outros focos
- **Infoproduto** — post #1 aprovado; PDF checklist em `docs/infoproduto/checklists/`
- Opcional: cutover R2 (`configure-r2-env-vps.sh`)
