# Inova Gastro 360 — Memória permanente do projeto

## Identidade
- **Nome oficial:** Inova Gastro 360
- **Domínio:** https://inovagastro360.inovatitech.com.br
- **Tipo:** SaaS multitenant para hamburgueria, delivery, cozinha, financeiro
- **Responsável:** Inova TI Tecnologia da Informação

## Stack (Onda 0+)
- Frontend: Next.js 15 + TypeScript + Tailwind + Shadcn/UI
- Edge: Cloudflare Workers (api-gateway, messaging-bus, realtime-hub, integrations)
- Banco: PostgreSQL 16 multitenant + RLS (VPS Hetzner via Hyperdrive)
- Cache/Fila: Redis local; Cloudflare Queues em produção
- ORM: Prisma
- Testes: Vitest + Playwright
- Metodologia: SDD + TDD + Spec Kit

## Portas reservadas
Consultar **PORT_REGISTRY.md** antes de qualquer bind. Nunca usar 5432, 5678, 6380, 8000, 8787.

## Arquitetura
- Workers separados: API ≠ Mensageria ≠ Realtime ≠ Integrações
- Comunicação Worker↔Worker: Service Bindings
- Eventos de domínio via outbox pattern

## Ondas de entrega
- **Onda 0:** Scaffold monorepo + Spec Kit + Workers skeleton ✅ em execução
- **Onda 1:** Auth multitenant + RLS + Cloudflare base (escopo a definir)
- **Onda 2+:** Cardápio, pedidos, painéis, integrações

## Agentes
- 25 construção | 15 revisão | 15 embarcados runtime

## Não fazer
- Não usar nome "Inova Food"
- Não expor Postgres/Redis publicamente na VPS
- Não commitar segredos
- Não ignorar isolamento tenant em queries
