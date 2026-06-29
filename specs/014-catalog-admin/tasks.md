# Tasks: 014-catalog-admin

**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Gap**: [gap-analysis.md](./gap-analysis.md)

## Fase 1 — Fundação (bloqueia tudo)

- [x] T001 [P] Schemas Zod `CategoryInput`, `ProductInput`, `PresignInput` em `packages/validation`
- [x] T002 [P] Testes vitest validação + `image-policy` (MIME, path tenant-scoped)
- [x] T003 Factory S3 client (`STORAGE_PROVIDER`, MinIO/R2) em `api-gateway/src/lib/storage/`
- [x] T004 Documentar env S3 em `infra/hetzner/.env.production.example` + `infra/hetzner/docs/MINIO-CATALOG.md`

## Fase 2 — US1 Categorias (P1)

- [x] T005 Handlers `catalog-admin.ts`: GET/POST/PATCH/DELETE categories (JWT + tenant_id)
- [x] T006 Registrar rotas em `api-gateway/src/index.ts` + CORS headers upload
- [x] T007 [P] Testes vitest categories CRUD + cross-tenant 403
- [x] T008 UI `/dashboard/catalogo` — aba/lista categorias (criar, editar, ordenar, ativar/desativar)

**Teste independente**: admin cria categoria → aparece no GET público categories.

## Fase 3 — US2 Produtos (P1)

- [x] T009 Handlers produtos: GET admin, POST, PATCH, DELETE (preço > 0, categoryId válido)
- [x] T010 [P] Testes vitest products CRUD + cross-tenant
- [x] T011 UI produtos — lista + formulário (nome, descrição, preço, categoria, disponível)
- [x] T012 Preview produto com `CatalogProductThumb` no form admin

**Teste independente**: criar produto sem foto → visível em `/cardapio` com placeholder.

## Fase 4 — US3 Upload foto (P1)

- [x] T013 POST `.../products/:id/image/presign` + validação contentType/size
- [x] T014 PATCH product `imageUrl` + DELETE foto (null)
- [x] T015 [P] Testes presign rejeita MIME inválido; path contém tenant_id
- [x] T016 Componente `ImageUploader.tsx` (presign → PUT MinIO → PATCH)
- [x] T017 (fallback) POST multipart `.../image` se CORS MinIO bloquear presign browser

**Teste independente**: upload JPEG → foto no cardápio público em ≤1 min.

## Fase 5 — US4 Nav + vitrine (P2)

- [x] T018 Nav: item **Gestão cardápio** → `/dashboard/catalogo`; **Cardápio** link vitrine `/cardapio`
- [x] T019 `DashboardShell`: rota admin exige login; botão "Ver cardápio público"
- [x] T020 Hardening GET público catalog: incluir `tenant_id` via join branch (defense in depth)

**Teste independente**: gestão exige login; vitrine anônima OK.

## Fase 6 — Deploy + polish

- [x] T021 Criar bucket MinIO `inova-gastro-360` na VPS + policy leitura CDN (`setup-minio-catalog.sh`)
- [x] T022 Deploy VPS: env S3_* + rebuild api-gateway + web + smoke admin→público (`smoke-catalog-admin.sh`)
- [x] T023 (opcional) `audit_logs` em write produto/categoria
- [x] T024 Atualizar `memory-bank/progress.md` + marcar tasks entregues

## Fora do escopo (backlog)

- T025 Import CSV/ZIP (US5 P3)
- T026 T010 combos/modificadores (002)
- T027 Migração storage R2 produção (swap env only)

## Ordem de dependência

```text
T001–T004 → T005–T008 (categorias) → T009–T012 (produtos) → T013–T017 (foto) → T018–T020 (nav) → T021–T024 (deploy)
```

## Paralelo possível

- T001 + T003 + T004 em paralelo
- T007 após T005; T010 após T009
- T016 após T013
