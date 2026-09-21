# memory.md — Memória permanente (índice harness)

**Produto:** Inova Gastro 360  
**Atualizado:** 2026-09-21 (docs sync + ops Asaas `$$`; Ondas 0–2 ✅)  
**Uso:** ler este índice no início da sessão; detalhes nos arquivos linkados.  
**Catálogo agentes:** [`docs/agents.md`](docs/agents.md)

---

## Estado atual (snapshot)

| Item | Status |
|------|--------|
| Plano | OS Tenants + Asaas (A+B UI; Asaas 1→2→3) |
| Onda | **2 ✅** — próxima **3** = 020/021 (Asaas sandbox) |
| Feature Spec Kit ativa | `specs/019-os-shell-responsive` (entregue) → abrir `020` quando sandbox estável |
| Harness | `docs/agents.md` + este arquivo + rules + Spec Kit skills |
| Chunks web | Sem route group `(os)` |
| Deploy VPS | `f716d5b`+ docs/ops; smoke 018/019/R-12 PASS; Asaas key no container |
| Asaas VPS | `$$` no `.env`; `payments/status` asaas=true; E2E = 020/021 |
| Nav disabled | Clientes, Relatórios, Atendimento, Estoque, Promoções |
| Fase F CF Queues | Adiada |
| Print-agent físico | Pendente LAN |
| CodeRabbit App | Instalação manual pendente |
| Security audit | F01–F12 (#37) |
| PR #30 Asaas docker | Superseded — scripts/runbook no master |

Runtime: `gestaoti@128.140.77.31` → `~/inova-gastro-360`  
Tunnel → nginx `:9088` → web `:3102` / api `:8792` / integrations `:8791`

---

## Roadmap ondas (checklist)

| Onda | Specs | Done when |
|------|-------|-----------|
| 0 | harness + `(os)` | ✅ |
| 1 | 018 | ✅ |
| 2 | 019 | ✅ KPIs + drawer + polish |
| 3 | 020–021 | Asaas E2E PIX/billing + cartão/cancel/expiração |
| 4 | 022–023 | Clientes + Relatórios (nav on) |
| 5 | 024–025 | Estoque + Promoções |
| 6 | 026 | Atendimento inbox |
| 7 | 027 | Marketplace Asaas por tenant |

Detalhe agentes × onda: [`docs/agents.md`](docs/agents.md) §5.

---

## Ciclo harness (resumo)

Ver checklist completo em [`docs/agents.md`](docs/agents.md) §0.

Session: `memory.md` → activeContext → docs/agents.md → constitution → feature.json → PORT_REGISTRY.  
Spec Kit: specify → clarify → checklist → plan → tasks → analyze → git-feature → implement.  
Gates: R-* + CI + `npm run test`.  
Fim: activeContext + progress + este snapshot.

---

## Mapa memory-bank/

| Arquivo | Conteúdo |
|---------|----------|
| [`memory-bank/projectbrief.md`](memory-bank/projectbrief.md) | Identidade, stack, ondas |
| [`memory-bank/activeContext.md`](memory-bank/activeContext.md) | Foco da sessão / WIP |
| [`memory-bank/progress.md`](memory-bank/progress.md) | Checklist entrega |
| [`memory-bank/techContext.md`](memory-bank/techContext.md) | Decisões técnicas |
| [`memory-bank/systemPatterns.md`](memory-bank/systemPatterns.md) | Outbox, workers, RLS |
| [`memory-bank/linux-windows-alignment.md`](memory-bank/linux-windows-alignment.md) | Windows ↔ VPS |

---

## Identidade

- **Nome:** Inova Gastro 360 (proibido "Inova Food")
- **Domínio:** https://inovagastro360.inovatitech.com.br
- **Tipo:** SaaS multitenant — hamburgueria, delivery, cozinha, financeiro
- **Org:** Inova TI Tecnologia da Informação

---

## Stack

| Camada | Tecnologia |
|--------|------------|
| Web | Next.js 15 (`output: "export"`) + TS + Tailwind |
| API | Workers: api-gateway, messaging-bus, realtime-hub, integrations |
| Runtime prod | VPS Node Docker (013); CF Workers Paid adiado |
| DB | PostgreSQL 16 + Prisma + RLS (`tenant_id`) |
| Cache | Redis |
| Pagamentos | **Asaas** BR; Stripe fallback billing |
| Testes | Vitest (+ Playwright onde houver) |
| Método | SDD + TDD + Spec Kit + harness completo |

Portas: [`PORT_REGISTRY.md`](PORT_REGISTRY.md).

---

## Specs base (entregues) + roadmap

| Spec | Módulo | Nota |
|------|--------|------|
| 000–016 | Foundation…security | Ver progress.md |
| 017 | Asaas | Código + go-live ops VPS |
| **018** | Tenant admin / config | Onda 1 |
| **019** | OS responsive + KPIs | Onda 2 |
| **020** | Asaas E2E | Onda 3 fase 1 |
| **021** | Asaas card lifecycle | Onda 3 fase 2 |
| **022** | Clientes | Onda 4 |
| **023** | Relatórios | Onda 4 |
| **024** | Estoque | Onda 5 |
| **025** | Promoções | Onda 5 |
| **026** | Atendimento | Onda 6 |
| **027** | Asaas marketplace | Onda 7 (último) |

---

## Credenciais demo (não versionar senha)

| Campo | Valor |
|-------|--------|
| Tenant slug | `demo-burger` |
| E-mail | `admin@inovagastro360.local` |
| Senha | `SEED_ADMIN_PASSWORD` em `infra/hetzner/.env.production` |

---

## Ops VPS — rebuild web (Onda 0 / após merge)

O container `web` serve **`apps/web/out`**. `force-recreate` **não** rebuilda.

```bash
cd ~/inova-gastro-360
git pull origin master

set -a && source infra/hetzner/.env.production && set +a

docker run --rm -v "$PWD:/app" -w /app \
  -e NEXT_PUBLIC_API_URL -e NEXT_PUBLIC_REALTIME_URL -e NEXT_PUBLIC_DEFAULT_BRANCH_ID \
  node:20-alpine sh -c "npm run build -w @inova-gastro-360/web"

docker compose -f infra/hetzner/docker-compose.app.yml up -d --force-recreate web
sleep 5

ls -la apps/web/out/_next/static/chunks/app/dashboard/
# glob FORA das aspas:
curl -s -o /dev/null -w "local:%{http_code}\n" \
  http://127.0.0.1:3102/_next/static/chunks/app/dashboard/page-*.js
```

Esperado: pasta **sem** `(os)`; `local:200`.

Asaas: não usar `--env-file` no CLI Compose; `$$` no `.env.production` — `docs/runbooks/payments-go-live.md`.  
Favicon: `docs/runbooks/favicon.md`.

---

## Harness (ligações)

| Artefato | Papel |
|----------|--------|
| [`docs/agents.md`](docs/agents.md) | Ciclo + SK/C/R/EMB + roadmap 018–027 |
| [`AGENTS.md`](AGENTS.md) | Entrada Cursor |
| [`memory.md`](memory.md) | Este índice |
| `.cursor/rules/*.mdc` | Rules always |
| `.cursor/skills/speckit-*` | Skills SDD (14) |
| `.specify/` | Constitution, feature.json, templates |
| `docs/cursor-tooling.md` | MCP + skills globais |

---

## Não fazer

- Nome "Inova Food"
- Expor Postgres/Redis na VPS
- Commitar `.env` / segredos
- Query sem `tenant_id`
- Pular Spec Kit em feature de produção
- Bind em portas ocupadas do `PORT_REGISTRY`
- Implementar marketplace Asaas (027) antes das ondas 0–6
