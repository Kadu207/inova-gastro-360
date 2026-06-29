# Implementation Plan: 014-catalog-admin

**Branch**: `feat/014-catalog-admin` | **Date**: 2026-06-29 | **Spec**: [spec.md](./spec.md)  
**Gap analysis**: [gap-analysis.md](./gap-analysis.md)

## Summary

Entregar **backoffice multitenant** para CRUD de categorias/produtos e **upload de foto por produto**, alimentando o cardápio público (002) já existente. Storage MVP via **MinIO S3-compatible** na VPS Inovati; interface preparada para **Cloudflare R2** na migração comercial.

## Technical Context

**Language/Version**: TypeScript 5.8, Node 20  
**Primary Dependencies**: Next.js 15 (web), api-gateway (Hono-style handlers), postgres.js, `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner` (ou minio client)  
**Storage**: MinIO VPS (`s3.inovatitech.com.br` / rede Docker) → R2 fase comercial  
**Testing**: vitest (api-gateway + web helpers); testes cross-tenant obrigatórios  
**Target Platform**: VPS Hetzner + Docker Compose (spec 013)  
**Constraints**: Constitution — uploads validados, sem segredos no repo, `tenant_id` + RLS  
**Scale/Scope**: MVP 1 foto/produto; ~50 produtos/tenant típico

## Constitution Check

| Princípio | Plano |
|-----------|--------|
| SDD | spec 014 ✅ antes de código produção |
| TDD | testes CRUD + cross-tenant + upload validation antes/durante implementação |
| Multitenant | todas writes com JWT `tid`; SQL com `tenant_id`; teste tenant B bloqueado |
| Event-first | catálogo não exige fila no MVP; opcional `catalog.product_updated` fase 2 |
| Simplicity | presigned PUT MinIO; sem microserviço de mídia separado |
| Security | MIME allowlist, max 5MB, path tenant-scoped, HTTPS via Cloudflare |

## Arquitetura

```text
┌─────────────────┐     JWT      ┌──────────────────┐
│ /dashboard/     │ ───────────► │ api-gateway      │
│ catalogo        │   CRUD       │ catalog-admin.ts │
└────────┬────────┘              │ storage/presign  │
         │ preview               └────────┬─────────┘
         │                                │
         ▼                                ▼
┌─────────────────┐              ┌──────────────────┐
│ /cardapio       │ ◄── GET ──── │ PostgreSQL       │
│ (público 002)   │   catalog    │ products/categ.  │
└─────────────────┘              └──────────────────┘
         ▲
         │ image_url (HTTPS)
         ▼
┌─────────────────┐
│ MinIO bucket    │  MVP: VPS
│ inova-gastro-*  │  Prod: Cloudflare R2 (mesma API S3)
└─────────────────┘
```

### Fluxo upload (MVP)

1. Admin salva produto (POST/PATCH) → recebe `productId`
2. `POST .../products/:id/image/presign` → `{ uploadUrl, publicUrl, headers }`
3. Browser `PUT` imagem direto no MinIO
4. `PATCH .../products/:id` `{ image_url: publicUrl }`
5. Cardápio público lê `image_url` via GET catalog existente

**Alternativa simplificada (se CORS MinIO complicar)**: multipart `POST .../products/:id/image` via api-gateway → stream para MinIO (mais carga na VPS, menos CORS).

**Decisão MVP**: tentar **presign** primeiro; fallback multipart documentado em tasks.

## Project Structure

```text
apps/workers/api-gateway/src/
├── routes/
│   ├── catalog.ts              # GET público (existente)
│   ├── catalog-admin.ts        # CRUD autenticado (novo)
│   └── catalog-upload.ts       # presign / upload (novo)
├── lib/
│   └── storage/
│       ├── s3-client.ts        # factory MinIO/R2 via env
│       └── image-policy.ts     # MIME, size, path builder

apps/web/src/
├── app/(os)/dashboard/catalogo/
│   └── page.tsx                # admin CMS
├── components/catalog/
│   ├── CatalogProductThumb.tsx # reutilizar
│   ├── CategoryForm.tsx
│   ├── ProductForm.tsx
│   └── ImageUploader.tsx

packages/database/              # sem migration MVP (image_url já existe)

infra/hetzner/
├── .env.production.example     # S3_* vars
└── docs/MINIO-CATALOG.md       # bucket + CORS + CDN path
```

## Storage: MinIO (agora) → R2 (comercial)

| Aspecto | MinIO VPS (MVP) | Cloudflare R2 (fase B) |
|---------|-------------------|----------------------|
| Endpoint | `http://minio:9000` (rede Docker) ou `s3.inovatitech.com.br` | `https://<account>.r2.cloudflarestorage.com` |
| Público | `cdn.inovatitech.com.br/inova-gastro-360/...` ou nginx proxy | R2 public bucket + custom domain |
| Credenciais | `.env.production` (nunca no git) | Wrangler secrets / env VPS |
| SDK | `@aws-sdk/client-s3` | idem (S3-compatible) |
| Swap | `STORAGE_PROVIDER=minio|r2` + env | zero mudança handlers |

### Path convention

```text
tenants/{tenant_id}/branches/{branch_id}/products/{product_id}/{uuid}.webp
```

### Env vars (example)

```bash
STORAGE_PROVIDER=minio
S3_ENDPOINT=http://minio:9000
S3_PUBLIC_BASE_URL=https://cdn.inovatitech.com.br/inova-gastro-360
S3_BUCKET=inova-gastro-360
S3_ACCESS_KEY=...
S3_SECRET_KEY=...
CATALOG_IMAGE_MAX_BYTES=5242880
```

## API Contracts (resumo)

Ver `contracts/catalog-admin.md` (a criar em `/speckit-tasks` ou Phase 1).

| Operação | Auth | Notas |
|----------|------|-------|
| GET categories (admin) | JWT | inclui `is_active=false` |
| POST/PATCH/DELETE category | JWT | valida branch ∈ user branches |
| POST/PATCH/DELETE product | JWT | preço > 0 centavos |
| POST image presign | JWT | retorna URL temporária |
| GET catalog (público) | — | sem mudança breaking |

## Testing Strategy

- `catalog-admin.test.ts`: validação Zod, 401 sem token, 403 cross-tenant
- `catalog-upload.test.ts`: rejeita MIME inválido, path contém tenant_id
- `storage/image-policy.test.ts`: path builder
- Web: `catalog-admin.test.ts` helpers de form (opcional)
- Smoke manual: admin upload → `/cardapio` anônimo mostra foto

## Deploy VPS (pós-implementação)

1. Criar bucket `inova-gastro-360` no MinIO
2. Policy leitura pública prefixo (ou proxy nginx)
3. Adicionar env S3_* em `infra/hetzner/.env.production`
4. `git pull` + rebuild api-gateway + web
5. Smoke: admin cria produto + foto → HTTPS cardápio

## Complexity Tracking

Nenhuma violação constitution justificada — storage S3 é o padrão mais simples compatível com R2 futuro.

## Referências

- [gap-analysis.md](./gap-analysis.md)
- [002-cardapio-online](../002-cardapio-online/spec.md)
- Constitution uploads: `.specify/memory/constitution.md`
- MinIO infra: tunnel ingress `s3` / `cdn` (VPS Inovati)
