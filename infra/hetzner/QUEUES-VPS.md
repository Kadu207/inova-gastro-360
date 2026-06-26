# Filas na VPS (alternativa a Cloudflare Queues — spec 011 fase 2)

Enquanto **Workers Paid** não estiver ativo:

| Mecanismo | Função |
|-----------|--------|
| **Outbox + `published_at`** | Durabilidade de eventos no Postgres |
| **`npm run outbox:flush`** / cron 1min | Replay quando messaging volta |
| **Forward síncrono** | messaging → realtime + integrations |
| **Redis pub/sub** | Realtime multi-instância na VPS (T023) |

## Ativar Cloudflare Queues (futuro)

1. Workers Paid na conta Inova TI
2. Restaurar bloco `queues` em `messaging-bus/wrangler.jsonc`
3. Redeploy — ver `infra/cloudflare/QUEUES-DEFERRED.md`

O handler `queue()` em messaging-bus já está preparado.
