# Hyperdrive — VPS Hetzner + Cloudflare Workers

Conecta o **api-gateway** (Worker) ao PostgreSQL na VPS **sem** expor credenciais no código.

## Visão geral

| Ambiente | Como o Worker acessa o banco |
|----------|------------------------------|
| **Local** (`wrangler dev`) | `DATABASE_URL` em `apps/workers/api-gateway/.dev.vars` → `127.0.0.1:5440` |
| **Produção** | Binding `HYPERDRIVE` no `wrangler.jsonc` (recomendado) |
| **Produção (fallback)** | Secret `DATABASE_URL` via `wrangler secret put` — só se o host for alcançável pela Cloudflare |

O código usa: `env.HYPERDRIVE?.connectionString ?? env.DATABASE_URL` (`apps/workers/api-gateway/src/lib/db.ts`).

---

## Passo 1 — Postgres na VPS

Na VPS Hetzner (SSH):

```bash
cd /caminho/do/projeto
docker compose up -d
docker compose ps   # postgres healthy
```

Aplicar migrations (se ainda não fez):

```bash
npm run db:migrate
npm run db:seed
```

---

## Passo 2 — Usuário `inova_hyperdrive`

1. Edite `infra/hetzner/sql/01-hyperdrive-user.sql` e troque `SUA_SENHA_FORTE`.
2. Na VPS:

```bash
docker exec -i inova-gastro-360-postgres psql -U inova_gastro -d inova_gastro_360 \
  < infra/hetzner/sql/01-hyperdrive-user.sql
```

3. Teste local na VPS:

```bash
docker exec -it inova-gastro-360-postgres psql \
  "postgresql://inova_hyperdrive:SUA_SENHA_FORTE@127.0.0.1:5432/inova_gastro_360" \
  -c "SELECT 1"
```

---

## Passo 3 — Tornar o Postgres alcançável pelo Hyperdrive

O Hyperdrive roda na rede Cloudflare e precisa de um **host + porta acessíveis** (não use `127.0.0.1` na connection string do Hyperdrive).

### Opção A — IP público da VPS + firewall (mais comum)

1. No `docker-compose.yml` da VPS, publique a porta só no host (já é `127.0.0.1:5440` — ajuste se necessário para o IP interno da VPS ou use `cloudflared` TCP).

2. Alternativa simples na VPS: redirecionar com `socat` ou bind em interface privada — **não abra 5440 para `0.0.0.0` sem firewall**.

3. Firewall (exemplo UFW) — permitir **apenas** IPs da Cloudflare na porta 5440:
   - Lista: https://www.cloudflare.com/ips-v4 e https://www.cloudflare.com/ips-v6

```bash
# Exemplo (repita para cada CIDR Cloudflare)
sudo ufw allow from 173.245.48.0/20 to any port 5440 proto tcp
```

4. Connection string de **origem** (para o Hyperdrive):

```
postgresql://inova_hyperdrive:SUA_SENHA_FORTE@SEU_IP_PUBLICO_VPS:5440/inova_gastro_360
```

> Se o Postgres só escuta em `127.0.0.1` no host, use **Cloudflare Tunnel (TCP)** ou mude o publish do Docker para o IP privado da VPS que o Hyperdrive consiga rotear (rede privada Cloudflare — ver docs).

### Opção B — Rede privada Cloudflare (VPS com IP privado na CF)

Se a VPS estiver na rede privada Cloudflare, use o **IP privado** na connection string e configure rota em **Workers & Pages → Hyperdrive → Private networking**.

---

## Passo 4 — Criar config Hyperdrive (CLI)

No seu PC (já com `wrangler login`):

```powershell
cd "C:\Users\Carlos\OneDrive\Área de Trabalho\Projetos DEV\App WEB - Hamburgueria e Delivery\apps\workers\api-gateway"

npx wrangler hyperdrive create inova-gastro-360-prod `
  --connection-string "postgresql://inova_hyperdrive:SUA_SENHA_FORTE@SEU_IP_PUBLICO_VPS:5440/inova_gastro_360"
```

Anote o **ID** retornado (ex.: `a1b2c3d4e5f6...`).

Comandos úteis:

```bash
npx wrangler hyperdrive list
npx wrangler hyperdrive get <ID>
```

Ou pelo Dashboard: **Workers & Pages → Hyperdrive → Create**.

---

## Passo 5 — Binding no `wrangler.jsonc`

Edite `apps/workers/api-gateway/wrangler.jsonc` e adicione (com seu ID real):

```jsonc
"hyperdrive": [
  {
    "binding": "HYPERDRIVE",
    "id": "COLE_SEU_HYPERDRIVE_ID_AQUI"
  }
],
```

Atualize também o ambiente de produção:

```jsonc
"vars": {
  "ENVIRONMENT": "production"
}
```

(opcional: manter `development` em `env.dev` se criar ambientes wrangler depois)

---

## Passo 6 — Secrets e deploy

```powershell
# JWT (se ainda não configurou)
npx wrangler secret put JWT_SECRET

# NÃO precisa de DATABASE_URL se usar Hyperdrive binding
# Só use DATABASE_URL secret se NÃO tiver Hyperdrive:
# npx wrangler secret put DATABASE_URL

cd ..\..\..
npm run deploy:workers
```

---

## Passo 7 — Validar

```bash
curl https://inova-gastro-360-api-gateway.<sua-conta>.workers.dev/health
curl -X POST https://api.inovagastro360.inovatitech.com.br/api/v1/auth/login \
  -H "content-type: application/json" \
  -d "{\"email\":\"admin@inovagastro360.local\",\"password\":\"InovaGastro360!\",\"tenantSlug\":\"demo-burger\"}"
```

Se login retornar 500 com erro de banco:

```bash
npx wrangler tail inova-gastro-360-api-gateway
```

---

## Checklist rápido

- [ ] Postgres healthy na VPS
- [ ] Migrations + seed aplicados
- [ ] Usuário `inova_hyperdrive` criado e testado
- [ ] Host/porta acessíveis pela Cloudflare (firewall ou rede privada)
- [ ] `wrangler hyperdrive create` → ID copiado
- [ ] `hyperdrive` binding no `wrangler.jsonc`
- [ ] `JWT_SECRET` em secrets
- [ ] `npm run deploy:workers`
- [ ] Smoke test login + cardápio

---

## Local dev (inalterado)

`apps/workers/api-gateway/.dev.vars`:

```
DATABASE_URL=postgresql://inova_gastro:inova_gastro_dev@127.0.0.1:5440/inova_gastro_360
JWT_SECRET=dev-secret-change-in-production-32chars-min
```

Hyperdrive **não** é usado em `wrangler dev` local — só o binding em deploy.
