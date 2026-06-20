# Implementation Plan: 010-cloudflare-workers

**Date**: 2026-06-17 | **Spec**: [spec.md](./spec.md)

## Summary

Quatro Workers Cloudflare desacoplados via Service Bindings. API com Hyperdrive (Postgres VPS + SSL). Realtime com Durable Objects (`new_sqlite_classes` no Free). Messaging sem Queues (forward direto). Web como static assets Worker.

## Arquitetura (edge twist)

```text
Browser → inovagastro360 (web Worker)
       → inovagastro360-api (api-gateway + Hyperdrive)
       → outbox → MESSAGING_SERVICE (messaging-bus)
                        ├→ REALTIME_SERVICE (realtime-hub + DO)
                        └→ INTEGRATIONS_SERVICE
```

## Deploy order

`integrations` → `realtime-hub` → `messaging-bus` → `api-gateway` → `web`

## Referências

- `infra/cloudflare/DEPLOY.md`
- `infra/hetzner/PRODUCTION.md`
- `infra/cloudflare/QUEUES-DEFERRED.md`
