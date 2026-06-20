# Implementation Plan: 008-chatwoot-n8n

**Date**: 2026-06-20 | **Spec**: [spec.md](./spec.md) | **Onda**: 3

## Summary

Worker `integrations` recebe eventos do messaging-bus e encaminha para webhooks configuráveis n8n e Chatwoot. Skeleton entregue; workflows n8n e inbox Chatwoot dependem de URLs de produção e automações.

## Technical Context

**Worker**: `apps/workers/integrations/src/index.ts`  
**Rotas**: `/internal/notify`, `/webhooks/n8n` (stub)  
**Env**: `N8N_WEBHOOK_URL`, `CHATWOOT_WEBHOOK_URL` (wrangler secrets)  
**Eventos**: todos os tipos repassados `{ type, payload }` do messaging-bus  
**Deploy**: interno (sem domínio público obrigatório)

## Arquitetura

```text
messaging-bus → INTEGRATIONS_SERVICE /internal/notify
  ├→ POST N8N_WEBHOOK_URL (workflow pedido/status)
  └→ POST CHATWOOT_WEBHOOK_URL (atualizar conversa)
```

## Constitution Check

| Princípio | Status |
|-----------|--------|
| Event-first | desacoplado via messaging-bus |
| Segurança | URLs webhook só em secrets |
| Simplicity | forward genérico; lógica nos workflows n8n |

## Referências

- `apps/workers/messaging-bus/src/index.ts` — forwardToIntegrations
- Documentação n8n + Chatwoot API
