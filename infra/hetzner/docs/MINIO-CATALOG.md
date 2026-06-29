# MinIO — imagens do catálogo (spec 014)

Bucket S3-compatible para fotos de produtos do **Inova Gastro 360**, reutilizando MinIO da infra Inovati na VPS.

## Bucket

- **Nome:** `inova-gastro-360`
- **Path:** `tenants/{tenant_id}/branches/{branch_id}/products/{product_id}/{uuid}.{ext}`

## Criar bucket (VPS)

MinIO do stack `inova-platform-core` **não publica** porta 9000 no host. Scripts detectam e usam rede Docker interna.

```bash
bash infra/hetzner/scripts/discover-minio-vps.sh
bash infra/hetzner/scripts/configure-s3-env-vps.sh inova-platform-core-minio-1
bash infra/hetzner/scripts/setup-minio-catalog.sh
bash infra/hetzner/scripts/recreate-api-vps.sh
```

`configure-s3-env-vps.sh` define `S3_ENDPOINT=http://inova-platform-core-minio-1:9000` e conecta `inova-gastro-360-api` à rede do MinIO.

Manual:

```bash
# Ajuste alias mc conforme seu ambiente MinIO
mc alias set local http://127.0.0.1:9000 "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD"
mc mb local/inova-gastro-360 --ignore-existing
mc anonymous set download local/inova-gastro-360/tenants
```

Leitura pública apenas no prefixo `tenants/` (URLs servidas via CDN/nginx).

## Variáveis (`.env.production`)

Ver `infra/hetzner/.env.production.example` — seção `STORAGE_*`.

Dentro do Docker Compose (api-gateway → MinIO no host, mesmo padrão do Postgres):

```bash
S3_ENDPOINT=http://host.docker.internal:9000
S3_PUBLIC_BASE_URL=https://cdn.inovatitech.com.br/inova-gastro-360
```

Configurar automaticamente a partir do MinIO existente:

```bash
bash infra/hetzner/scripts/discover-minio-vps.sh
bash infra/hetzner/scripts/configure-s3-env-vps.sh NOME_CONTAINER_MINIO 9000
bash infra/hetzner/scripts/setup-minio-catalog.sh
bash infra/hetzner/scripts/recreate-api-vps.sh
```

## CORS (upload presign do browser)

Se usar presigned PUT direto do browser, configure CORS no bucket:

```json
[
  {
    "AllowedOrigin": ["https://inovagastro360.inovatitech.com.br"],
    "AllowedMethod": ["PUT", "GET", "HEAD"],
    "AllowedHeader": ["Content-Type", "Authorization"],
    "ExposeHeader": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

Se CORS falhar, use fallback multipart via API (T017).

## Migração Cloudflare R2

1. Criar bucket R2 + custom domain
2. Alterar env:

```bash
STORAGE_PROVIDER=r2
S3_ENDPOINT=https://<account_id>.r2.cloudflarestorage.com
S3_PUBLIC_BASE_URL=https://media.inovagastro360.inovatitech.com.br
```

Handlers usam `@aws-sdk/client-s3` — sem mudança de código.

## Smoke

```bash
bash infra/hetzner/scripts/smoke-catalog-admin.sh
```

Ou manualmente:

```bash
curl -s -o /dev/null -w "%{http_code}\n" \
  -H "Authorization: Bearer $TOKEN" \
  "https://inovagastro360.inovatitech.com.br/api/v1/branches/$BRANCH_ID/catalog/admin/categories?includeInactive=1"
```

Esperado: **200** com lista JSON.
