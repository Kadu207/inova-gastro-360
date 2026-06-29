# AGENTS.md — Inova Gastro 360

Instruções para agentes Cursor e pipeline de 55 agentes.

## Início de sessão (OBRIGATÓRIO)
1. Ler `memory-bank/activeContext.md`
2. Ler `memory-bank/projectbrief.md`
3. Ler `.specify/memory/constitution.md`
4. Consultar `PORT_REGISTRY.md` antes de bind de portas
5. Ler `docs/cursor-tooling.md` se a tarefa envolver MCP/skills/deploy

## Nome do produto
**Inova Gastro 360** — nunca "Inova Food"

## Metodologia (SDD + TDD + Spec Kit)

| Fase | Comando Cursor | Artefato |
|------|----------------|----------|
| Spec | `/speckit-specify` | `specs/###/spec.md` |
| Plan | `/speckit-plan` | `plan.md` |
| Tasks | `/speckit-tasks` | `tasks.md` |
| Implement | `/speckit-implement` | código + testes |
| Analyze | `/speckit-analyze` | relatório gaps |

Rules: `.cursor/rules/specify-rules.mdc`, `.cursor/rules/cloudflare-workers.mdc`

**TDD:** `npm run test` MUST passar antes de PR. Testes críticos: auth, multitenant, pedidos (constitution).

## Arquitetura
- Cloudflare-first: Workers desacoplados (Service Bindings twist)
- PostgreSQL multitenant na VPS via Hyperdrive
- Eventos via outbox + Queues (fase 2 — Workers Paid)

## MCPs recomendados (produção)

- **cloudflare-bindings** — workers, hyperdrive
- **cloudflare-observability** — logs
- **cloudflare-docs** — wrangler/DO
- **cursor-ide-browser** — smoke web

Matriz completa: `docs/cursor-tooling.md`

## Skills

**Locais:** `.cursor/skills/speckit-*` (14 skills)  
**Globais:** Cloudflare (`wrangler`, `workers-best-practices`), Prisma (`prisma-cli-*`), Next.js

## Fim de sessão
Atualizar `memory-bank/activeContext.md` e `memory-bank/progress.md`

## Agentes runtime embarcados (pós go-live)
EMB-01 a EMB-15 — ver docs/architecture.md

## Feature ativa (Spec Kit)

## Feature ativa (Spec Kit)

## Feature ativa (Spec Kit)

<!-- speckit:active-feature:start -->
- **Diretório:** `specs/014-catalog-admin`
- **Spec:** `spec.md` | **Plan:** `plan.md` | **Tasks:** `tasks.md`
- **Atualizado:** 2026-06-29
<!-- speckit:active-feature:end -->
