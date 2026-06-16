# Padrões do sistema — Inova Gastro 360

## Multitenancy
```
tenant_id → company_id → branch_id
```
Contexto ativo na sessão do usuário. Middleware valida em toda request API.

## Eventos de domínio
```
order.created
order.status_changed
order.payment_confirmed
print.job_requested
```
Formato: `packages/contracts/src/events/`

## Workers
| Worker | Responsabilidade |
|--------|------------------|
| api-gateway | REST, auth, validação, gravação transacional |
| messaging-bus | Filas, retry, DLQ, roteamento |
| realtime-hub | Durable Objects, painéis KDS/delivery |
| integrations | Chatwoot, n8n, webhooks pagamento |

## Layout responsivo
Usar `min-height: 100vh; min-height: 100dvh` em shells principais.

## Testes
- Unit: Vitest em `packages/` e Workers
- Integration: API + DB com tenant isolation
- E2E: Playwright em fluxos críticos
