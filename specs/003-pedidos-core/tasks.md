# Tasks: 003-pedidos-core (retrospectivo)

## Entregue

- [x] T001 Schema Prisma orders + items + status_history
- [x] T002 POST `/api/v1/orders` — validação Zod + total
- [x] T003 GET `/api/v1/orders` listagem por branch/status
- [x] T004 GET/PATCH `/api/v1/orders/:id` e `/status`
- [x] T005 Histórico de status em cada transição
- [x] T006 Outbox `order.created` + `order.status_changed`
- [x] T007 Painéis balcão/cozinha/delivery (`PainelPage`)
- [x] T008 E2E Docker validado (2026-06-15)

## Fase 2 (TDD + hardening)

- [x] T009 [P] Testes vitest create/list/update status em `api-gateway`
- [x] T010 Teste cross-tenant — tenant A não lê pedidos tenant B
- [x] T011 Idempotência checkout (client retry)
## Fase 3 (refinamentos painéis)

- [x] T013 Filtro por canal (`channel`) na API + UI
- [x] T014 Busca por nº pedido, nome ou telefone (`q`)
- [x] T015 Labels PT-BR, badges, defaults por painel (balcão/cozinha/delivery)
