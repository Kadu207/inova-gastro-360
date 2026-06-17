# GitHub Actions — Secrets e ambientes

Repositório: https://github.com/Kadu207/inova-gastro-360

## CI (`ci.yml`)

O pipeline de CI **não exige secrets** — roda `npm ci`, lint, typecheck, test e build.

Dispara em push/PR para: `master`, `main`, `develop`.

**Status check:** `pipeline` (CI verde em 2026-06-16).

## Deploy (`deploy.yml`)

Deploy **manual** (Actions → Deploy — Cloudflare Workers → Run workflow).

### Secrets obrigatórios (Settings → Secrets and variables → Actions)

| Secret | Uso |
|--------|-----|
| `CLOUDFLARE_API_TOKEN` | Token com permissão Workers deploy (Dashboard → My Profile → API Tokens) |
| `CLOUDFLARE_ACCOUNT_ID` | ID da conta Cloudflare (Dashboard → URL ou Overview) |

### Secrets opcionais (futuro Hyperdrive / integrações)

| Secret | Uso |
|--------|-----|
| `JWT_SECRET` | Produção — `wrangler secret put` (não usar valor de dev) |
| `DATABASE_URL` | Só se **não** usar Hyperdrive em prod |
| `N8N_WEBHOOK_URL` | Worker integrations |
| `CHATWOOT_WEBHOOK_URL` | Worker integrations |

### Configurar via CLI

> **ATENÇÃO — nome vs valor**
>
> | O que você vê no Cloudflare | Vai em |
> |------------------------------|--------|
> | Token que começa com `cfat_...` ou string longa | **valor** de `CLOUDFLARE_API_TOKEN` |
> | Account ID (32 hex, ex. `0252c61a2109e807b883c4d466617ebb`) | **valor** de `CLOUDFLARE_ACCOUNT_ID` |
>
> **Nunca** use o token ou o Account ID como **nome** do secret no GitHub.
> Os nomes são fixos: `CLOUDFLARE_API_TOKEN` e `CLOUDFLARE_ACCOUNT_ID`.

```bash
# Onde: terminal Linux, pasta do projeto
source ~/.bashrc
cd ~/Projetos\ DEV/App\ WEB\ -\ Hamburgueria\ e\ Delivery

# 1) Nome fixo → quando pedir "Paste your secret", cole o TOKEN do Cloudflare
gh secret set CLOUDFLARE_API_TOKEN -R Kadu207/inova-gastro-360

# 2) Nome fixo → quando pedir "Paste your secret", cole o Account ID (32 caracteres)
gh secret set CLOUDFLARE_ACCOUNT_ID -R Kadu207/inova-gastro-360

# 3) Confirmar — deve listar EXATAMENTE estes dois nomes:
gh secret list -R Kadu207/inova-gastro-360
```

**Remover secret criado com nome errado (opcional):**
```bash
gh secret delete CFAT_IFKPT1VGEWLTWKNZBCG9FXHCVM9TYRLW2LUNUIE216BE9F66 -R Kadu207/inova-gastro-360
```

## Branch protection

Repositório **privado** no plano Free: branch protection via API exige **GitHub Pro** ou repo **público**.

Alternativas:

1. **GitHub Pro** — Settings → Branches → Add rule em `master` → exigir status check `pipeline`
2. **Repo público** — mesma configuração acima (grátis)
3. **Fluxo manual** — sempre abrir PR e aguardar CI verde antes de merge

Check de status esperado após primeiro CI: **`pipeline`** (job em `ci.yml`).
