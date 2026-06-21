# Cursor — Skills, MCPs e fluxo de engenharia

**Projeto:** Inova Gastro 360 | **Atualizado:** 2026-06-17

## Metodologia integrada

```text
Constitution → /speckit-specify → /speckit-plan → /speckit-tasks → TDD → /speckit-implement → CI → Deploy Workers
```

| Pilar | Onde | Comando / skill |
|-------|------|-----------------|
| **SDD** | `specs/###/` | `/speckit-specify`, `/speckit-plan`, `/speckit-tasks` |
| **TDD** | `packages/*`, `apps/workers/*` | `npm run test` (Vitest) |
| **Spec Kit** | `.specify/`, `.cursor/skills/speckit-*` | scripts em `.specify/scripts/bash/` |
| **Workers edge** | `apps/workers/` | rule `cloudflare-workers.mdc`, `npm run deploy:workers` |

Feature ativa: `.specify/feature.json`

---

## Skills locais (`.cursor/skills/`)

| Skill | Uso |
|-------|-----|
| speckit-specify | Nova feature → `spec.md` |
| speckit-plan | Plano técnico → `plan.md` |
| speckit-tasks | Breakdown → `tasks.md` |
| speckit-implement | Executar tasks com TDD |
| speckit-analyze | Auditar consistência spec/plan/tasks |
| speckit-checklist | Gate pré-implementação |
| speckit-clarify | Perguntas na spec |
| speckit-constitution | Emendar princípios |
| speckit-git-feature | Branch feature |
| speckit-git-commit | Commit convencional |
| speckit-git-validate | Validar repo |
| speckit-taskstoissues | Exportar para issues |

---

## Skills globais Cursor (plugins)

| Plugin | Skills | Quando usar |
|--------|--------|-------------|
| **Cloudflare** | cloudflare, wrangler, workers-best-practices | Deploy, DO, Hyperdrive, Queues |
| **Prisma** | prisma-cli-* | migrate, db push, studio |
| **GitLab** | gitlab skills | MR, issues (auth pendente) |
| **Figma** | figma-* | Design system (futuro UI) |
| **Stripe** | stripe | Pagamentos Onda 4 |

---

## MCPs — matriz de uso

| MCP | Status | Caso de uso no projeto |
|-----|--------|------------------------|
| **cloudflare-bindings** | ✅ | Listar workers, Hyperdrive ID, validar deploy |
| **cloudflare-builds** | ✅ | Logs CI Workers |
| **cloudflare-observability** | ✅ | Debug produção pós-login |
| **cloudflare-docs** | ✅ | DO sqlite, Queues, wrangler flags |
| **cursor-ide-browser** | ✅ | Smoke E2E web `/login` |
| **cursor-app-control** | ✅ | Abrir docs, renomear chat |
| **Prisma Local/Remote** | ⚠️ | Migrations, schema drift |
| **GitLab** | ❌ | CI alternativo — configurar PAT |
| **Datadog / Coralogix** | ⚠️ | Observabilidade avançada (pós go-live) |
| **Figma / Notion / Slack** | ⚠️ | Opcional produto/design |

Config exemplo: `.cursor/mcp.json.example` (sem secrets).

---

## Workers — estrutura lógica (runtime: VPS spec 013; edge CF spec 010 futuro)

Ver rule `.cursor/rules/cloudflare-workers.mdc` (dev Wrangler) e spec `specs/013-vps-runtime/`.

```bash
npm run dev:stack          # local: web + 4 workers
npm run deploy:workers     # produção edge
npm run deploy:web         # Next export → Worker assets
```

---

## TDD — comandos

```bash
npm run test               # todos workspaces (Turbo)
npm run test:unit          # sem web
npm run typecheck
npm run db:generate        # antes de typecheck com Prisma
```

Testes críticos obrigatórios antes de merge (constitution): auth, multitenant JWT, rotas API core.

---

## Onboarding Linux

Checklist: `memory-bank/linux-windows-alignment.md`

```bash
chmod +x .specify/scripts/bash/*.sh
.specify/scripts/bash/update-agent-context.sh
```
