# Contexto ativo — Inova Gastro 360

**Última atualização:** 2026-06-29

## Feature ativa: spec 014-catalog-admin — produção VPS ✅

### Produção (smoke verde)

- Login API + admin categories/products + vitrine pública
- `/dashboard/catalogo` deployado @ `feat/006-escpos`
- Scripts VPS: sync-git, npm-ci, fix-env, recreate-api, smoke-catalog-admin

### Pendente operacional (commit `7781fc5`)

- **MinIO/S3** — scripts `discover-minio-vps.sh`, `configure-s3-env-vps.sh`, `setup-minio-catalog.sh`
- **Rotação Postgres** — `rotate-postgres-password-vps.sh` (senha exposta em chat anterior)
- Seed VPS opcional (demo já existe; fix SSL em `packages/database`)
- T023 audit_logs (opcional)

### Demo produção

`https://inovagastro360.inovatitech.com.br` → login → **Gestão cardápio**

`admin@inovagastro360.local` / `InovaGastro360!`
