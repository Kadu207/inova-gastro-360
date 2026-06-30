# Cloudflare R2 — migração de mídia (T027)

Substitui MinIO VPS por **Cloudflare R2** sem alterar handlers (`@aws-sdk/client-s3`).

## Pré-requisitos Cloudflare

1. Bucket R2: `inova-gastro-360` (ou nome escolhido)
2. API token S3-compatible (Access Key + Secret)
3. Custom domain público, ex.: `media.inovagastro360.inovatitech.com.br`
4. CORS no bucket (PUT/GET/HEAD) se usar presign browser

## Configurar env na VPS

```bash
R2_ACCOUNT_ID=<account_id> \
R2_ACCESS_KEY_ID=<key> \
R2_SECRET_ACCESS_KEY=<secret> \
R2_PUBLIC_BASE_URL=https://media.inovagastro360.inovatitech.com.br \
bash infra/hetzner/scripts/configure-r2-env-vps.sh
bash infra/hetzner/scripts/recreate-api-vps.sh
bash infra/hetzner/scripts/smoke-catalog-upload.sh
```

## Diferenças MinIO → R2

| Item | MinIO (atual) | R2 |
|------|---------------|-----|
| `STORAGE_PROVIDER` | `minio` | `r2` |
| `S3_ENDPOINT` | `http://minio:9000` | `https://<account>.r2.cloudflarestorage.com` |
| `S3_PUBLIC_BASE_URL` | `.../media/inova-gastro-360` (proxy nginx) | URL pública R2 / custom domain |
| `forcePathStyle` | `true` | `false` (automático no código) |
| Leitura browser | api-gateway `GET /media/` | R2 público direto (sem proxy) |

Após R2 com domínio público, novos uploads retornam `publicUrl` apontando para R2. URLs antigas `/media/...` continuam no proxy até re-upload ou mirror.

## Migrar objetos existentes (opcional)

Com `mc` configurado para MinIO e R2:

```bash
mc mirror local/inova-gastro-360/tenants r2/inova-gastro-360/tenants
```

## Nginx

Com R2 público, `/media/` no nginx deixa de ser necessário para novas fotos. Mantenha o proxy durante transição híbrida.

## Rollback

```bash
bash infra/hetzner/scripts/configure-s3-env-vps.sh inova-platform-core-minio-1
bash infra/hetzner/scripts/recreate-api-vps.sh
```
