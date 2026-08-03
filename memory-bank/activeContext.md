# Contexto ativo — Inova Gastro 360

**Última atualização:** 2026-08-02

## Runtime
- VPS `gestaoti@128.140.77.31` → `~/inova-gastro-360`
- `master` sync: `b6b04fd` + fix #28 (página financeiro UTF-8)
- Backup WIP: `wip/local-backup-2026-07-31`

## Onda 4 — merge (esta sessão) ✅
- [#25](https://github.com/Kadu207/inova-gastro-360/pull/25) Asaas → **MERGED**
- [#26](https://github.com/Kadu207/inova-gastro-360/pull/26) LGPD (+ financeiro/migrations) → **MERGED**
- [#27](https://github.com/Kadu207/inova-gastro-360/pull/27) Financeiro → **CLOSED** (superseded por #26)
- [#28](https://github.com/Kadu207/inova-gastro-360/pull/28) fix encoding página financeiro → **MERGED**

## Pagamentos / VPS — go-live Asaas (2026-08-02)
- `master` + migrations `asaas_017` / `financeiro_005` / `lgpd_009` aplicadas
- API Key Asaas no `.env.production` com `$$` (Compose); containers `ASAAS_API_KEY=SET`
- Validado: webhook local/público **401**; `GET /api/v1/payments/status` → `enabled/asaas=true`
- Atenção: não usar `--env-file` no CLI do Compose com key `$aact_...`
- Pendente: merge PR #30 (escape `$$` no configure script) + smoke script health local

## Print-agent
- Testes locais verdes (`PRINTER_TYPE=none`)
- Checklist hardware: `docs/runbooks/print-agent-escpos.md`
- Impressora física: pendente na LAN

## Adiado
- Cloudflare Workers Paid + Queues (Fase F)

## Feature Spec Kit
- Ativa: `specs/017-asaas-pagamentos` (código mergeado; go-live VPS pendente)
