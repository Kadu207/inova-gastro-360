-- Spec 015 — Billing foundation + Row-Level Security em runtime
-- Aplicada via `prisma migrate deploy`.

-- ============================================================
-- 1. Billing: planos (global) e assinaturas (por tenant)
-- ============================================================
CREATE TABLE "subscription_plans" (
  "id"           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "code"         TEXT NOT NULL UNIQUE,
  "name"         TEXT NOT NULL,
  "price_cents"  INTEGER NOT NULL DEFAULT 0,
  "interval"     TEXT NOT NULL DEFAULT 'month',
  "max_branches" INTEGER NOT NULL DEFAULT 1,
  "max_products" INTEGER NOT NULL DEFAULT 50,
  "is_active"    BOOLEAN NOT NULL DEFAULT true,
  "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "subscriptions" (
  "id"                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id"          UUID NOT NULL,
  "plan_id"            UUID,
  "status"             TEXT NOT NULL DEFAULT 'trialing',
  "trial_ends_at"      TIMESTAMP(3),
  "current_period_end" TIMESTAMP(3),
  "created_at"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id")
    REFERENCES "subscription_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "subscriptions_tenant_id_idx" ON "subscriptions"("tenant_id");

INSERT INTO "subscription_plans" ("code", "name", "price_cents", "interval", "max_branches", "max_products")
VALUES
  ('starter', 'Starter', 0, 'month', 1, 50),
  ('pro', 'Pro', 14900, 'month', 3, 500),
  ('enterprise', 'Enterprise', 49900, 'month', 50, 5000)
ON CONFLICT ("code") DO NOTHING;

-- ============================================================
-- 2. Role de aplicação (sem senha no repositório)
--    A senha é definida operacionalmente: ALTER ROLE ... LOGIN PASSWORD '...'
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'inova_gastro_app') THEN
    CREATE ROLE inova_gastro_app NOLOGIN;
  END IF;
END $$;

GRANT USAGE ON SCHEMA public TO inova_gastro_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO inova_gastro_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO inova_gastro_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO inova_gastro_app;

-- ============================================================
-- 3. Função de contexto de tenant
-- ============================================================
CREATE OR REPLACE FUNCTION app_current_tenant_id() RETURNS uuid AS $$
  SELECT NULLIF(current_setting('app.current_tenant_id', true), '')::uuid;
$$ LANGUAGE sql STABLE;

-- ============================================================
-- 4. RLS por tenant. O owner das tabelas (usado por migrations/seed)
--    NÃO sofre RLS por padrão; a role inova_gastro_app sofre — é ela
--    que a API deve usar em produção para isolamento defense-in-depth.
-- ============================================================
DO $$
DECLARE
  t text;
  tenant_tables text[] := ARRAY[
    'companies','branches','users','user_branch_access','outbox_events',
    'audit_logs','product_categories','products','orders','order_items',
    'order_status_history','print_jobs','subscriptions'
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

  -- tenants: isolamento pela própria PK
  EXECUTE 'ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;';
  EXECUTE 'DROP POLICY IF EXISTS tenants_tenant_isolation ON tenants;';
  EXECUTE 'CREATE POLICY tenants_tenant_isolation ON tenants FOR ALL USING (id = app_current_tenant_id()) WITH CHECK (id = app_current_tenant_id());';

  -- sessions: via usuário do tenant
  EXECUTE 'ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;';
  EXECUTE 'DROP POLICY IF EXISTS sessions_tenant_isolation ON sessions;';
  EXECUTE 'CREATE POLICY sessions_tenant_isolation ON sessions FOR ALL USING (user_id IN (SELECT id FROM users WHERE tenant_id = app_current_tenant_id()));';
END $$;
