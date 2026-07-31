-- Spec 017: Asaas as official BR payment provider
ALTER TABLE subscription_plans
  ADD COLUMN IF NOT EXISTS asaas_plan_value_cents INT;

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS asaas_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS asaas_customer_id TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'subscriptions_asaas_subscription_id_key'
  ) THEN
    ALTER TABLE subscriptions
      ADD CONSTRAINT subscriptions_asaas_subscription_id_key UNIQUE (asaas_subscription_id);
  END IF;
END $$;

ALTER TABLE subscription_checkouts
  ADD COLUMN IF NOT EXISTS asaas_checkout_id TEXT;

ALTER TABLE subscription_checkouts
  ALTER COLUMN stripe_checkout_session_id DROP NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'subscription_checkouts_asaas_checkout_id_key'
  ) THEN
    ALTER TABLE subscription_checkouts
      ADD CONSTRAINT subscription_checkouts_asaas_checkout_id_key UNIQUE (asaas_checkout_id);
  END IF;
END $$;

ALTER TABLE payment_intents
  ALTER COLUMN provider SET DEFAULT 'asaas';
