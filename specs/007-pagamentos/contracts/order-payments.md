# API Contract: Pagamentos de Pedido (007)

**Base**: `/api/v1/branches/{branchId}/orders`  
**Auth pedido guest**: token público do pedido ou sessão checkout (spec 003)  
**Auth operador**: JWT com membership na filial

---

## POST `/{orderId}/pay`

Inicia cobrança PIX (P1) ou cartão (P2).

**Body**:

```json
{
  "method": "pix"
}
```

**Response `201`**:

```json
{
  "paymentIntentId": "uuid",
  "method": "pix",
  "status": "pending",
  "amountCents": 4590,
  "expiresAt": "2026-07-03T15:30:00.000Z",
  "pix": {
    "qrCodeBase64": "iVBOR...",
    "copyPaste": "00020126..."
  }
}
```

**Errors**:
- `400` — pedido já pago ou total inválido
- `404` — pedido não encontrado (RLS)
- `409` — cobrança PIX pendente ainda válida (retorna intent existente)
- `502` — provedor indisponível

---

## GET `/{orderId}/payment`

Consulta status (polling leve no cardápio).

**Response `200`**:

```json
{
  "paymentStatus": "pending",
  "method": "pix",
  "paidAt": null,
  "expiresAt": "2026-07-03T15:30:00.000Z"
}
```

---

## GET `/{orderId}` (extensão)

Incluir `paymentStatus`, `paymentMethod`, `paidAt` no objeto order para painéis.

---

## Eventos outbox

| Tipo | Payload mínimo |
|------|----------------|
| `order.payment_confirmed` | `orderId`, `tenantId`, `branchId`, `amountCents`, `method`, `paymentIntentId` |
| `order.payment_expired` | `orderId`, `tenantId`, `paymentIntentId` |
