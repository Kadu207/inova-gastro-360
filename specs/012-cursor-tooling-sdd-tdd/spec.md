# Feature Specification: 012-cursor-tooling-sdd-tdd

**Status**: Approved  
**Product**: Inova Gastro 360  
**Onda**: Infra de engenharia (contínua)

## User Story 1 — Spec Kit operacional (P1)

Como desenvolvedor, quero SDD completo (spec → plan → tasks → implement) via skills `/speckit-*` no Cursor, para que nenhuma feature de produção nasça sem rastreabilidade.

**Critérios de aceite:**
- `.specify/feature.json` aponta para feature ativa válida
- Pelo menos uma spec de referência com `plan.md` e `tasks.md`
- `workflow-registry.json` e scripts bash completos (incl. `update-agent-context.sh`)
- Rules `.cursor/rules/specify-rules.mdc` alinhadas à constitution

## User Story 2 — TDD em regras críticas (P1)

Como equipe, quero testes automatizados em auth, multitenant e workers, para CI bloquear regressões.

**Critérios de aceite:**
- `vitest` configurado no monorepo
- Testes além de smoke health (JWT tenant, rotas raiz API)
- CI existente continua verde

## User Story 3 — MCPs e skills Cursor (P2)

Como agente, quero matriz documentada de quando usar MCP Cloudflare, Prisma, GitLab, browser, para deploy e observabilidade sem adivinhação.

**Critérios de aceite:**
- `docs/cursor-tooling.md` com tabela MCP × caso de uso
- `.cursor/mcp.json.example` versionado (sem secrets)
- `AGENTS.md` atualizado com skills globais + locais

## User Story 4 — Workers edge (Service Bindings twist) (P2)

Como arquiteto, quero regras explícitas para os 4 Workers desacoplados (api → msg → rt/int), Hyperdrive, DO sqlite, Queues adiadas.

**Critérios de aceite:**
- Rule `cloudflare-workers.mdc` com ordem de deploy e bindings
- Spec 010 reflete produção atual
