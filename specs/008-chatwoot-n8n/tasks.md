# Tasks: 008-chatwoot-n8n (retrospectivo)

## Entregue (skeleton)

- [x] T001 Worker integrations + health test
- [x] T002 Rota `/internal/notify` — forward paralelo n8n + Chatwoot
- [x] T003 messaging-bus encaminha todos os eventos
- [x] T004 Stub `/webhooks/n8n` POST received
- [x] T005 Env vars documentadas (secrets wrangler)

## Pendente (integração real)

- [ ] T010 Workflow n8n: order.created → notificação WhatsApp/SMS
- [ ] T011 Workflow n8n: order.status_changed → mensagem cliente
- [ ] T012 Chatwoot: criar/atualizar conversa por telefone cliente
- [ ] T013 Configurar secrets prod N8N + Chatwoot URLs
- [ ] T014 Retry + dead letter para webhooks falhos
- [ ] T015 Testes mock fetch webhook
