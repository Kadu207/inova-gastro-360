# Contexto ativo — Inova Gastro 360

**Última atualização:** 2026-07-31

## Runtime
- VPS `gestaoti@128.140.77.31` → `~/inova-gastro-360`
- `master` local sync: `cabd025` (PR #23)
- Backup WIP: `wip/local-backup-2026-07-31`

## PRs abertos (esta sessão)
- [#25](https://github.com/Kadu207/inova-gastro-360/pull/25) — feat(017) Asaas
- [#27](https://github.com/Kadu207/inova-gastro-360/pull/27) — feat(005) Financeiro
- [#26](https://github.com/Kadu207/inova-gastro-360/pull/26) — feat(009) LGPD

## Pagamentos
- Asaas = gateway oficial BR (pedidos + SaaS); Stripe fallback
- VPS: webhook `/webhooks/asaas` ainda **404** até merge+deploy; MP responde 401
- SSH VPS: **Permission denied** nesta sessão — configurar `ASAAS_API_KEY` via runbook após acesso

## Print-agent
- Testes locais verdes (`PRINTER_TYPE=none`)
- Checklist hardware: `docs/runbooks/print-agent-escpos.md`
- Impressora física: pendente na LAN

## Adiado
- Cloudflare Workers Paid + Queues (Fase F)

## Spec 009 LGPD — sessão 2026-07-31 (branch `feat/009-lgpd-privacidade`)
- CookieBanner evoluído (link real `/privacidade`, CSS próprio) + painel admin `dashboard/lgpd`
- `resolvePublicTenantId` corrigido: `branch_id` inválido não cai mais no tenant demo (risco cross-tenant)
- Testes verdes: 8 API (`apps/workers/api-gateway/src/routes/lgpd.test.ts`) + 7 web (`apps/web/src/lib/lgpd.test.ts`)
- 2 testes flakeados sob carga total (`catalog-admin`/`orders` — timeout 401) passam isolados; não relacionados a LGPD
- Pendente: merge do branch (PR #26 já aberto por sessão anterior)

## Feature Spec Kit
- Ativa sugerida pós-merge: `specs/017-asaas-pagamentos` / 005 / 009
