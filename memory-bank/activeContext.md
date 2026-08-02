# Contexto ativo — Inova Gastro 360

**Última atualização:** 2026-07-31

## Runtime
- VPS `gestaoti@128.140.77.31` → `~/inova-gastro-360`
- Branch local sync: `master` = `origin/master` (`cabd025` PR #23)
- Feature em andamento: `feat/017-asaas-pagamentos`
- Backup WIP: `wip/local-backup-2026-07-31`

## Segurança
- Spec **016**: MERGED (PR #23) — CodeRabbit config, rate-limit Redis, CI secrets-guard
- HTTPS Tunnel → `:9088`

## Plano em execução
1. Sync master ✅
2. Validar 016 ✅
3. Asaas BR (pedidos + SaaS; Stripe fallback) — em andamento
4. VPS payments smoke
5. Financeiro 005 completo
6. LGPD 009 + privacidade
7. Print-agent validação
8. Cloudflare Queues — adiado

## Regras de negócio
- Core (auth, cardápio, pedidos, painéis, print_jobs, messaging): **sim**
- Pagamentos: Asaas oficial BR (substitui MP); Stripe fallback SaaS
- Financeiro 005 / LGPD 009: em entrega (Onda 4)
