-- Spec 005 — Financeiro (caixa, ledger, contas, DRE)
CREATE TABLE IF NOT EXISTS cash_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  branch_id UUID NOT NULL,
  opened_by UUID,
  closed_by UUID,
  status TEXT NOT NULL DEFAULT 'open',
  opening_cents INT NOT NULL DEFAULT 0,
  closing_cents INT,
  opened_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  closed_at TIMESTAMP(3),
  notes TEXT,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS cash_sessions_tenant_branch_status_idx
  ON cash_sessions (tenant_id, branch_id, status);

CREATE TABLE IF NOT EXISTS ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  branch_id UUID NOT NULL,
  cash_session_id UUID REFERENCES cash_sessions(id) ON DELETE SET NULL,
  entry_type TEXT NOT NULL,
  amount_cents INT NOT NULL,
  description TEXT NOT NULL,
  reference_type TEXT,
  reference_id UUID,
  created_by UUID,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS ledger_entries_tenant_branch_created_idx
  ON ledger_entries (tenant_id, branch_id, created_at);
CREATE INDEX IF NOT EXISTS ledger_entries_cash_session_idx ON ledger_entries (cash_session_id);

CREATE TABLE IF NOT EXISTS payables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  branch_id UUID,
  description TEXT NOT NULL,
  amount_cents INT NOT NULL,
  due_date TIMESTAMP(3) NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  paid_at TIMESTAMP(3),
  supplier TEXT,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS payables_tenant_status_due_idx ON payables (tenant_id, status, due_date);

CREATE TABLE IF NOT EXISTS receivables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  branch_id UUID,
  description TEXT NOT NULL,
  amount_cents INT NOT NULL,
  due_date TIMESTAMP(3) NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  paid_at TIMESTAMP(3),
  customer TEXT,
  order_id UUID,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS receivables_tenant_status_due_idx ON receivables (tenant_id, status, due_date);
CREATE INDEX IF NOT EXISTS receivables_order_id_idx ON receivables (order_id);

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['cash_sessions','ledger_entries','payables','receivables']
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I;', t || '_tenant_isolation', t);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR ALL USING (tenant_id = app_current_tenant_id()) WITH CHECK (tenant_id = app_current_tenant_id());',
      t || '_tenant_isolation', t
    );
  END LOOP;
END $$;
