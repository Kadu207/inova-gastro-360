# agents.md — Harness completo (Inova Gastro 360)

**Produto:** Inova Gastro 360 (nunca "Inova Food")  
**Domínio:** https://inovagastro360.inovatitech.com.br  
**Canônico:** este arquivo (`docs/agents.md`) + [`AGENTS.md`](../AGENTS.md) + [`memory.md`](../memory.md)  
**Nota:** na raiz do repo o Cursor usa `AGENTS.md`; o catálogo completo fica em `docs/agents.md` (no Windows, `agents.md` e `AGENTS.md` colidem no mesmo path).  
**Plano ativo:** OS Tenants + Asaas (ondas 0–7) — A+B UI; Asaas 1→2→3

Pipeline: **25 construção | 15 revisão | 15 embarcados** (55) + **14 skills Spec Kit**.

---

## 0. Ciclo harness (OBRIGATÓRIO — toda onda / spec)

```text
INÍCIO SESSÃO
  memory.md → memory-bank/activeContext.md → projectbrief.md
  → docs/agents.md → AGENTS.md → .specify/memory/constitution.md
  → .specify/feature.json → PORT_REGISTRY.md
  → docs/cursor-tooling.md (se deploy/MCP/skills)

SPEC KIT (ler .cursor/skills/speckit-*/SKILL.md antes)
  SK-01 constitution (só se princípio mudar)
  SK-02 /speckit-specify  → specs/NNN-*/spec.md
  SK-03 /speckit-clarify
  SK-07 /speckit-checklist
  SK-04 /speckit-plan     → plan.md
  SK-05 /speckit-tasks    → tasks.md (TDD)
  SK-06 /speckit-analyze
  SK-10 /speckit-git-feature → branch feat/NNN-…
  SK-08 /speckit-implement → código + testes (papéis C-*)
  SK-11 /speckit-git-commit (só se usuário pedir)
  SK-09 /speckit-taskstoissues (opcional)

REVISÃO (antes de merge)
  R-01…R-05 + R-06 CodeRabbit + R-07 CI + R-08 audit + R-09 secrets + R-10 typecheck
  (+ R-12 UX / R-13 deploy / R-14 LGPD / R-15 payments conforme onda)

RUNTIME
  EMB-01…04 ativos; novos EMB só quando a onda exigir
  MCP: Prisma, cloudflare-*, browser smoke

FIM SESSÃO
  activeContext.md + progress.md + snapshot memory.md + este mapa de specs
```

**Proibido:** código de produção sem specify/plan/tasks; merge sem `npm run test`; commit de secrets.

Rules: [`.cursor/rules/inova-gastro-360.mdc`](../.cursor/rules/inova-gastro-360.mdc) (harness alwaysApply), `specify-rules.mdc`, `cloudflare-workers.mdc`

---

## 1. Skills Spec Kit (locais) — SK-01…14

| ID | Skill / comando | Função |
|----|-----------------|--------|
| SK-01 | `/speckit-constitution` | Emendar `.specify/memory/constitution.md` |
| SK-02 | `/speckit-specify` | `specs/###-nome/spec.md` |
| SK-03 | `/speckit-clarify` | Perguntas na spec |
| SK-04 | `/speckit-plan` | `plan.md` (+ research/data-model) |
| SK-05 | `/speckit-tasks` | `tasks.md` TDD |
| SK-06 | `/speckit-analyze` | Gaps spec/plan/tasks |
| SK-07 | `/speckit-checklist` | Gate pré-implementação |
| SK-08 | `/speckit-implement` | Código + testes |
| SK-09 | `/speckit-taskstoissues` | Export issues |
| SK-10 | `/speckit-git-feature` | Branch feature |
| SK-11 | `/speckit-git-commit` | Commit convencional |
| SK-12 | `/speckit-git-validate` | Validar repo |
| SK-13 | `/speckit-git-initialize` | Init git Spec Kit |
| SK-14 | `/speckit-git-remote` | Remote Spec Kit |

Path: `.cursor/skills/speckit-*`

### Skills / plugins globais (quando usar)

| Área | Skills | Onda típica |
|------|--------|-------------|
| Prisma | `prisma-cli-migrate-*`, generate, studio | 018, 022–027 |
| Cloudflare | wrangler, workers-best-practices, DO | Fase F / tunnel |
| Stripe | stripe-* | legado billing fallback |
| Canvas | canvas skill | relatórios / auditorias |
| Browser | cursor-ide-browser / MCP | smoke UI R-12/R-13 |

Matriz MCP: [`cursor-tooling.md`](cursor-tooling.md)

---

## 2. Construção C-01…25

| ID | Nome | Responsabilidade |
|----|------|------------------|
| C-01 | Scaffold / monorepo | Turbo, packages, portas |
| C-02 | Auth / JWT / sessões | `packages/auth`, login |
| C-03 | Multitenant / RLS | Prisma + policies |
| C-04 | Validation / Zod | `packages/validation` |
| C-05 | Contracts / eventos | `packages/contracts` |
| C-06 | API Gateway | Rotas REST api-gateway |
| C-07 | Messaging bus | Outbox → filas / HTTP |
| C-08 | Realtime hub | WS/SSE, Redis |
| C-09 | Integrations | Webhooks Asaas/Stripe/MP |
| C-10 | Cardápio / catálogo | Spec 002/014 |
| C-11 | Pedidos | Spec 003 |
| C-12 | Painéis KDS/balcão/delivery | Spec 004 |
| C-13 | Financeiro | Spec 005 |
| C-14 | Print-agent | Spec 006 |
| C-15 | Pagamentos / Asaas | Spec 007/017/020/021/027 |
| C-16 | Billing SaaS | Assinaturas |
| C-17 | LGPD / cookies | Spec 009 |
| C-18 | Web Next.js / OS UI | `apps/web` |
| C-19 | VPS runtime / Docker | Spec 013 |
| C-20 | Cloudflare Workers / Tunnel | Spec 010/013 |
| C-21 | Security hardening | Spec 015/016 |
| C-22 | Observabilidade / health | `/health`, smokes |
| C-23 | Docs / runbooks | `docs/runbooks/*` |
| C-24 | Infoproduto / GTM | `docs/infoproduto/*` |
| C-25 | Ops / scripts VPS | `infra/hetzner/scripts/*` |

---

## 3. Revisão R-01…15

| ID | Gate |
|----|------|
| R-01 | Spec aprovada antes de código |
| R-02 | Plan vs constitution |
| R-03 | Testes críticos (auth, multitenant, pedidos, pagamentos) |
| R-04 | Sem query sem `tenant_id` |
| R-05 | Auth, uploads, secrets |
| R-06 | CodeRabbit (`.coderabbit.yaml`) |
| R-07 | CI lint/typecheck/test/build |
| R-08 | npm audit high |
| R-09 | Secrets guard |
| R-10 | Typecheck / TSC |
| R-11 | Contratos API + Zod |
| R-12 | UX / a11y smoke (login, painéis, mobile) |
| R-13 | Deploy VPS / CF |
| R-14 | LGPD |
| R-15 | Payments / webhooks / sandbox |

---

## 4. Embarcados EMB-01…15

Código: [`apps/workers/api-gateway/src/lib/agents.ts`](../apps/workers/api-gateway/src/lib/agents.ts)  
Flags: `AGENTS_ENABLED=1`, `AGENTS_INTERVAL_MS=300000`, `OUTBOX_FLUSH_INTERVAL_MS`

| ID | Nome | Status | Função |
|----|------|--------|--------|
| EMB-01 | Order State Guardian | ✅ | Pedidos >30min → `order.stuck` |
| EMB-02 | Session Sweeper | ✅ | Sessões expiradas |
| EMB-03 | Trial Expiry Notifier | ✅ | Trial ≤3d → `subscription.trial_expiring` |
| EMB-04 | Outbox Replayer | ✅ | `flushPendingOutbox` |
| EMB-05 | Billing reconciler | 🔲 | Asaas/Stripe vs DB |
| EMB-06 | Payment expiry sweeper | 🔲 | PIX/checkout expirados (onda 021) |
| EMB-07 | Webhook DLQ recovery | 🔲 | Falhas integrations |
| EMB-08 | Stock / cardápio drift | 🔲 | Órfãos / sem foto (onda 024) |
| EMB-09 | Print job watchdog | 🔲 | Jobs impressão |
| EMB-10 | Realtime lag alert | 🔲 | Atraso pub/sub |
| EMB-11 | Tenant trial → grace | 🔲 | Estados assinatura |
| EMB-12 | Audit log compaction | 🔲 | Retenção LGPD |
| EMB-13 | Health self-check | 🔲 | `/health/stack` |
| EMB-14 | Rate-limit metrics | 🔲 | Redis/memória |
| EMB-15 | Outbox replay ops | ✅ ops | Cron/`outbox:flush` |

Desligar: `AGENTS_ENABLED=0` em `infra/hetzner/.env.production`.

---

## 5. Roadmap specs 018–027 (plano OS + Asaas)

| Spec | Onda | Título | Status | Agentes foco |
|------|------|--------|--------|--------------|
| — | **0** | Harness + remover `(os)` + rebuild VPS | ✅ #33 + smoke VPS 200 | C-18, C-23, C-25, R-13 |
| 018 | 1 | Tenant admin + Configurações + filiais/users | ✅ #34 MERGED | C-02, C-03, C-06, C-18 |
| 019 | 2 | OS shell responsive + KPIs reais | 🔲 | C-18, C-22, R-12 |
| 020 | 3 | Asaas E2E sandbox (PIX + billing) | 🔲 | C-15, C-09, C-25, R-15 |
| 021 | 3 | Asaas cartão + cancel/estorno + expiração | 🔲 | C-15, EMB-06, R-15 |
| 022 | 4 | Clientes | 🔲 | C-06, C-18 |
| 023 | 4 | Relatórios | 🔲 | C-06, C-13, C-18 |
| 024 | 5 | Estoque | 🔲 | C-06, C-18, EMB-08 |
| 025 | 5 | Promoções | 🔲 | C-06, C-10, C-18 |
| 026 | 6 | Atendimento (inbox; Chatwoot P2) | 🔲 | C-06, C-18, C-09 |
| 027 | 7 | Asaas marketplace (subconta/tenant) | 🔲 após 0–6 | C-15, C-09, C-03, C-21 |

Specs entregues (base): 000–017 (ver [`memory.md`](../memory.md)).

### Mapa onda → revisão / MCP

| Onda | Specs | C-* | R-* extra | MCP / EMB |
|------|-------|-----|-----------|-----------|
| 0 | harness + web | C-18,23,25 | R-13 | browser chunks |
| 1 | 018 | C-02,03,06,18 | R-04,05 | Prisma |
| 2 | 019 | C-18,22 | R-12 | browser |
| 3 | 020–021 | C-15,09,25 | R-15 | Asaas sandbox; EMB-06 |
| 4 | 022–023 | C-06,13,18 | R-04 | Prisma |
| 5 | 024–025 | C-06,10,18 | R-04,11 | Prisma |
| 6 | 026 | C-06,18,(09) | R-12 | — |
| 7 | 027 | C-15,09,03,21 | R-15,05 | Asaas 2 contas |

---

## 6. Login demo (VPS)

| Campo | Valor |
|-------|--------|
| URL | https://inovagastro360.inovatitech.com.br/login |
| Tenant slug | `demo-burger` |
| E-mail | `admin@inovagastro360.local` |
| Senha | `SEED_ADMIN_PASSWORD` em `.env.production` (nunca no Git) |

Super-admin seed: `superadmin@inovagastro360.local`.

---

## 7. MCPs

| MCP | Uso |
|-----|-----|
| cloudflare-bindings | Workers, Hyperdrive, R2 |
| cloudflare-observability | Logs produção |
| cloudflare-docs | Wrangler / DO / Queues |
| cloudflare-builds | CI Workers |
| Prisma Local/Remote | Migrations |
| cursor-ide-browser | Smoke web |

---

## 8. Referências

- [`memory.md`](../memory.md) — snapshot + ops VPS  
- [`architecture.md`](architecture.md)  
- [`.specify/memory/constitution.md`](../.specify/memory/constitution.md)  
- `docs/runbooks/` — pagamentos, favicon, print-agent  
- Plano Cursor: OS Tenants Asaas (ondas 0–7)
