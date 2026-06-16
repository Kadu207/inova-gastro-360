# Onda 1 — Cloudflare DNS e Proxy

## Situação atual

`inovagastro360.inovatitech.com.br` aponta para **Excellence Dental** (conteúdo errado).

## Registros alvo (após deploy Workers/Pages)

| Registro | Tipo | Destino | Proxy |
|----------|------|---------|-------|
| `inovagastro360` | CNAME/A | Pages/Worker web | ✅ Proxied |
| `api.inovagastro360` | CNAME | Worker `inova-gastro-360-api-gateway` | ✅ Proxied |
| `rt.inovagastro360` | CNAME | Worker `inova-gastro-360-realtime-hub` | ✅ Proxied |

## Checklist segurança (Onda 1)

- [ ] SSL/TLS: Full (strict)
- [ ] WAF: Managed rules ON
- [ ] Rate limit: `/api/v1/auth/login` — 10 req/min por IP
- [ ] Bot Fight Mode em rotas públicas
- [ ] Desvincular domínio do stack Excellence Dental antes do cutover

## Wrangler deploy (quando credenciais disponíveis)

```bash
cd apps/workers/api-gateway
wrangler secret put JWT_SECRET
wrangler secret put DATABASE_URL  # ou Hyperdrive binding
wrangler deploy
```

## Page Rule sugerida

- `api.inovagastro360.*` → Bypass cache
- Assets estáticos `/_next/static/*` → Cache Everything (edge TTL 1 mês)
