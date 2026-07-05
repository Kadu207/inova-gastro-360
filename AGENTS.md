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

Automações determinísticas no `node-server` do api-gateway (`AGENTS_ENABLED=1`, intervalo `AGENTS_INTERVAL_MS=300000`). Código: `apps/workers/api-gateway/src/lib/agents.ts`.

| Agente | Função |
|--------|--------|
| **EMB-01** Order State Guardian | Pedidos presos >30min → evento `order.stuck` |
| **EMB-02** Session Sweeper | Limpa sessões expiradas |
| **EMB-03** Trial Expiry Notifier | Trial expirando em ≤3 dias → `subscription.trial_expiring` |
| **EMB-04** Outbox Replayer | `flushPendingOutbox` (intervalo `OUTBOX_FLUSH_INTERVAL_MS`) |

Desligar agentes: `AGENTS_ENABLED=0` no `.env.production`.

Documentação completa: `docs/architecture.md` (EMB-05…15 planejados).

## Feature ativa (Spec Kit)

## Feature ativa (Spec Kit)

## Feature ativa (Spec Kit)

<!-- speckit:active-feature:start -->
- **Diretório:** `specs/007-pagamentos`
- **Spec:** `spec.md` | **Plan:** `plan.md` (atualizar via `/speckit-plan`) | **Tasks:** `tasks.md`
- **Atualizado:** 2026-07-04 (T001–T061 implementados)
<!-- speckit:active-feature:end -->
