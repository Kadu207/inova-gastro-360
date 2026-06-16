# GitHub Actions — Secrets e ambientes

Repositório: https://github.com/Kadu207/inova-gastro-360

## CI (`ci.yml`)

O pipeline de CI **não exige secrets** — roda `npm ci`, lint, typecheck, test e build.

Dispara em push/PR para: `master`, `main`, `develop`.

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

```bash
gh secret set CLOUDFLARE_API_TOKEN -R Kadu207/inova-gastro-360
gh secret set CLOUDFLARE_ACCOUNT_ID -R Kadu207/inova-gastro-360
gh secret list -R Kadu207/inova-gastro-360
```

## Branch protection

Repositório **privado** no plano Free: branch protection via API exige **GitHub Pro** ou repo **público**.

Alternativas:

1. **GitHub Pro** — Settings → Branches → Add rule em `master` → exigir status check `pipeline`
2. **Repo público** — mesma configuração acima (grátis)
3. **Fluxo manual** — sempre abrir PR e aguardar CI verde antes de merge

Check de status esperado após primeiro CI: **`pipeline`** (job em `ci.yml`).
