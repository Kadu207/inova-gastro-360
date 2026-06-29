# Tasks: 006-impressao-local (retrospectivo)

## Entregue (backend)

- [x] T001 Schema `print_jobs` + índices tenant/branch/order
- [x] T002 Insert print_job cozinha na criação do pedido
- [x] T003 Outbox evento `print.job_requested`
- [x] T004 Payload JSON com orderNumber + line items

## Pendente (print-agent)

- [x] T010 Scaffold `apps/print-agent` (Node poll + log)
- [x] T011 Poll GET print_jobs pending por branch + sector + PATCH printed
- [x] T012 Driver ESC/POS cozinha + balcão (TCP :9100 / device file)
- [x] T013 Driver A4 (comanda fiscal simplificada)
- [x] T014 PATCH status printed/failed + retry
- [x] T015 UI config impressoras por filial (reenfileirar jobs failed)
- [x] T016 Testes TDD fila + idempotência impressão
