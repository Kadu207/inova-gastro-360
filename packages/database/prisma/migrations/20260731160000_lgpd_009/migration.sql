-- Spec 009 — LGPD + política de privacidade
-- consent_records (preferências de cookies) + erasure_requests (direito ao esquecimento)

CREATE TABLE IF NOT EXISTS "consent_records" (
  "id"          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id"   UUID NOT NULL,
  "branch_id"   UUID,
  "user_id"     UUID,
  "subject_id"  TEXT NOT NULL,
  "essential"   BOOLEAN NOT NULL DEFAULT true,
  "analytics"   BOOLEAN NOT NULL DEFAULT false,
  "marketing"   BOOLEAN NOT NULL DEFAULT false,
  "ip_address"  TEXT,
  "user_agent"  TEXT,
  "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "consent_records_tenant_id_subject_id_idx"
  ON "consent_records"("tenant_id", "subject_id");
CREATE INDEX IF NOT EXISTS "consent_records_tenant_id_created_at_idx"
  ON "consent_records"("tenant_id", "created_at");

CREATE TABLE IF NOT EXISTS "erasure_requests" (
  "id"           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id"    UUID NOT NULL,
  "requested_by" UUID,
  "subject_id"   TEXT NOT NULL,
  "subject_type" TEXT NOT NULL DEFAULT 'user',
  "status"       TEXT NOT NULL DEFAULT 'pending',
  "reason"       TEXT,
  "resolved_at"  TIMESTAMP(3),
  "resolved_by"  UUID,
  "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "erasure_requests_tenant_id_status_idx"
  ON "erasure_requests"("tenant_id", "status");
CREATE INDEX IF NOT EXISTS "erasure_requests_tenant_id_subject_id_idx"
  ON "erasure_requests"("tenant_id", "subject_id");

-- ============================================================
-- RLS — isolamento por tenant. consent_records aceita leitura/escrita sem
-- contexto de tenant resolvido (ex.: intake público antes do lookup de branch)
-- da mesma forma que payment_events (spec 007).
-- ============================================================
DO $$
BEGIN
  EXECUTE 'ALTER TABLE consent_records ENABLE ROW LEVEL SECURITY;';
  EXECUTE 'DROP POLICY IF EXISTS consent_records_tenant_isolation ON consent_records;';
  EXECUTE $policy$
    CREATE POLICY consent_records_tenant_isolation ON consent_records
    FOR ALL
    USING (tenant_id = app_current_tenant_id())
    WITH CHECK (tenant_id = app_current_tenant_id());
  $policy$;

  EXECUTE 'ALTER TABLE erasure_requests ENABLE ROW LEVEL SECURITY;';
  EXECUTE 'DROP POLICY IF EXISTS erasure_requests_tenant_isolation ON erasure_requests;';
  EXECUTE $policy$
    CREATE POLICY erasure_requests_tenant_isolation ON erasure_requests
    FOR ALL
    USING (tenant_id = app_current_tenant_id())
    WITH CHECK (tenant_id = app_current_tenant_id());
  $policy$;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON consent_records TO inova_gastro_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON erasure_requests TO inova_gastro_app;
