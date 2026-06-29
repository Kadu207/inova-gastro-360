# Gap Analysis: 014-catalog-admin (70% vs 30%)

**Data**: 2026-06-29  
**Objetivo**: Verificar o que já existe no repositório vs o que falta para executar o MVP backoffice + storage.

## Resumo executivo

| Bloco | Pronto | Falta | % estimado |
|-------|--------|-------|------------|
| Modelo de dados + RLS | ✅ | — | ~15% |
| API catálogo **leitura** pública | ✅ | Filtro `tenant_id` explícito na query (hoje só `branch_id`) | ~10% |
| Vitrine pública + imagens T009 | ✅ | — | ~20% |
| Seed demo | ✅ | — | ~5% |
| Auth / multitenant base | ✅ | RBAC fino "pode editar catálogo" | ~10% |
| **API catálogo escrita (CRUD)** | ❌ | 100% | ~15% |
| **Upload + storage** | ❌ | 100% | ~15% |
| **UI admin `/dashboard/catalogo`** | ❌ | 100% | ~15% |
| Auditoria catálogo | ⚠️ | Tabela existe; wiring pendente | ~3% |
| Importação lote | ❌ | Fora MVP | — |

**Total implementado (vitrine + dados)**: ~**70%**  
**Total pendente (backoffice + storage)**: ~**30%** (+ melhorias de hardening)

---

## ✅ Já implementado (não refazer)

| Item | Local |
|------|--------|
| Schema `Product`, `ProductCategory` com `image_url` | `packages/database/prisma/schema.prisma` |
| RLS tenant isolation | `packages/database/prisma/sql/rls.sql` |
| GET categorias/produtos por branch | `apps/workers/api-gateway/src/routes/catalog.ts` |
| Rotas GET registradas | `apps/workers/api-gateway/src/index.ts` |
| Página pública `/cardapio` | `apps/web/src/app/(os)/cardapio/page.tsx` |
| Lazy load + fallback imagem | `CatalogProductThumb`, `cardapio.ts` |
| Seed demo com URLs | `packages/database/prisma/seed.ts` |
| Login JWT + branch demo | spec 001, seed |

---

## ❌ Pendente para MVP (executar na 014)

### 1. API — CRUD autenticado (~8 tarefas)

| Endpoint | Método | Status |
|----------|--------|--------|
| `/api/v1/branches/:branchId/catalog/categories` | GET (admin, incl. inativas) | ❌ |
| `/api/v1/branches/:branchId/catalog/categories` | POST | ❌ |
| `/api/v1/branches/:branchId/catalog/categories/:id` | PATCH, DELETE | ❌ |
| `/api/v1/branches/:branchId/catalog/products` | GET (admin) | ❌ |
| `/api/v1/branches/:branchId/catalog/products` | POST | ❌ |
| `/api/v1/branches/:branchId/catalog/products/:id` | PATCH, DELETE | ❌ |
| Validação Zod + `tenant_id` em todas writes | — | ❌ |
| Testes vitest cross-tenant | — | ❌ |

### 2. Storage + upload (~6 tarefas)

| Item | Status |
|------|--------|
| Variáveis env (`S3_ENDPOINT`, bucket, keys) | ❌ |
| Cliente S3-compatible (MinIO VPS) | ❌ |
| POST presign upload OU multipart via API | ❌ |
| Path `tenants/{tid}/branches/{bid}/products/{pid}/...` | ❌ |
| Validação MIME + tamanho (constitution) | ❌ |
| URL pública via `cdn.inovatitech.com.br` ou proxy nginx | ❌ |
| (Opcional MVP+) resize/WebP server-side | ❌ adiar |

**Infra existente na VPS Inovati**: MinIO (`s3` / `cdn` hostnames no tunnel cloudflared) — reutilizar bucket dedicado `inova-gastro-360` ou prefixo.

### 3. Web admin (~7 tarefas)

| Item | Status |
|------|--------|
| Rota `/dashboard/catalogo` | ❌ |
| Nav: "Gestão cardápio" vs link vitrine | ❌ |
| Lista/CRUD categorias | ❌ |
| Lista/CRUD produtos + form | ❌ |
| Upload foto (presign → PUT → PATCH product) | ❌ |
| Preview `CatalogProductThumb` | ❌ |
| Testes vitest helpers/forms | ❌ |

### 4. Hardening recomendado (paralelo)

- Incluir `tenant_id` nas queries GET públicas de catálogo (defense in depth).
- CORS: permitir headers de upload se presign direto ao MinIO.
- Rate limit POST upload (constitution).
- `audit_logs` em create/update/delete produto.

---

## Fora do MVP (registrado)

- Import CSV/ZIP (User Story P3)
- T010 combos/modificadores
- Cloudflare R2 produção (swap via env, mesma interface S3)
- Galeria multi-imagem

---

## Ordem de execução sugerida (tasks.md)

1. **T001** Contratos Zod + testes CRUD categories/products (sem storage)  
2. **T002** Handlers API + rotas index + cross-tenant tests  
3. **T003** Módulo storage MinIO + presign + env example  
4. **T004** Endpoint associar/remover foto produto  
5. **T005** Página `/dashboard/catalogo` — categorias  
6. **T006** Página produtos + upload UI  
7. **T007** Nav + link vitrine pública  
8. **T008** Deploy VPS: bucket MinIO + env + smoke admin→público  
9. **T009** Documentar migração R2 em plan.md / infra  

**Estimativa MVP**: 1–2 sprints (SDD + TDD conforme constitution).
