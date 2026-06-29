# Contexto ativo — Inova Gastro 360

**Última atualização:** 2026-06-29

## Feature ativa: spec 014-catalog-admin — produção VPS ✅

### Produção (smoke verde)

- Login API + admin categories/products + vitrine pública
- `/dashboard/catalogo` deployado @ `feat/006-escpos`
- Scripts VPS: sync-git, npm-ci, fix-env, recreate-api, smoke-catalog-admin

### Pendente operacional

- **S3_* / MinIO** — upload de fotos (CRUD produtos funciona sem foto)
- Rotação senha Postgres (exposta em troubleshooting)
- T023 audit_logs (opcional)

### Demo produção

`https://inovagastro360.inovatitech.com.br` → login → **Gestão cardápio**

`admin@inovagastro360.local` / `InovaGastro360!`
