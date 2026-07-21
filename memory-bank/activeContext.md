# Contexto ativo — Inova Gastro 360

**Última atualização:** 2026-07-21

## Runtime
- VPS `gestaoti@128.140.77.31` → `~/inova-gastro-360`
- Branch deploy: `feat/016-coderabbit-security-layers` (PR #23) — merge pendente em master
- HTTPS Tunnel → `:9088` (headers CSP/XFO/nosniff ativos)

## Segurança
- Spec **015** ops: T050/T051/T053 feitos na VPS (T052 já ok); role `inova_gastro_app` + migrate deploy
- Spec **016**: CodeRabbit (`.coderabbit.yaml`), rate-limit Redis, CI secrets-guard/audit
- Print-agent: `PRINT_AGENT_API_BASE=https://inovagastro360.inovatitech.com.br` (`.env` chmod 600)

## CodeRabbit
- Config no repo; **instalar GitHub App** manualmente: https://github.com/apps/coderabbitai → repo `inova-gastro-360`
- Doc: `docs/coderabbit.md`

## Próximo
- Merge PR #23 → master
- Instalar CodeRabbit App
- Print-agent LAN com impressora real (`PRINTER_TYPE=network`)

## Comandos
```powershell
.\infra\hetzner\scripts\deploy-vps.ps1
```
```bash
cd ~/inova-gastro-360 && bash infra/hetzner/scripts/deploy-vps.sh
```

## Regras de negócio
- Core (auth, cardápio, pedidos, painéis, print_jobs, messaging): **sim**
- Financeiro 005 / LGPD 009: **não** (adiados)
