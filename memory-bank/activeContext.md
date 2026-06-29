# Contexto ativo — Inova Gastro 360

**Última atualização:** 2026-06-26

## Feature ativa: spec 002-cardapio-online

Roadmap: **002 (refino)** → **003 (entregue)** → **005 financeiro (Onda 4, adiado)**

### Entregue nesta sessão (002 Fase 2)

- `/cardapio` público sem login (DashboardShell `PUBLIC_PATHS`)
- UI: categorias, busca, tabs delivery/retirada, layout catalog + carrinho sticky
- Guest checkout: nome + telefone → POST `/api/v1/orders` (tenant via `branchId`)
- `apps/web/src/lib/cardapio.ts` + testes vitest (5)
- CSS `.catalog-*` em `globals.css`
- `npm run test` — **verde** (11 packages)

### Produção VPS (spec 013) — OK

- HTTPS: `https://inovagastro360.inovatitech.com.br`
- Tunnel: `http://inova-gastro-360-nginx:9088` + cron `tunnel-connect-inova.sh`
- Deploy web: `bash infra/hetzner/scripts/build-web-vps.sh` (npm via Docker, sem npm no host)
- Cardápio spec 002 deployado em `7f8ade9` — validar `catalog-page` em `/cardapio`

## Próximo deploy VPS

Após `git pull` na VPS: rebuild `web` + `api-gateway` (comandos abaixo no handoff).

## Pendente (002 backlog)

- T009 imagens produto + lazy load
- T010 modificadores/combos (fora MVP)

## Demo

`admin@inovagastro360.local` / `InovaGastro360!` / tenant `demo-burger`
