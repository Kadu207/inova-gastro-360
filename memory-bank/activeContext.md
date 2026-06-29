# Contexto ativo — Inova Gastro 360

**Última atualização:** 2026-06-29

## Feature ativa: spec 014-catalog-admin — T001–T017 ✅

**Objetivo:** Backoffice multitenant — categorias + produtos + fotos.

### Entregue

- **T001–T008:** validação, storage factory, CRUD categorias API + UI
- **T009–T012:** CRUD produtos admin + UI com `CatalogProductThumb`
- **T013–T017:** presign + multipart upload + `ImageUploader.tsx`

### Pendente

- **T018–T020:** nav polish (parcial — nav já existe), hardening GET público
- **T021–T022:** bucket MinIO VPS + deploy com S3_*
- **T023–T024:** audit_logs opcional, progress.md final

### Deploy VPS

Código ainda **não está no remoto** `feat/006-escpos` — após push:

```bash
git pull && bash infra/hetzner/scripts/build-web-vps.sh
# + configurar S3_* conforme infra/hetzner/docs/MINIO-CATALOG.md para upload
```

### Demo

Login → **Gestão cardápio** → aba Produtos → criar/editar → upload foto na edição
