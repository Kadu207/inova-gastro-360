# Contexto ativo — Inova Gastro 360

**Última atualização:** 2026-06-20

## Decisão de runtime (2026-06-20)

**Produção até go-live comercial:** VPS Hetzner (spec **013-vps-runtime**)  
**Cloudflare Workers:** adiados por custo — reativar quando produto 100% pronto para vender (spec **010** fase edge)  
**Cloudflare Free (mantido):** DNS + proxy SSL + WAF — sem Workers Paid / Hyperdrive em runtime VPS

## Status atual
- **Ondas 0–3:** core entregue (auth, pedidos, realtime, messaging, print_jobs, integrações)
- **Onda 4:** financeiro adiado (spec 005)
- **Runtime alvo:** VPS `128.140.77.31` — Postgres `:5440`, Redis `:6390`
- **Deploy CF histórico:** Workers em `inovagastro360.*` (2026-06-17) — referência, cutover para VPS pendente (013 fase D)
- **Feature Spec Kit ativa:** `specs/013-vps-runtime`
- **Próximo código:** spec **006** print-agent (poll API; VPS como alvo)

## Portas (dev local)
| Serviço | Porta |
|---------|-------|
| Web | 3102 |
| API gateway | **8792** |
| messaging-bus | 8789 |
| realtime-hub | 8790 |
| integrations | 8791 |
| Postgres | 5440 |
| Redis | 6390 |

## Comandos dev
```bash
docker compose up -d
npm run db:seed
npm run dev:stack   # web + 4 serviços (Wrangler dev — local)
npm run speckit:context
```

**Demo:** `admin@inovagastro360.local` / `InovaGastro360!` (tenant `demo-burger`)

## E2E validado
Login → catálogo → pedido → status → outbox → print_job criado

## Referências
- `specs/013-vps-runtime/` — VPS runtime (decisão + plano)
- `specs/010-cloudflare-workers/` — edge futuro
- `specs/006-impressao-local/` — print-agent
- `infra/hetzner/PRODUCTION.md`
