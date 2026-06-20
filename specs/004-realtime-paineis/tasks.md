# Tasks: 004-realtime-paineis (retrospectivo)

## Entregue

- [x] T001 Durable Object BranchRealtimeHub (sqlite Free)
- [x] T002 WebSocket `/ws?branchId=` com broadcast interno
- [x] T003 Rota POST `/broadcast` no hub
- [x] T004 messaging-bus forward síncrono para REALTIME_SERVICE
- [x] T005 PainelPage — WebSocket + polling fallback
- [x] T006 Deploy prod `inovagastro360-rt.*` + GET `/` informativo

## Fase 2 (observabilidade + testes)

- [ ] T007 Teste integração broadcast → WS message (miniflare/DO)
- [ ] T008 Métrica latência evento→UI (<2s SLA)
- [ ] T009 Reconnect automático WebSocket com backoff
- [ ] T010 Presence/typing operadores (opcional)
