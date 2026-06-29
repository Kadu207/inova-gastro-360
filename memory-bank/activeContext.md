# Contexto ativo — Inova Gastro 360

**Última atualização:** 2026-06-29

## Feature ativa: spec 014-catalog-admin — T001–T022 ✅

### Entregue

- CRUD categorias + produtos + upload (presign/multipart)
- Hardening GET público catalog (join branches + tenant_id)
- Scripts VPS: `sync-git-vps.sh`, `setup-minio-catalog.sh`, `smoke-catalog-admin.sh`

### VPS — ação imediata

1. Restaurar `.env.production` (sumiu após reset — gitignored):
   ```bash
   cp infra/hetzner/.env.production.example infra/hetzner/.env.production
   nano infra/hetzner/.env.production  # DATABASE_URL, JWT_SECRET, senhas reais
   ```
2. Sync + rebuild:
   ```bash
   bash infra/hetzner/scripts/sync-git-vps.sh feat/006-escpos
   bash infra/hetzner/scripts/build-web-vps.sh
   bash infra/hetzner/scripts/smoke-catalog-admin.sh
   ```
3. MinIO (upload fotos): `bash infra/hetzner/scripts/setup-minio-catalog.sh`

### Pendente

- T023 audit_logs (opcional)
- T024 progress final
