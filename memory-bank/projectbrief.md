# Inova Gastro 360 — Memória permanente do projeto

## Identidade
- **Nome oficial:** Inova Gastro 360
- **Domínio:** https://inovagastro360.inovatitech.com.br
- **Tipo:** SaaS multitenant para hamburgueria, delivery, cozinha, financeiro
- **Responsável:** Inova TI Tecnologia da Informação
- **Runtime atual:** VPS Hetzner Docker (`gestaoti@128.140.77.31`) — Cloudflare Workers Paid = Fase F

## Stack
- Frontend: Next.js 15 (static export) + TypeScript
- API / workers Node: api-gateway, messaging-bus, realtime-hub, integrations
- Banco: PostgreSQL 16 multitenant + RLS (role `inova_gastro_app`)
- Cache: Redis; Queues Cloudflare = futuro
- ORM: Prisma
- Testes: Vitest
- Metodologia: SDD + TDD + Spec Kit (`docs/agents.md`)

## Portas reservadas
Consultar **PORT_REGISTRY.md** antes de qualquer bind.

## Arquitetura
- Workers desacoplados; outbox → mensageria
- Multitenant: JWT `tid` + RLS `app.current_tenant_id`
- Pagamentos: Asaas (oficial BR); Mercado Pago/Stripe legado/fallback

## Ondas de entrega (roadmap OS + Asaas)

| Onda | Specs | Status |
|------|-------|--------|
| 0 | Harness + chunks sem `(os)` | ✅ #33 |
| 1 | 018 tenant-admin | ✅ #34 + VPS |
| 2 | 019 shell responsive + KPIs | ✅ #38 + VPS |
| 3 | 020–021 Asaas E2E | 🔲 sandbox |
| 4–7 | 022–027 | 🔲 |

## Agentes
Catálogo completo: [`docs/agents.md`](../docs/agents.md) (C-*, R-*, EMB-*).

## Não fazer
- Não usar nome "Inova Food"
- Não expor Postgres/Redis publicamente na VPS
- Não commitar segredos
- Não ignorar isolamento tenant em queries
- Não código de produção sem Spec Kit (specify → plan → tasks → implement)
