# Hetzner VPS — Inova Gastro 360

**IP:** `128.140.77.31` | Postgres `:5440` | Redis `:6390`

## 1. Clonar o repositório na VPS (obrigatório)

Os comandos abaixo **não funcionam** no `~` sem o código. Primeiro:

```bash
cd ~
git clone <URL_DO_SEU_REPOSITORIO_GIT> inova-gastro-360
cd inova-gastro-360
```

Substitua `<URL_DO_SEU_REPOSITORIO_GIT>` pela URL real (GitLab/GitHub).

Se o código ainda não foi enviado (`git push`) da sua máquina de desenvolvimento, faça o push antes de clonar na VPS.

## 2. Configurar ambiente

```bash
cp infra/hetzner/.env.production.example infra/hetzner/.env.production
# Gerar segredos automaticamente (spec 015):
bash infra/hetzner/scripts/configure-security-env-vps.sh
# Ou editar manualmente:
nano infra/hetzner/.env.production
```

### Variáveis obrigatórias (spec 015 — segurança)

Gere segredos fortes com `openssl rand -base64 32`. Sem eles a API responde `server_misconfigured`:

| Variável | Uso |
|----------|-----|
| `JWT_SECRET` | Assinatura JWT (sem fallback — obrigatório) |
| `OUTBOX_FLUSH_SECRET` | Autoriza `POST /internal/outbox/flush` |
| `INTERNAL_SHARED_SECRET` | Autentica rotas internas entre workers e `/broadcast` do realtime |
| `CORS_ALLOWED_ORIGINS` | CSV de origens permitidas (ex.: `https://inovagastro360.inovatitech.com.br`) |
| `SEED_ADMIN_PASSWORD` | Senha do admin demo no seed (nunca versionar) |

Para rotacionar a senha do admin (revoga sessões):

```bash
NEW_PASSWORD='<nova senha>' bash infra/hetzner/scripts/rotate-admin-password-vps.sh
```

RLS defense-in-depth (role `inova_gastro_app`):

```bash
APP_DB_PASSWORD='<senha>' bash infra/hetzner/scripts/setup-app-db-role-vps.sh
# Preserva MIGRATION_DATABASE_URL (owner inova_gastro) — migrations NÃO usam inova_gastro_app
bash infra/hetzner/scripts/migrate-deploy-vps.sh
bash infra/hetzner/scripts/recreate-api-vps.sh
```

Se `migrate deploy` falhar com `permission denied for schema public`:

```bash
bash infra/hetzner/scripts/fix-migration-url-vps.sh   # restaura MIGRATION_DATABASE_URL do backup
bash infra/hetzner/scripts/migrate-deploy-vps.sh      # auto-resolve migration falha + redeploy
```

## 3. Postgres + Redis (se ainda não rodando)

```bash
docker compose -f infra/hetzner/docker-compose.prod.yml up -d
# ou docker compose up -d na raiz (dev local)
```

## 4. Deploy do stack app (Node)

**Importante:** nunca rode `npm ci` dentro de vários containers ao mesmo tempo — corrompe `node_modules`.

```bash
# Sincronizar código (se git pull falhar com "divergent branches"):
bash infra/hetzner/scripts/sync-git-vps.sh master

# Após pull com deps novas (ex. bump Next.js / @aws-sdk):
bash infra/hetzner/scripts/npm-ci-vps.sh

bash infra/hetzner/scripts/install-stack-deps.sh   # uma vez (ou após git pull grande)
bash infra/hetzner/scripts/build-web-vps.sh        # rebuild web + restart api-gateway
bash infra/hetzner/scripts/deploy-vps.sh           # stack completo (primeira vez)

# Smoke pós-deploy
bash infra/hetzner/scripts/smoke-catalog-admin.sh
bash infra/hetzner/scripts/smoke-orders-vps.sh      # spec 003 pedidos
```

## 5. Nginx + TLS + firewall

**VPS compartilhada:** porta 80 já usada por outro Docker (`excellence_dental_prod-nginx`). O `systemctl nginx` **não sobe** se algum site em `sites-enabled` escutar :80 (ex.: `casadapaz`).

**Alternativa recomendada — Cloudflare Tunnel** (sem nginx no host):

```yaml
  - hostname: inovagastro360.inovatitech.com.br
    service: http://127.0.0.1:3102
  - hostname: inovagastro360-api.inovatitech.com.br
    service: http://127.0.0.1:8792
```

No `.env.production`: `NEXT_PUBLIC_API_URL=https://inovagastro360-api.inovatitech.com.br`

Se quiser nginx local na **9088** (proxy /api + web), desabilite sites que usam :80 ou use container nginx — ver `NGINX-SHARED-VPS.md`.

## 6. Cutover DNS

Ver `infra/hetzner/CUTOVER.md` e `ROLLBACK.md`.

## Portas (ver PORT_REGISTRY.md)

| Serviço | Porta VPS |
|---------|-----------|
| PostgreSQL | 5440 (localhost) |
| Redis | 6390 |
| API Node | 8792 |
| Web | 3102 |
