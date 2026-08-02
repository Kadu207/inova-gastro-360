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

## Pagamentos / VPS — bloqueado nesta máquina
- Código Asaas em `master`; falta **deploy VPS**
- SSH `gestaoti@128.140.77.31`: **Permission denied** (sem chave em `~/.ssh` neste host)
- Pendente na VPS (runbook `docs/runbooks/payments-go-live.md`):
  1. `git pull` + migrate (`asaas_017`, `financeiro_005`, `lgpd_009`)
  2. `ASAAS_API_KEY` + `ASAAS_WEBHOOK_TOKEN` + recreate api-gateway/integrations
  3. `bash infra/hetzner/scripts/smoke-payments-vps.sh`
  4. Confirmar webhook `https://inovagastro360.inovatitech.com.br/webhooks/asaas` ≠ 404

## Print-agent
- Testes locais verdes (`PRINTER_TYPE=none`)
- Checklist hardware: `docs/runbooks/print-agent-escpos.md`
- Impressora física: pendente na LAN

## Adiado
- Cloudflare Workers Paid + Queues (Fase F)

## Feature Spec Kit
- Ativa: `specs/017-asaas-pagamentos` (código mergeado; go-live VPS pendente)
