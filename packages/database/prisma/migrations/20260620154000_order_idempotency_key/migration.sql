-- Idempotência checkout: retry cliente não duplica pedido (spec 003 T011)
ALTER TABLE "orders" ADD COLUMN "idempotency_key" TEXT;

CREATE UNIQUE INDEX "orders_tenant_id_idempotency_key_key"
  ON "orders"("tenant_id", "idempotency_key")
  WHERE "idempotency_key" IS NOT NULL;
