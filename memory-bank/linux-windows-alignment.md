# Checklist — Igualar Linux ao Windows (Inova Gastro 360)

**Atualizado:** 2026-06-16

Legenda: ✅ concluído | ⚠️ parcial / ação manual | ❌ pendente

---

## 1. Ambiente Linux (sistema)

| # | Item | Status | Notas |
|---|------|--------|-------|
| 1.1 | Node.js ≥ 20 (fnm) | ✅ | `~/.local/share/fnm`, persistido em `~/.bashrc` |
| 1.2 | `npm install` (binários Linux) | ✅ | Reinstalado após cópia do Windows |
| 1.3 | Grupo `docker` | ⚠️ | `usermod` feito; em terminal antigo use `newgrp docker` ou logout |
| 1.4 | Postgres + Redis (`docker compose up -d`) | ✅ | Portas 5440 / 6390 |
| 1.5 | `db:migrate` + `db:seed` | ✅ | Tenant `demo-burger` |
| 1.6 | `dev:stack` (5 workers) | ✅ | Inspector ports 9230–9233 (fix conflito 9229) |

---

## 2. Cursor — plugins e skills (conta)

| # | Item | Status | Notas |
|---|------|--------|-------|
| 2.1 | Plugins instalados (Cloudflare, Prisma, GitLab, etc.) | ✅ | Via conta Cursor em `~/.cursor/plugins/` |
| 2.2 | Skills globais Cursor | ✅ | `~/.cursor/skills-cursor/` |
| 2.3 | Regras do projeto | ✅ | `.cursor/rules/inova-gastro-360.mdc` |
| 2.4 | Skills Spec Kit do projeto | ✅ | `.cursor/skills/speckit-*` |

---

## 3. MCPs — autenticação

| # | Servidor | Status | Ação |
|---|----------|--------|------|
| 3.1 | Cloudflare Docs | ✅ | Sem auth |
| 3.2 | Cloudflare Bindings | ✅ | Autenticado 2026-06-16 |
| 3.3 | Cloudflare Builds | ✅ | Autenticado 2026-06-16 |
| 3.4 | Cloudflare Observability | ✅ | Autenticado 2026-06-16 |
| 3.5 | GitLab | ❌ | Auth falhou (404) — conectar em **Cursor Settings → MCP → GitLab** |
| 3.6 | Prisma Remote | ⚠️ | Conectar em Settings → MCP |
| 3.7 | Prisma Local | ⚠️ | Erro no servidor — revisar Settings |
| 3.8 | Stripe | ⚠️ | Conectar se usar pagamentos |
| 3.9 | Notion / Slack / Figma | ⚠️ | Conectar se usar no fluxo |
| 3.10 | Datadog / Sourcegraph | ⚠️ | Erro — opcional |

---

## 4. Git — histórico e backup

| # | Item | Status | Notas |
|---|------|--------|-------|
| 4.1 | Repositório local (`.git`) | ⚠️ | Existe, sem commits iniciais nesta máquina |
| 4.2 | `remote.origin` | ✅ | `https://github.com/Kadu207/inova-gastro-360.git` |
| 4.3 | Commit inicial Linux | ✅ | `chore: baseline Inova Gastro 360 no Linux Debian 13` |
| 4.4 | Push para backup | ✅ | Branch `master` → `origin/master` |

**Comandos (após URL do remote):**
```bash
cd ~/Projetos\ DEV/App\ WEB\ -\ Hamburgueria\ e\ Delivery
git remote add origin <URL>
git add .
git commit -m "chore: baseline Inova Gastro 360 no Linux Debian 13"
git push -u origin master
```

---

## 5. Spec Kit — scripts bash (Linux)

| # | Item | Status | Notas |
|---|------|--------|-------|
| 5.1 | Scripts PowerShell (Windows) | ✅ | `.specify/scripts/powershell/` (mantidos) |
| 5.2 | Scripts bash (Linux) | ✅ | `.specify/scripts/bash/` (spec-kit upstream) |
| 5.3 | `init-options.json` script | ✅ | Atualizado para `sh` |
| 5.4 | `.specify/feature.json` | ✅ | Apontando para feature ativa |

**Testar:**
```bash
.specify/scripts/bash/check-prerequisites.sh --paths-only
.specify/scripts/bash/create-new-feature.sh --help
```

---

## 6. Segredos locais (não versionados)

| # | Item | Status |
|---|------|--------|
| 6.1 | `.env` | ✅ |
| 6.2 | `apps/workers/api-gateway/.dev.vars` | ✅ |
| 6.3 | Cloudflare API token (deploy) | ⚠️ Verificar wrangler login |
| 6.4 | Hyperdrive / VPS Postgres | ⚠️ Ver `infra/hetzner/hyperdrive.md` |

---

## 7. Próximos passos recomendados (ordem)

1. ❌ Autenticar **GitLab MCP** no Cursor (Settings)
2. ✅ Cloudflare MCPs (bindings, builds, observability)
3. ❌ Definir **URL do Git remote** e fazer push
4. ⚠️ `wrangler login` para deploy Workers
5. ⚠️ Atualizar wrangler 4.20 → 4.100 (opcional, remove warnings)
