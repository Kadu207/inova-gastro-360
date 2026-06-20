# Tasks: 011-messaging-bus (retrospectivo)

## Entregue

- [x] T001 Worker messaging-bus skeleton + health test
- [x] T002 Rota `/internal/publish` accept events
- [x] T003 Service Binding REALTIME_SERVICE forward
- [x] T004 Service Binding INTEGRATIONS_SERVICE forward
- [x] T005 api-gateway outbox INSERT + MESSAGING_SERVICE fetch
- [x] T006 Handler `queue()` preparado para ORDERS_QUEUE (Paid)
- [x] T007 Deploy prod worker messaging-bus
- [x] T008 Documentação Queues adiadas (QUEUES-DEFERRED.md)

## Fase 2 (Workers Paid)

- [ ] T010 Criar ORDERS_QUEUE + binding wrangler
- [ ] T011 Consumer assíncrono com retry exponential
- [ ] T012 Dead letter queue + alerta (DLQ spec US2)
- [ ] T013 Outbox poller cron (backup se publish falhar)
- [ ] T014 Testes integração queue → forward
