# AGENTS.md — Inova Gastro 360

Instruções para agentes Cursor e pipeline de 55 agentes.

## Início de sessão (OBRIGATÓRIO)
1. Ler `memory-bank/activeContext.md`
2. Ler `memory-bank/projectbrief.md`
3. Ler `.specify/memory/constitution.md`
4. Consultar `PORT_REGISTRY.md` antes de bind de portas

## Nome do produto
**Inova Gastro 360** — nunca "Inova Food"

## Metodologia
- SDD: specs em `specs/###-nome/`
- TDD: testes antes de implementação em regras críticas
- Spec Kit: `/speckit-specify`, `/speckit-plan`, `/speckit-tasks`, `/speckit-implement`

## Arquitetura
- Cloudflare-first: Workers desacoplados
- PostgreSQL multitenant na VPS via Hyperdrive
- Eventos via outbox + Queues

## Fim de sessão
Atualizar `memory-bank/activeContext.md` e `memory-bank/progress.md`

## Skills recomendadas
- `speckit-*` para SDD
- `cloudflare`, `wrangler`, `workers-best-practices`
- `nextjs-best-practices`, `supabase-postgres-best-practices` (RLS)
- `prisma-cli-*` para database

## Agentes runtime embarcados (pós go-live)
EMB-01 a EMB-15 — ver docs/architecture.md
