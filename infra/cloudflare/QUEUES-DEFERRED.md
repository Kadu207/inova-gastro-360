# Cloudflare Queues — adiado (plano Free)

**Decisão:** adiar filas até ativar **Workers Paid** na conta Inova TI.

## Por que adiar?

| Recurso | Plano Free | Workers Paid (~US$ 5/mês) |
|---------|------------|---------------------------|
| Workers + Service Bindings | ✅ (com limites) | ✅ |
| Durable Objects (realtime-hub) | ✅ (com limites) | ✅ |
| **Cloudflare Queues** | ❌ | ✅ |

Não é possível “ativar Queues no Free”. É necessário **upgrade** em:

https://dash.cloudflare.com/0252c61a2109e807b883c4d466617ebb/workers/plans

## Alternativa gratuita atual (MVP)

O `messaging-bus` em `/internal/publish` **já faz**:

1. (Opcional) `ORDERS_QUEUE.send` — removido do `wrangler.jsonc` por enquanto  
2. **Sempre** encaminha para `realtime-hub` e `integrations` via Service Binding

Ou seja: pedidos e outbox continuam funcionando **sem fila**, com entrega **síncrona** worker→worker.

### O que você perde sem filas (aceitável no MVP)

- Retry automático assíncrono  
- Dead Letter Queue (DLQ)  
- Desacoplamento sob pico de tráfego  

### O que mantém

- Outbox no Postgres (api-gateway)  
- Realtime nos painéis  
- Notificações integrations  
- Deploy no plano Free  

## Quando reativar filas

1. Ativar Workers Paid na conta oficial Inova TI  
2. Criar filas no dashboard ou `npm run provision:cloudflare`  
3. Restaurar bloco `queues` em `apps/workers/messaging-bus/wrangler.jsonc`  
4. Redeploy `messaging-bus`

## Conta oficial

- Account ID: `0252c61a2109e807b883c4d466617ebb`  
- Domínio: `inovatitech.com.br`
