# Cutover DNS — spec 013 T040 / T041

## Pré-requisitos

1. Stack na VPS: `npm run start:stack` ou `infra/hetzner/scripts/deploy-vps.sh`
2. `npm run smoke:health` → `status: ok`
3. Nginx + TLS (`infra/hetzner/nginx/inovagastro360.conf`, certbot)
4. UFW (`infra/hetzner/scripts/setup-ufw.sh`)

## DNS (Cloudflare)

| Registro | Tipo | Destino |
|----------|------|---------|
| `inovagastro360` | A | `128.140.77.31` |
| `inovagastro360-api` | A | `128.140.77.31` (ou mesmo host via Nginx `/api`) |
| `inovagastro360-rt` | A | `128.140.77.31` (ou `/ws` no host principal) |

SSL Cloudflare: **Full (strict)** com certificado origem Let's Encrypt na VPS.

## E2E produção (T041)

1. Login em `https://inovagastro360.inovatitech.com.br`
2. Criar pedido no cardápio
3. Painel cozinha atualiza (WS ou poll 15s)
4. `print_jobs` criado; print-agent na LAN marca `printed`
5. `curl https://inovagastro360.inovatitech.com.br/health/stack` → ok

## Alternativa sem abrir 443 direto

Cloudflare Tunnel (`cloudflared`) apontando para `127.0.0.1:443`.
