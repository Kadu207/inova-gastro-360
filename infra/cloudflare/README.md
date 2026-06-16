# Cloudflare — Inova Gastro 360

## Subdomínios (produção)

| Subdomínio | Destino |
|------------|---------|
| inovagastro360.inovatitech.com.br | Next.js (Pages/Worker) |
| api.inovagastro360.inovatitech.com.br | Worker api-gateway |
| rt.inovagastro360.inovatitech.com.br | Worker realtime-hub |

## Checklist segurança

- [ ] SSL/TLS Full (strict)
- [ ] WAF habilitado
- [ ] Rate limiting em /auth
- [ ] Turnstile no login público
- [ ] Cache apenas assets estáticos

## Nota

Domínio raiz atualmente serve Excellence Dental — reconfigurar na Onda 1.
