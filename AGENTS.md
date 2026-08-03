# AGENTS.md — Inova Gastro 360

Instruções para agentes Cursor. **Harness completo obrigatório.**

**Catálogo + ciclo:** [`docs/agents.md`](docs/agents.md)  
**Memória (índice):** [`memory.md`](memory.md)  
**Tooling MCP/skills:** [`docs/cursor-tooling.md`](docs/cursor-tooling.md)

## Início de sessão (OBRIGATÓRIO)
1. Ler [`memory.md`](memory.md) (snapshot + roadmap)
2. Ler `memory-bank/activeContext.md` e `memory-bank/projectbrief.md`
3. Ler [`docs/agents.md`](docs/agents.md) (ciclo SK → C → R → EMB)
4. Ler este arquivo
5. Ler `.specify/memory/constitution.md`
6. Consultar `PORT_REGISTRY.md` antes de bind de portas
7. Feature ativa: `.specify/feature.json`
8. Ler `docs/cursor-tooling.md` se MCP/skills/deploy

**Proibido:** código de produção sem `/speckit-specify` → plan → tasks; merge sem `npm run test`.

## Nome do produto
**Inova Gastro 360** — nunca "Inova Food"

## Metodologia (SDD + TDD + Spec Kit + harness)

| Fase | Comando Cursor | Artefato |
|------|----------------|----------|
| Spec | `/speckit-specify` | `specs/###/spec.md` |
| Clarify | `/speckit-clarify` | perguntas |
| Checklist | `/speckit-checklist` | gate |
| Plan | `/speckit-plan` | `plan.md` |
| Tasks | `/speckit-tasks` | `tasks.md` |
| Analyze | `/speckit-analyze` | gaps |
| Implement | `/speckit-implement` | código + testes |

Rules: `.cursor/rules/specify-rules.mdc`, `.cursor/rules/cloudflare-workers.mdc`, `.cursor/rules/inova-gastro-360.mdc` (harness completo)

**TDD:** `npm run test` MUST passar antes de PR. Críticos: auth, multitenant, pedidos, pagamentos.

## Code review (CodeRabbit + CI)

- PRs: CI lint, typecheck, test, build, audit high, secrets-guard.
- CodeRabbit: [`.coderabbit.yaml`](.coderabbit.yaml) — [`docs/coderabbit.md`](docs/coderabbit.md).
- Gates R-01…R-15: [`docs/agents.md`](docs/agents.md) §3.

## Arquitetura
- Cloudflare-first: Workers desacoplados (Service Bindings)
- PostgreSQL multitenant na VPS via Hyperdrive (prod edge futuro)
- Runtime atual: VPS Docker (spec 013); Queues = Fase F (Paid)

## MCPs recomendados
cloudflare-bindings, cloudflare-observability, cloudflare-docs, Prisma, cursor-ide-browser — ver `docs/cursor-tooling.md`.

## Skills
**Locais:** `.cursor/skills/speckit-*` (14)  
**Globais:** Cloudflare, Prisma, Stripe (legado), canvas

## Fim de sessão
Atualizar `memory-bank/activeContext.md`, `progress.md` e snapshot em [`memory.md`](memory.md). Atualizar mapa specs em [`docs/agents.md`](docs/agents.md) se status de onda mudou.

## Agentes runtime embarcados
EMB-01…04 em `apps/workers/api-gateway/src/lib/agents.ts`. Catálogo completo: [`docs/agents.md`](docs/agents.md) §4.  
`AGENTS_ENABLED=0` desliga.

## Login demo (VPS)
Tenant `demo-burger` / `admin@inovagastro360.local` / `SEED_ADMIN_PASSWORD` no `.env.production`.

## Feature ativa (Spec Kit)

<!-- speckit:active-feature:start -->
- **Diretório:** `specs/018-tenant-admin` (Onda 1 entregue #34)
- **Próxima:** `specs/019-os-shell-responsive`
- **Roadmap:** 018–027 em [`docs/agents.md`](docs/agents.md) §5 / [`memory.md`](memory.md)
- **Atualizado:** 2026-08-03 (rename agentes.md → docs/agents.md)
<!-- speckit:active-feature:end -->
