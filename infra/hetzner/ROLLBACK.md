# Rollback — spec 013 T042

Se a VPS apresentar falha crítica após cutover:

## 1. DNS (rápido)

No Cloudflare, repontar registros para Workers históricos:

| Host | Destino rollback |
|------|------------------|
| `inovagastro360.inovatitech.com.br` | Worker web (spec 010) |
| `inovagastro360-api.inovatitech.com.br` | Worker api-gateway |
| `inovagastro360-rt.inovatitech.com.br` | Worker realtime-hub |

## 2. Redeploy Workers

```bash
npm run deploy:workers
npm run deploy:web
```

## 3. Dados

Postgres na VPS permanece fonte se migração já ocorreu. Hyperdrive (CF) deve apontar para o mesmo Postgres VPS.

## 4. Comunicação

- Pedidos no período VPS-only permanecem no banco VPS
- Print-agent LAN continua com `PRINT_AGENT_API_BASE` da URL ativa

## Quando reativar VPS

Após corrigir causa raiz: repetir `CUTOVER.md` e `npm run smoke:health`.
