# Contexto ativo — Inova Gastro 360

**Última atualização:** 2026-06-29

## Feature ativa: spec 014-catalog-admin — produção VPS ✅

### Produção (smoke verde)

- Login API + admin categories/products + vitrine pública
- `/dashboard/catalogo` deployado @ `feat/006-escpos`
- Scripts VPS: sync-git, npm-ci, fix-env, recreate-api, smoke-catalog-admin

### MinIO/S3 ✅ (rede Docker interna)

- Bucket `inova-gastro-360` criado
- `S3_ENDPOINT=http://inova-platform-core-minio-1:9000`
- API conectada à rede `inova-platform-core_inova-platform`
- Pendente: teste upload foto + CDN vitrine; rotação senha Postgres

### Demo produção

`https://inovagastro360.inovatitech.com.br` → login → **Gestão cardápio**

`admin@inovagastro360.local` / `InovaGastro360!`
