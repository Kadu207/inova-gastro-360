# Contract: Dashboard summary API (019)

## Endpoint

| Method | Path | Auth |
|--------|------|------|
| GET | `/api/v1/branches/:branchId/dashboard/summary` | Bearer JWT; roles com leitura operacional da filial (`admin_cliente`, `gerente`, e demais que já leem orders — espelhar `assertBranchOpsAccess` / padrão orders) |

## Query

| Param | Required | Notes |
|-------|----------|-------|
| _(none for MVP)_ | | Dia civil em **UTC** (`dayBasis: "utc"`). O campo `timezone` devolve o IANA da filial para display; agregação local fina = follow-up. |

## Response 200

```json
{
  "branchId": "uuid",
  "timezone": "UTC",
  "asOf": "2026-09-20T23:00:00.000Z",
  "kpis": {
    "salesCentsToday": 128000,
    "ordersToday": 12,
    "avgTicketCentsToday": 10666
  },
  "series": {
    "salesLast7Days": [
      { "date": "2026-09-14", "salesCents": 90000, "orders": 8 }
    ]
  }
}
```

### Regras

- `avgTicketCentsToday` = `ordersToday === 0 ? 0 : floor(salesCentsToday / ordersToday)`.
- Pedidos considerados: todos os não-cancelados do dia da filial (se status `cancelled` existir no enum, excluir; senão documentar inclusão).
- `series.salesLast7Days`: opcional no MVP; se omitido, UI não mostra chart de semana como “real”.

## Errors

| Status | When |
|--------|------|
| 400 | `branchId` ausente/inválido |
| 401 | sem JWT |
| 403 | branch fora do acesso do usuário / role insuficiente |
| 404 | branch inexistente no tenant |

## Non-goals

- Filtro de período customizado.
- Top produtos / mix pagamento (023).
- Novos clientes (022).
