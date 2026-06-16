# Arquitetura — Inova Gastro 360

**Versão:** 0.1.0 (Onda 0)  
**Data:** 2026-06-14

## Visão macro

```text
Usuários (web, painéis, KDS)
        ↓
Cloudflare (DNS, Proxy, WAF, Turnstile)
        ↓
┌───────────────────────────────────────────────────────┐
│  Next.js (apps/web)          Workers Edge              │
│  - Site público              - api-gateway (8788)      │
│  - Painéis admin             - messaging-bus (8789)  │
│                              - realtime-hub (8790)    │
│                              - integrations (8791)    │
└───────────────────────────────────────────────────────┘
        ↓ Service Bindings + Queues
Hyperdrive → PostgreSQL (VPS Hetzner :5440)
Redis (:6390) / Cloudflare Queues
n8n, Chatwoot, Print Agent (VPS/local)
```

## Workers

| Worker | Porta dev | Função |
|--------|-----------|--------|
| api-gateway | 8788 | REST, auth, RBAC, outbox publish |
| messaging-bus | 8789 | Consume/produce filas, DLQ |
| realtime-hub | 8790 | Durable Objects, SSE/WebSocket |
| integrations | 8791 | Chatwoot, n8n, webhooks |

## Mensageria desacoplada

```text
API grava transação + outbox
  → messaging-bus consome
  → roteia para: realtime-hub | integrations | print queue
```

Sem dependência circular: API nunca chama HTTP público de outro Worker.

## Specs (SDD)

| Spec | Módulo |
|------|--------|
| 000-foundation | Monorepo, CI, portas |
| 001-auth-multitenant | Auth, tenant, RLS |
| 002-cardapio-online | Produtos, carrinho |
| 003-pedidos-core | Pedidos, status |
| 004-realtime-paineis | KDS, delivery live |
| 005-financeiro | Caixa, contas |
| 006-impressao-local | Print agent |
| 007-pagamentos | Gateway, webhooks |
| 008-chatwoot-n8n | Integrações |
| 009-lgpd-cookies | Privacidade |
| 010-cloudflare-workers | Edge deploy |
| 011-messaging-bus | Filas, eventos |

## Agentes embarcados (runtime)

EMB-01 Order State Guardian … EMB-15 Dead Letter Recovery — implementação Onda 3+.
