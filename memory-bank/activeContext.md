# Contexto ativo — Inova Gastro 360

**Última atualização:** 2026-06-29

## Feature ativa: spec 014-catalog-admin — concluída ✅ (T001–T024)

### Merge pendente

- Branch: `feat/006-escpos` → `master`
- Após merge: `recreate-api-vps.sh` na VPS (audit_logs + media)

### Produção (smoke verde + fotos)

- CRUD categorias/produtos + upload multipart (T017)
- Fotos visíveis em `/dashboard/catalogo` e `/cardapio`
- `GET /media/inova-gastro-360/...` → api-gateway → MinIO (HTTP 200)
- Branch `feat/006-escpos` @ `b725cd2`

### MinIO/S3 ✅

- Bucket `inova-gastro-360`, rede `inova-platform-core_inova-platform` no compose
- `S3_ENDPOINT=http://inova-platform-core-minio-1:9000`
- `S3_PUBLIC_BASE_URL=https://inovagastro360.inovatitech.com.br/media/inova-gastro-360`
- Scripts: `setup-media-proxy-vps.sh`, `smoke-catalog-upload.sh`, `connect-minio-network-vps.sh`

### Segurança Postgres ✅

- Senha rotacionada; pendente alinhar `POSTGRES_PASSWORD` no compose Postgres antes de recreate

### Demo produção

`https://inovagastro360.inovatitech.com.br` → login → **Gestão cardápio**

`admin@inovagastro360.local` / `InovaGastro360!`
