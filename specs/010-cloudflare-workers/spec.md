# Feature Specification: 010-cloudflare-workers

**Status**: Deferred — **edge no go-live comercial** (runtime VPS: spec 013)  
**Product**: Inova Gastro 360  
**Decisão:** 2026-06-20 — Workers CF adiados por custo; código e deploy CF de 2026-06-17 permanecem referência

## User Story 1 - Workers desacoplados (P1) ✅ (código entregue)

api-gateway, messaging-bus, realtime-hub, integrations com health endpoints, Service Bindings e wrangler.jsonc.

**Referência (deploy CF histórico):**
- `inovagastro360-api.inovatitech.com.br`
- `inovagastro360-rt.inovatitech.com.br`
- messaging-bus + integrations via bindings

**Runtime atual/alvo:** VPS Hetzner — ver [spec 013](../013-vps-runtime/spec.md)

## User Story 2 - Deploy edge (P2) ⏸

DNS custom domain, Hyperdrive → VPS Postgres, JWT_SECRET, web estático via Worker assets.

**Reativar quando:** produto 100% pronto para vender em escala.

**Pendente fase 2:** Cloudflare Queues (Workers Paid) — ver `infra/cloudflare/QUEUES-DEFERRED.md`
