# Contexto ativo — Inova Gastro 360

**Última atualização:** 2026-06-29

## Feature ativa: spec 003-pedidos-core (refinamentos entregues)

Roadmap: **002 ✅** → **003 ✅ refinado** → **005 financeiro (Onda 4, adiado)**

### Entregue nesta sessão

**002 T009 — Imagens cardápio**
- Seed demo com `imageUrl` (Unsplash) + upsert atualiza imagens
- `CatalogProductThumb`: lazy load, shimmer, fallback inicial, validação http(s)
- Helpers `productDisplayImage`, `isValidProductImageUrl`

**003 Fase 3 — Painéis**
- API: `channel`, `q` (nome/telefone/nº pedido) em GET `/orders`
- `PainelPage`: busca debounced, filtros canal/status PT-BR, badges, telefone/data
- Defaults: balcão→`balcao`, cozinha→`preparing`, delivery→`delivery`+pending

### Produção VPS

Deploy: `git pull` → `db:seed` (imagens) → `build-web-vps.sh` → restart api-gateway

### Demo

`admin@inovagastro360.local` / `InovaGastro360!` / tenant `demo-burger`
