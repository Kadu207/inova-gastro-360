-- Spec 007 — Pagamentos: payment_intents, payment_events, billing extensions, RLS

-- ============================================================
-- 1. Orders — status financeiro
-- ============================================================
ALTER TABLE "orders"
  ADD COLUMN IF NOT EXISTS "payment_status" TEXT NOT NULL DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS "payment_method" TEXT,
  ADD COLUMN IF NOT EXISTS "paid_at" TIMESTAMP(3);

-- ============================================================
-- 2. Subscription plans + subscriptions (Stripe)
-- ============================================================
ALTER TABLE "subscription_plans"
  ADD COLUMN IF NOT EXISTS "stripe_price_id" TEXT;

ALTER TABLE "subscriptions"
  ADD COLUMN IF NOT EXISTS "stripe_subscription_id" TEXT,
  ADD COLUMN IF NOT EXISTS "stripe_customer_id" TEXT,
  ADD COLUMN IF NOT EXISTS "grace_period_ends_at" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "subscriptions_stripe_subscription_id_key"
  ON "subscriptions"("stripe_subscription_id")
  WHERE "stripe_subscription_id" IS NOT NULL;

CREATE TABLE IF NOT EXISTS "subscription_checkouts" (
  "id"                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id"                  UUID NOT NULL,
  "plan_id"                    UUID NOT NULL,
  "stripe_checkout_session_id" TEXT NOT NULL UNIQUE,
  "stripe_customer_id"         TEXT,
  "status"                     TEXT NOT NULL DEFAULT 'open',
  "created_at"                 TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"                 TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "subscription_checkouts_plan_id_fkey"
    FOREIGN KEY ("plan_id") REFERENCES "subscription_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "subscription_checkouts_tenant_id_idx"
  ON "subscription_checkouts"("tenant_id");

-- ============================================================
-- 3. Payment intents + events
-- ============================================================
CREATE TABLE IF NOT EXISTS "payment_intents" (
  "id"                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id"           UUID NOT NULL,
  "branch_id"           UUID NOT NULL,
  "order_id"            UUID NOT NULL,
  "provider"            TEXT NOT NULL DEFAULT 'mercadopago',
  "method"              TEXT NOT NULL,
  "amount_cents"        INTEGER NOT NULL,
  "currency"            TEXT NOT NULL DEFAULT 'BRL',
  "status"              TEXT NOT NULL DEFAULT 'created',
  "external_id"         TEXT,
  "external_reference"  TEXT NOT NULL,
  "pix_qr_code"         TEXT,
  "pix_copy_paste"      TEXT,
  "expires_at"          TIMESTAMP(3),
  "metadata"            JSONB,
  "created_at"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "payment_intents_order_id_fkey"
    FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "payment_intents_tenant_id_order_id_idx"
  ON "payment_intents"("tenant_id", "order_id");
CREATE INDEX IF NOT EXISTS "payment_intents_external_id_idx"
  ON "payment_intents"("external_id");
CREATE INDEX IF NOT EXISTS "payment_intents_status_expires_at_idx"
  ON "payment_intents"("status", "expires_at");

CREATE UNIQUE INDEX IF NOT EXISTS "payment_intents_one_active_per_order_idx"
  ON "payment_intents"("order_id")
  WHERE "status" IN ('created', 'pending');

CREATE TABLE IF NOT EXISTS "payment_events" (
  "id"                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id"         UUID,
  "provider"          TEXT NOT NULL,
  "external_event_id" TEXT NOT NULL,
  "event_type"        TEXT NOT NULL,
  "payload"           JSONB NOT NULL,
  "processed_at"      TIMESTAMP(3),
  "result"            TEXT,
  "error_message"     TEXT,
  "created_at"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "payment_events_provider_external_event_id_key"
    UNIQUE ("provider", "external_event_id")
);

CREATE INDEX IF NOT EXISTS "payment_events_tenant_id_created_at_idx"
  ON "payment_events"("tenant_id", "created_at");

-- ============================================================
-- 4. RLS — novas tabelas multitenant
-- ============================================================
DO $$
DECLARE
  t text;
  tenant_tables text[] := ARRAY[
    'payment_intents', 'subscription_checkouts'
  ];
BEGIN
  FOREACH t IN ARRAY tenant_tables LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I;', t || '_tenant_isolation', t);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR ALL USING (tenant_id = app_current_tenant_id()) WITH CHECK (tenant_id = app_current_tenant_id());',
      t || '_tenant_isolation', t
    );
  END LOOP;

  -- payment_events: visível quando tenant_id bate ou ainda não resolvido (processamento interno)
  EXECUTE 'ALTER TABLE payment_events ENABLE ROW LEVEL SECURITY;';
  EXECUTE 'DROP POLICY IF EXISTS payment_events_tenant_isolation ON payment_events;';
  EXECUTE $policy$
    CREATE POLICY payment_events_tenant_isolation ON payment_events
    FOR ALL
    USING (
      tenant_id IS NULL
      OR tenant_id = app_current_tenant_id()
    )
    WITH CHECK (
      tenant_id IS NULL
      OR tenant_id = app_current_tenant_id()
    );
  $policy$;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON payment_intents TO inova_gastro_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON payment_events TO inova_gastro_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON subscription_checkouts TO inova_gastro_app;
