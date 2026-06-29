# Contexto ativo — Inova Gastro 360

**Última atualização:** 2026-06-29

## Feature ativa: spec 014-catalog-admin — produção VPS ✅

### Produção (smoke verde)

- Login API + admin categories/products + vitrine pública
- `/dashboard/catalogo` deployado @ `feat/006-escpos`
- Scripts VPS: sync-git, npm-ci, fix-env, recreate-api, smoke-catalog-admin

### MinIO/S3 ✅ (rede Docker interna)

- Bucket `inova-gastro-360` + prefixo `tenants/` com download público
- `S3_ENDPOINT=http://inova-platform-core-minio-1:9000`
- API na rede `inova-platform-core_inova-platform`
- CORS presign: opcional (multipart T017 OK)

### Segurança Postgres ✅

- Senha `inova_gastro` rotacionada via `rotate-postgres-password-vps.sh`
- `.env.production` + api-gateway atualizados
- Pendente janela manutenção: alinhar `POSTGRES_PASSWORD` no `docker-compose.prod.yml` antes de recriar container Postgres

### Pendente operacional

- Teste upload foto em `/dashboard/catalogo`
- CDN/nginx para `S3_PUBLIC_BASE_URL` (vitrine exibir imagens)

### Demo produção

`https://inovagastro360.inovatitech.com.br` → login → **Gestão cardápio**

`admin@inovagastro360.local` / `InovaGastro360!`
