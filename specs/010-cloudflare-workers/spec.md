# Feature Specification: 010-cloudflare-workers

**Status**: Delivered (produção 2026-06-17, plano Free)  
**Product**: Inova Gastro 360

## User Story 1 - Workers desacoplados (P1) ✅

api-gateway, messaging-bus, realtime-hub, integrations com health endpoints, Service Bindings e wrangler.jsonc.

**Produção:**
- `inovagastro360-api.inovatitech.com.br`
- `inovagastro360-rt.inovatitech.com.br`
- messaging-bus + integrations via bindings (sem URL pública)

## User Story 2 - Deploy edge (P2) ✅

DNS custom domain, Hyperdrive → VPS Postgres, JWT_SECRET, web estático via Worker assets.

**Pendente fase 2:** Cloudflare Queues (Workers Paid) — ver `infra/cloudflare/QUEUES-DEFERRED.md`
