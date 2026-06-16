-- Row-Level Security — Inova Gastro 360 Onda 1
-- Aplicar após migration Prisma; tenant context via SET LOCAL app.current_tenant_id

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_branch_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE outbox_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Bypass para migrations/seeds (role app)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'inova_gastro_app') THEN
    CREATE ROLE inova_gastro_app LOGIN PASSWORD 'inova_gastro_dev';
    GRANT ALL ON ALL TABLES IN SCHEMA public TO inova_gastro_app;
    GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO inova_gastro_app;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION app_current_tenant_id() RETURNS uuid AS $$
  SELECT NULLIF(current_setting('app.current_tenant_id', true), '')::uuid;
$$ LANGUAGE sql STABLE;

-- Tenants: só vê o próprio tenant
DROP POLICY IF EXISTS tenant_isolation ON tenants;
CREATE POLICY tenant_isolation ON tenants
  FOR ALL
  USING (id = app_current_tenant_id());

DROP POLICY IF EXISTS companies_tenant_isolation ON companies;
CREATE POLICY companies_tenant_isolation ON companies
  FOR ALL
  USING (tenant_id = app_current_tenant_id());

DROP POLICY IF EXISTS branches_tenant_isolation ON branches;
CREATE POLICY branches_tenant_isolation ON branches
  FOR ALL
  USING (tenant_id = app_current_tenant_id());

DROP POLICY IF EXISTS users_tenant_isolation ON users;
CREATE POLICY users_tenant_isolation ON users
  FOR ALL
  USING (tenant_id = app_current_tenant_id());

DROP POLICY IF EXISTS sessions_tenant_isolation ON sessions;
CREATE POLICY sessions_tenant_isolation ON sessions
  FOR ALL
  USING (
    user_id IN (SELECT id FROM users WHERE tenant_id = app_current_tenant_id())
  );

DROP POLICY IF EXISTS uba_tenant_isolation ON user_branch_access;
CREATE POLICY uba_tenant_isolation ON user_branch_access
  FOR ALL
  USING (tenant_id = app_current_tenant_id());

DROP POLICY IF EXISTS outbox_tenant_isolation ON outbox_events;
CREATE POLICY outbox_tenant_isolation ON outbox_events
  FOR ALL
  USING (tenant_id = app_current_tenant_id());

DROP POLICY IF EXISTS audit_tenant_isolation ON audit_logs;
CREATE POLICY audit_tenant_isolation ON audit_logs
  FOR ALL
  USING (tenant_id = app_current_tenant_id());

ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pc_tenant_isolation ON product_categories;
CREATE POLICY pc_tenant_isolation ON product_categories FOR ALL USING (tenant_id = app_current_tenant_id());

DROP POLICY IF EXISTS products_tenant_isolation ON products;
CREATE POLICY products_tenant_isolation ON products FOR ALL USING (tenant_id = app_current_tenant_id());

DROP POLICY IF EXISTS orders_tenant_isolation ON orders;
CREATE POLICY orders_tenant_isolation ON orders FOR ALL USING (tenant_id = app_current_tenant_id());

DROP POLICY IF EXISTS oi_tenant_isolation ON order_items;
CREATE POLICY oi_tenant_isolation ON order_items FOR ALL USING (tenant_id = app_current_tenant_id());

DROP POLICY IF EXISTS osh_tenant_isolation ON order_status_history;
CREATE POLICY osh_tenant_isolation ON order_status_history FOR ALL USING (tenant_id = app_current_tenant_id());

ALTER TABLE print_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS print_jobs_tenant_isolation ON print_jobs;
CREATE POLICY print_jobs_tenant_isolation ON print_jobs FOR ALL USING (tenant_id = app_current_tenant_id());
