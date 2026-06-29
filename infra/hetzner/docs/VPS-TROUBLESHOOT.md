# VPS — troubleshooting deploy (spec 014)

## Status rápido

| Item | Como verificar |
|------|----------------|
| Código atual | `git log -1 --oneline` → `762d6c4` ou mais novo |
| Web admin | `curl -s -o /dev/null -w '%{http_code}\n' https://inovagastro360.inovatitech.com.br/dashboard/catalogo` → **200** |
| API login | ver seção Login abaixo |
| Upload fotos | S3_* real + MinIO rodando + bucket criado |

## Login falhou no smoke

Quase sempre o `.env.production` foi recriado a partir do **example** com placeholders.

```bash
grep -E '^(DATABASE_URL|JWT_SECRET|POSTGRES_PASSWORD)=' infra/hetzner/.env.production
```

Se aparecer `CHANGE_ME` ou `change-me-min-32-chars-production`, restaure os valores reais:

1. **DATABASE_URL** — Postgres da VPS, acessível do container api:
   ```bash
   # padrão spec 013 (host Docker → Postgres no host)
   DATABASE_URL=postgresql://inova_gastro:SENHA_REAL@host.docker.internal:5440/inova_gastro_360?schema=public
   ```

2. **JWT_SECRET** — mesma string de antes (senão tokens antigos invalidam)

3. Reiniciar api:
   ```bash
   docker compose -f infra/hetzner/docker-compose.app.yml --env-file infra/hetzner/.env.production restart api-gateway
   ```

4. Testar login:
   ```bash
   curl -s -X POST https://inovagastro360.inovatitech.com.br/api/v1/auth/login \
     -H 'content-type: application/json' \
     -d '{"email":"admin@inovagastro360.local","password":"InovaGastro360!"}'
   ```

5. Se **401 invalid_credentials** (DB ok): rodar seed:
   ```bash
   docker run --rm -v ~/inova-gastro-360:/app -w /app --env-file infra/hetzner/.env.production \
     node:20-alpine sh -c "npm run db:seed -w @inova-gastro-360/database"
   ```

6. Logs:
   ```bash
   docker logs inova-gastro-360-api --tail 50
   ```

## MinIO — bucket não cria

Erro `Unable to make bucket` com alias OK → credenciais erradas ou MinIO não escuta em `127.0.0.1:9000`.

```bash
docker ps --format '{{.Names}}\t{{.Ports}}' | grep -i minio
ss -tlnp | grep 9000
grep '^S3_' infra/hetzner/.env.production
```

- **No host:** use credenciais reais (não `CHANGE_ME`) e endpoint correto:
  ```bash
  MINIO_HOST_ENDPOINT=http://127.0.0.1:PORTA_REAL \
  S3_ACCESS_KEY=usuario_real S3_SECRET_KEY=senha_real \
  bash infra/hetzner/scripts/setup-minio-catalog.sh
  ```

- **No api-gateway (Docker):** `S3_ENDPOINT=http://minio:9000` — hostname `minio` deve existir na mesma rede Docker ou usar IP do container MinIO.

Upload funciona **sem presign browser** via multipart API (T017) se `S3_*` estiver correto no `.env.production`.

## Nunca commitar na VPS

```bash
git fetch origin feat/006-escpos
git reset --hard origin/feat/006-escpos
```

Evita commits duplicados (`ebff1b1`) que causam "divergent branches".
