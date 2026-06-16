# Feature Specification: 011-messaging-bus

**Status**: Approved (Onda 0 skeleton)  
**Product**: Inova Gastro 360

## User Story 1 - Outbox + Queue (P1)

API grava outbox_events; messaging-bus consome e roteia sem dependência circular.

## User Story 2 - DLQ (P1)

Falhas após max_retries vão para dead letter queue com alerta.
