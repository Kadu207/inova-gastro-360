# Contexto ativo — Inova Gastro 360

**Última atualização:** 2026-08-03

## Foco: Onda 0 (em execução → PR)
- Harness completo: [`agentes.md`](../agentes.md), [`memory.md`](../memory.md), `AGENTS.md`, rules
- Removido `app/(os)/` — layouts em `dashboard/`, `painel/`, `cardapio/` + `OsShellLayout`
- Próximo após merge: rebuild web VPS + smoke chunk `app/dashboard/page-*.js` = 200
- Depois: Spec Kit **018-tenant-admin** (atualizar `.specify/feature.json`)

## Runtime
- VPS `gestaoti@128.140.77.31` → `~/inova-gastro-360`
- Tunnel → nginx `:9088` → web `:3102` / api `:8792` / integrations `:8791`

## Pagamentos / VPS (já feito)
- Migrations Asaas/financeiro/LGPD; `ASAAS_API_KEY` com `$$`
- E2E sandbox Asaas = onda 3 (specs 020/021)

## Login demo
- `demo-burger` / `admin@inovagastro360.local` / `SEED_ADMIN_PASSWORD`

## Adiado
- CF Workers Paid + Queues; CodeRabbit App install; print físico; marketplace Asaas (027)
