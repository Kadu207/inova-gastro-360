# Tasks: 006-impressao-local (retrospectivo)

## Entregue (backend)

- [x] T001 Schema `print_jobs` + índices tenant/branch/order
- [x] T002 Insert print_job cozinha na criação do pedido
- [x] T003 Outbox evento `print.job_requested`
- [x] T004 Payload JSON com orderNumber + line items

## Pendente (print-agent)

- [ ] T010 Scaffold `apps/print-agent` (Node/Electron ou serviço systemd)
- [ ] T011 Poll GET print_jobs pending por branch + sector
- [ ] T012 Driver ESC/POS cozinha + balcão
- [ ] T013 Driver A4 (comanda fiscal simplificada)
- [ ] T014 PATCH status printed/failed + retry
- [ ] T015 UI config impressoras por filial
- [ ] T016 Testes TDD fila + idempotência impressão
